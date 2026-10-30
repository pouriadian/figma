"""Private staff API powering Faromid's /panel Next.js console.

No write operation depends on Django Admin or Django Unfold. Permissions are
rechecked by Django for every request; Next.js only holds httpOnly JWT cookies.
"""
from datetime import timedelta, datetime, time
from collections import defaultdict
from hashlib import sha256
import json

from django.contrib.auth.models import Group
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import FileResponse
from django.utils import timezone
from rest_framework import routers, serializers, status, viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Representative, StaffTeam, User
from partners.models import RepresentativeProfile
from analytics.models import TrafficEvent
from catalog.models import Product, ProductCategory, ProductImage, Texture
from communications.models import Announcement, Delivery
from content.models import (
    ContentEntry, MediaAsset, PageSEO, SitePage, SiteSection, SiteSectionImage,
)
from crm.models import Inquiry, InquiryStatusHistory, JobApplication


MODULES = {
    'dashboard': None,
    'pages': 'content.view_sitepage',
    'media': 'content.view_mediaasset',
    'products': 'catalog.view_product',
    'textures': 'catalog.view_texture',
    'categories': 'catalog.view_productcategory',
    'representatives': 'accounts.view_representative',
    'inquiries': 'crm.view_inquiry',
    'applications': 'crm.view_jobapplication',
    'content': 'content.view_contententry',
    'announcements': 'communications.view_announcement',
    'deliveries': 'communications.view_delivery',
    'users': 'accounts.view_user',
    'reports': 'analytics.view_trafficevent',
    'sms': 'sms_campaigns.view_sms_results',
}


class IsStaff(permissions.BasePermission):
    message = 'این قسمت فقط برای کارکنان دارای مجوز مدیریت است.'

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_active and request.user.is_staff)


class AdminMeView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.pk, 'name': user.get_full_name() or user.username or user.email,
            'email': user.email, 'role': user.role,
            'is_superuser': user.is_superuser,
            'modules': {key: bool(perm is None or user.has_perm(perm)) for key, perm in MODULES.items()},
            'actions': {
                'cms_edit': user.has_perm('content.edit_site_pages'),
                'products_edit': user.has_perm('catalog.change_product'),
                'products_add': user.has_perm('catalog.add_product'),
                'products_delete': user.has_perm('catalog.delete_product'),
                'category_add': user.has_perm('catalog.add_productcategory'),
                'media_add': user.has_perm('content.add_mediaasset'),
                'media_delete': user.has_perm('content.delete_mediaasset'),
                'users_add': user.has_perm('accounts.add_user'),
                'users_manage': user.has_perm('accounts.change_user'),
                'sms_manage': user.has_perm('sms_campaigns.manage_sms_campaigns') or user.groups.filter(name__in=['sms_campaign_managers','sms_campaign_administrators']).exists(),
                'sms_approve': user.has_perm('sms_campaigns.approve_sms_campaign') or user.groups.filter(name='sms_campaign_administrators').exists(),
                'sms_send': user.has_perm('sms_campaigns.send_sms_campaign') or user.groups.filter(name__in=['sms_campaign_managers','sms_campaign_administrators']).exists(),
                'sales_import_approve': user.has_perm('sms_campaigns.approve_sales_import') or user.groups.filter(name='sms_campaign_administrators').exists(),
                'reward_approve': user.has_perm('sms_campaigns.approve_sms_reward') or user.groups.filter(name='sms_campaign_administrators').exists(),
                'reward_activate': user.has_perm('sms_campaigns.activate_sms_reward') or user.groups.filter(name='sms_campaign_administrators').exists(),
            },
        })


class StaffViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaff]
    http_method_names = ['get', 'post', 'patch', 'put', 'delete', 'head', 'options']
    permission_prefix = None
    filter_backends = [filters.SearchFilter]
    search_fields = ['id']

    def _check_permission(self, request):
        if not self.permission_prefix:
            raise PermissionDenied('Permission configuration missing')
        operation = 'view'
        if request.method == 'POST': operation = 'add'
        if request.method in ('PATCH', 'PUT'): operation = 'change'
        if request.method == 'DELETE': operation = 'delete'
        if not request.user.has_perm(f'{self.permission_prefix}.{operation}_{self.model_name}'):
            raise PermissionDenied('مجوز دسترسی به این قسمت را ندارید.')

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self._check_permission(request)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug', 'order']


class CategoryViewSet(StaffViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = CategorySerializer
    permission_prefix, model_name = 'catalog', 'productcategory'
    search_fields = ['name', 'slug']


class ProductSerializer(serializers.ModelSerializer):
    image = serializers.CharField(source='image_url', read_only=True)
    catalog_url = serializers.CharField(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    cover_image = serializers.ImageField(required=False, allow_null=True)
    catalog_pdf = serializers.FileField(required=False, allow_null=True)
    images = serializers.SerializerMethodField()
    textures = serializers.PrimaryKeyRelatedField(many=True, queryset=Texture.objects.all(), required=False)
    # Keep the existing JSON name for the admin frontend, but use actual accepted
    # analytics events rather than the legacy per-GET Product.view_count counter.
    view_count = serializers.IntegerField(source='recorded_views', read_only=True)

    def to_internal_value(self, data):
        # Product forms upload images as multipart data and encode the selected
        # Many-to-Many texture IDs as JSON so an empty selection can clear links.
        raw_textures = data.get('textures') if hasattr(data, 'get') else None
        clear_textures = False
        if isinstance(raw_textures, str):
            try:
                parsed_textures = json.loads(raw_textures)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError({'textures': 'فهرست بافت‌ها معتبر نیست.'}) from exc
            if not isinstance(parsed_textures, list):
                raise serializers.ValidationError({'textures': 'فهرست بافت‌ها باید آرایه باشد.'})
            data = data.copy()
            if parsed_textures:
                if hasattr(data, 'setlist'):
                    data.setlist('textures', [str(value) for value in parsed_textures])
                else:
                    data['textures'] = parsed_textures
            else:
                data.pop('textures', None)
                clear_textures = True
        validated = super().to_internal_value(data)
        if clear_textures:
            validated['textures'] = []
        return validated

    def get_images(self, obj):
        return [{'id': image.id, 'caption': image.caption,
                 'url': '/uploads/' + image.image.name.removeprefix('public/')}
                for image in obj.images.all()]

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'sku', 'model', 'category', 'category_name',
                  'dimensions', 'description', 'technical_specs', 'cover_asset',
                  'cover_image', 'image', 'catalog_pdf', 'catalog_url', 'status',
                  'featured', 'sort_order', 'view_count', 'published_at',
                  'seo_title', 'seo_description', 'canonical_url', 'images', 'created_at', 'textures']
        read_only_fields = ['id', 'view_count', 'published_at', 'created_at']

    def validate(self, attrs):
        result = super().validate(attrs)
        status_value = attrs.get('status', getattr(self.instance, 'status', 'draft'))
        cover_path = attrs.get('cover_asset', getattr(self.instance, 'cover_asset', ''))
        cover_file = attrs.get('cover_image', getattr(self.instance, 'cover_image', None))
        if status_value == 'published' and not (cover_path or cover_file):
            raise serializers.ValidationError({'cover_image': 'برای انتشار محصول یک تصویر لازم است.'})
        if cover_path and (not cover_path.startswith('/assets/') or '..' in cover_path):
            raise serializers.ValidationError({'cover_asset': 'مسیر باید از فایل‌های اصلی /assets/ باشد.'})
        return result


class ProductViewSet(StaffViewSet):
    queryset = (Product.objects.select_related('category').prefetch_related('images')
                .annotate(recorded_views=Count('trafficevent', filter=Q(trafficevent__kind='product_view'))))
    serializer_class = ProductSerializer
    permission_prefix, model_name = 'catalog', 'product'
    search_fields = ['name', 'slug', 'sku', 'model']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get('ordering') == '-view_count':
            queryset = queryset.order_by('-recorded_views', 'name')
        category_id = self.request.query_params.get('category', '').strip()
        if not category_id:
            return queryset
        if not category_id.isdigit():
            raise ValidationError({'category': 'شناسه دسته‌بندی نامعتبر است.'})
        return queryset.filter(category_id=int(category_id))

    def perform_update(self, serializer):
        # When explicitly choosing a different original site asset, stop
        # preferring an older uploaded cover. Do not delete any media bytes.
        before_asset = serializer.instance.cover_asset
        changed_asset = serializer.validated_data.get('cover_asset')
        has_new_upload = bool(serializer.validated_data.get('cover_image'))
        obj = serializer.save()
        if changed_asset and changed_asset != before_asset and not has_new_upload and obj.cover_image:
            obj.cover_image = ''
            obj.save(update_fields=['cover_image', 'updated_at'])


class TextureSerializer(serializers.ModelSerializer):
    image_url = serializers.CharField(read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)
    products = serializers.PrimaryKeyRelatedField(many=True, queryset=Product.objects.all(), required=False)
    class Meta:
        model = Texture
        fields = ['id','name','slug','code','category','description','technical_specs','image','image_url','products','is_published','seo_title','seo_description','canonical_url','created_at']
        read_only_fields = ['id','image_url','created_at']


class TextureViewSet(StaffViewSet):
    queryset = Texture.objects.prefetch_related('products').all()
    serializer_class = TextureSerializer
    permission_prefix, model_name = 'catalog', 'texture'
    search_fields = ['name','slug','code','category']


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'product', 'image', 'url', 'caption', 'sort_order']

    def get_url(self, item):
        return '/uploads/' + item.image.name.removeprefix('public/')


class ProductImageViewSet(StaffViewSet):
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer
    permission_prefix, model_name = 'catalog', 'product'

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(product_id=self.request.query_params['product']) if self.request.query_params.get('product') else qs


class RepresentativeSerializer(serializers.ModelSerializer):
    is_public = serializers.BooleanField(required=False)
    last_month_sales = serializers.DecimalField(max_digits=15, decimal_places=0, required=False, allow_null=True)
    performance_score = serializers.IntegerField(min_value=0, max_value=100, required=False, allow_null=True)
    sms_consent = serializers.BooleanField(required=False)

    class Meta:
        model = Representative
        fields = ['id', 'code', 'company_name', 'contact_name', 'phone', 'email',
                  'province', 'city', 'address', 'latitude', 'longitude', 'status',
                  'contract_started_at', 'internal_notes', 'user', 'created_at',
                  'is_public', 'last_month_sales', 'performance_score', 'sms_consent']
        read_only_fields = ['id', 'code', 'created_at']
        extra_kwargs = {'province': {'required': False, 'allow_blank': True},
                        'city': {'required': False, 'allow_blank': True},
                        'contact_name': {'required': False, 'allow_blank': True}}

    def _profile_data(self, attrs):
        return {key: attrs.pop(key) for key in (
            'is_public', 'last_month_sales', 'performance_score', 'sms_consent'
        ) if key in attrs}

    def validate(self, attrs):
        status_value = attrs.get('status', getattr(self.instance, 'status', Representative.Status.PENDING))
        requested_public = attrs.get('is_public')
        if requested_public is True and status_value != Representative.Status.ACTIVE:
            # An existing approved representative can be suspended in one edit;
            # unpublish automatically rather than blocking the status change.
            old_status = getattr(self.instance, 'status', None)
            if self.instance is not None and old_status != status_value:
                attrs['is_public'] = False
            else:
                raise ValidationError({'is_public': 'ابتدا وضعیت همکاری را فعال کنید تا نماینده عمومی شود.'})
        public = attrs.get('is_public')
        if public is None and self.instance is not None:
            public = RepresentativeProfile.objects.filter(representative_id=self.instance.pk, is_public=True).exists()
        if public and not attrs.get('company_name', getattr(self.instance, 'company_name', '')):
            raise ValidationError({'company_name': 'نام نماینده برای انتشار عمومی لازم است.'})
        return attrs

    def _save_profile(self, obj, fields):
        if not fields:
            return
        profile, _ = RepresentativeProfile.objects.get_or_create(representative_id=obj.pk)
        from django.utils import timezone
        before_consent = profile.sms_consent
        for key, value in fields.items():
            setattr(profile, key, value)
        if 'sms_consent' in fields and before_consent != profile.sms_consent:
            profile.sms_consent_at = timezone.now() if profile.sms_consent else None
        if obj.status != Representative.Status.ACTIVE:
            profile.is_public = False
        profile.full_clean()
        profile.save()

    @transaction.atomic
    def create(self, validated_data):
        fields = self._profile_data(validated_data)
        obj = super().create(validated_data)
        self._save_profile(obj, fields)
        return obj

    @transaction.atomic
    def update(self, instance, validated_data):
        fields = self._profile_data(validated_data)
        obj = super().update(instance, validated_data)
        if obj.status != Representative.Status.ACTIVE:
            fields['is_public'] = False
        self._save_profile(obj, fields)
        return obj

    def to_representation(self, instance):
        data = super().to_representation(instance)
        profile = RepresentativeProfile.objects.filter(representative_id=instance.pk).first()
        data.update({
            'is_public': bool(profile and profile.is_public),
            'last_month_sales': str(profile.last_month_sales) if profile and profile.last_month_sales is not None else None,
            'performance_score': profile.performance_score if profile else None,
            'sms_consent': bool(profile and profile.sms_consent),
        })
        return data


class RepresentativeViewSet(StaffViewSet):
    queryset = Representative.objects.select_related('user').all()
    serializer_class = RepresentativeSerializer
    permission_prefix, model_name = 'accounts', 'representative'
    search_fields = ['code', 'company_name', 'contact_name', 'city', 'province', 'phone', 'email']

    def perform_destroy(self, instance):
        # The optional profile intentionally has no FK to unmigrated legacy accounts.
        # Delete it explicitly to avoid orphaned sales/reporting records.
        with transaction.atomic():
            RepresentativeProfile.objects.filter(representative_id=instance.pk).delete()
            instance.delete()

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        from django.db.models import Sum, Avg
        profiles = RepresentativeProfile.objects.all()
        sales = profiles.filter(last_month_sales__isnull=False)
        rated = profiles.filter(performance_score__isnull=False)
        mean = rated.aggregate(value=Avg('performance_score'))['value']
        total_sales = sales.aggregate(value=Sum('last_month_sales'))['value']
        return Response({
            'total': Representative.objects.count(),
            'active': Representative.objects.filter(status=Representative.Status.ACTIVE).count(),
            'pending': Representative.objects.filter(status=Representative.Status.PENDING).count(),
            'public': profiles.filter(is_public=True, representative_id__in=Representative.objects.filter(status=Representative.Status.ACTIVE).values('pk')).count(),
            'sales_reported': sales.count(),
            'last_month_sales_total': str(total_sales) if total_sales is not None else None,
            'rated': rated.count(),
            'average_score': round(mean, 1) if mean is not None else None,
        })

    @action(detail=False, methods=['post'], url_path='import-excel')
    def import_excel(self, request):
        if not request.user.has_perm('accounts.add_representative'):
            raise PermissionDenied('اجازه واردکردن نمایندگان را ندارید.')
        file = request.FILES.get('file')
        if file is None or not file.name.lower().endswith('.xlsx'):
            raise ValidationError({'file': 'یک فایل XLSX معتبر انتخاب کنید.'})
        if file.size > 2 * 1024 * 1024:
            raise ValidationError({'file': 'حجم فایل نباید از ۲ مگابایت بیشتر باشد.'})
        apply = str(request.data.get('apply', 'false')).lower() == 'true'
        from accounts.import_helpers import import_representative_workbook
        try:
            result = import_representative_workbook(file, apply=apply)
        except (ValueError, OSError, KeyError, TypeError) as exc:
            raise ValidationError({'file': str(exc)}) from exc
        except Exception as exc:
            from zipfile import BadZipFile
            if isinstance(exc, BadZipFile):
                raise ValidationError({'file': 'ساختار فایل اکسل معتبر نیست.'}) from exc
            raise
        return Response({'applied': apply, 'summary': result, 'public_records': 0,
                         'detail': 'ورود به وضعیت انتظار تأیید انجام شد.' if apply else 'فقط پیش‌نمایش؛ هیچ تغییری در دیتابیس اعمال نشد.'})


class InquirySerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source='get_kind_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Inquiry
        fields = ['id', 'tracking_code', 'kind', 'kind_label', 'product', 'representative',
                  'full_name', 'email', 'phone', 'city', 'company', 'message',
                  'status', 'status_label', 'assigned_to', 'internal_note',
                  'handled_at', 'created_at']
        read_only_fields = ['id', 'tracking_code', 'created_at', 'handled_at']


class InquiryViewSet(StaffViewSet):
    queryset = Inquiry.objects.all()
    serializer_class = InquirySerializer
    permission_prefix, model_name = 'crm', 'inquiry'
    search_fields = ['tracking_code', 'full_name', 'email', 'phone', 'company']

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        instance = serializer.save()
        if old_status != instance.status:
            InquiryStatusHistory.objects.create(
                inquiry=instance, status=instance.status, changed_by=self.request.user,
                note=instance.internal_note[:1000],
            )


class JobSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = JobApplication
        fields = ['id', 'tracking_code', 'full_name', 'email', 'phone', 'specialization',
                  'message', 'status', 'status_label', 'assigned_to', 'internal_note',
                  'created_at']
        read_only_fields = ['id', 'tracking_code', 'created_at']


class JobViewSet(StaffViewSet):
    queryset = JobApplication.objects.all()
    serializer_class = JobSerializer
    permission_prefix, model_name = 'crm', 'jobapplication'
    search_fields = ['tracking_code', 'full_name', 'email', 'phone', 'specialization']
    http_method_names = ['get', 'patch', 'head', 'options']  # HR data is never silently deleted.

    @action(detail=True, methods=['get'])
    def resume(self, request, pk=None):
        item = self.get_object()
        if not item.resume:
            return Response({'detail': 'رزومه موجود نیست'}, status=404)
        suffix = item.resume.name.rsplit('.', 1)[-1].lower()
        if suffix not in ('pdf', 'docx'):
            raise ValidationError('نوع فایل مجاز نیست')
        response = FileResponse(item.resume.open('rb'), as_attachment=True, filename=f'resume-{item.pk}.{suffix}')
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response


class MediaSerializer(serializers.ModelSerializer):
    url = serializers.CharField(read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = MediaAsset
        fields = ['id', 'title', 'image', 'original_path', 'url', 'alt_text', 'category', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        image = data.get('image', getattr(self.instance, 'image', None))
        original = data.get('original_path', getattr(self.instance, 'original_path', ''))
        if not image and not original:
            raise serializers.ValidationError('یک تصویر بارگذاری کنید یا مسیر فایل اصلی را انتخاب کنید.')
        import re
        category = data.get('category', getattr(self.instance, 'category', ''))
        if category and not re.fullmatch(r'[a-z0-9_-]{1,45}(?::[a-z0-9_-]{1,45})?', category):
            raise serializers.ValidationError({'category': 'صفحه و بخش تصویر نامعتبر است.'})
        from content.models import _safe_asset_path
        if original:
            try: _safe_asset_path(original)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({'original_path': exc.messages}) from exc
        return data


class MediaViewSet(StaffViewSet):
    queryset = MediaAsset.objects.all()
    serializer_class = MediaSerializer
    permission_prefix, model_name = 'content', 'mediaasset'
    search_fields = ['title', 'alt_text', 'category']

    def get_queryset(self):
        qs = super().get_queryset()
        page_key = self.request.query_params.get('page_key', '').strip()
        if page_key and page_key != 'all':
            if not __import__('re').fullmatch(r'[a-z0-9_-]{1,45}', page_key):
                raise ValidationError({'page_key': 'نام صفحه نامعتبر است.'})
            return qs.filter(Q(category=page_key) | Q(category__startswith=page_key + ':'))
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.sections.exists() or instance.content_sitesectionimage_set.exists():
            return Response(
                {'detail': 'این تصویر در محتوای سایت استفاده شده است. ابتدا تصویر بخش‌های وابسته را جایگزین کنید.'},
                status=status.HTTP_409_CONFLICT,
            )
        uploaded_image = instance.image
        response = super().destroy(request, *args, **kwargs)
        # Original /assets references belong to the frontend and must never be deleted here.
        if uploaded_image:
            uploaded_image.delete(save=False)
        return response



class ContentSerializer(serializers.ModelSerializer):
    image = serializers.CharField(source='image_url', read_only=True)

    def validate_existing_asset(self, value):
        if value and (not value.startswith('/assets/') or '..' in value or '\\' in value):
            raise serializers.ValidationError('مسیر تصویر باید از فایل‌های اصلی /assets/ باشد.')
        return value

    class Meta:
        model = ContentEntry
        fields = ['id', 'kind', 'title', 'slug', 'summary', 'body', 'existing_asset',
                  'cover_image', 'image', 'status', 'event_date', 'sort_order',
                  'published_at', 'show_on_home', 'seo_title', 'seo_description',
                  'canonical_url', 'created_at']
        read_only_fields = ['id', 'published_at', 'created_at']


class ContentViewSet(StaffViewSet):
    queryset = ContentEntry.objects.all()
    serializer_class = ContentSerializer
    permission_prefix, model_name = 'content', 'contententry'
    search_fields = ['title', 'summary', 'slug']

    def get_queryset(self):
        queryset = super().get_queryset()
        kind = self.request.query_params.get('kind', '').strip()
        if kind:
            if kind not in ContentEntry.Kind.values:
                raise ValidationError({'kind': 'نوع محتوا نامعتبر است.'})
            queryset = queryset.filter(kind=kind)
        return queryset

    def perform_update(self, serializer):
        previous_asset = serializer.instance.existing_asset
        changed_asset = serializer.validated_data.get('existing_asset')
        has_new_upload = bool(serializer.validated_data.get('cover_image'))
        item = serializer.save()
        if changed_asset and changed_asset != previous_asset and not has_new_upload and item.cover_image:
            item.cover_image = ''
            item.save(update_fields=['cover_image', 'updated_at'])


class PageSerializer(serializers.ModelSerializer):
    section_count = serializers.IntegerField(source='sections.count', read_only=True)

    class Meta:
        model = SitePage
        fields = ['id', 'key', 'name', 'description', 'order', 'is_active', 'section_count']


class PageViewSet(StaffViewSet):
    def _check_permission(self, request):
        if not request.user.has_perm('content.view_sitepage'):
            raise PermissionDenied('اجازه مشاهده صفحات را ندارید')
        if request.method == 'PATCH' and not request.user.has_perm('content.edit_site_pages'):
            raise PermissionDenied('اجازه ویرایش صفحات را ندارید')

    queryset = SitePage.objects.prefetch_related('sections').all()
    serializer_class = PageSerializer
    permission_prefix, model_name = 'content', 'sitepage'
    lookup_field = 'key'
    http_method_names = ['get', 'patch', 'head', 'options']

    def partial_update(self, request, *args, **kwargs):
        raise PermissionDenied('ویرایش اطلاعات صفحه فقط از طریق CMS و SEO مجاز است.')

    @action(detail=True, methods=['get', 'patch'], url_path='seo')
    def seo(self, request, key=None):
        page = self.get_object()
        if request.method == 'PATCH' and not request.user.has_perm('content.change_pageseo'):
            raise PermissionDenied('اجازه ویرایش سئو را ندارید')
        path = '/' if page.key == 'home' else '/' + page.key
        obj, _ = PageSEO.objects.get_or_create(path=path, defaults={'title': page.name})
        if request.method == 'PATCH':
            serializer = PageSEOSerializer(obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            # DRF must not receive data=None for read-only GET serializers.
            # Otherwise serializer.data raises an AssertionError (HTTP 500).
            serializer = PageSEOSerializer(obj)
        return Response(serializer.data)


class PageSEOSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageSEO
        fields = ['id', 'path', 'title', 'description', 'seo_title', 'seo_description', 'canonical_url', 'indexable']
        read_only_fields = ['id', 'path']


class SectionSerializer(serializers.ModelSerializer):
    page_name = serializers.CharField(source='page.name', read_only=True)
    draft_image_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    draft_products = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), many=True, required=False)

    class Meta:
        model = SiteSection
        fields = ['id', 'page', 'page_name', 'key', 'name', 'kind', 'sort_order',
                  'draft_title', 'draft_subtitle', 'draft_body', 'draft_image',
                  'draft_image_url', 'draft_asset', 'draft_image_alt', 'draft_link_label',
                  'draft_link_url', 'draft_products', 'draft_enabled', 'is_published',
                  'published_snapshot', 'image_url', 'images', 'published_at', 'updated_at']
        read_only_fields = ['id', 'is_published', 'published_snapshot', 'published_at', 'updated_at']

    def get_draft_image_url(self, obj):
        if obj.draft_image:
            return '/uploads/' + obj.draft_image.name.removeprefix('public/')
        return obj.draft_asset.url if obj.draft_asset_id else ''

    def get_image_url(self, obj):
        return (obj.published_snapshot or {}).get('image', '')

    def get_images(self, obj):
        return [{'id': x.id, 'url': x.url, 'caption': x.caption, 'alt_text': x.alt_text,
                 'sort_order': x.sort_order} for x in obj.images.all()]

    def validate_draft_link_url(self, value):
        if value and not (value.startswith('/') and not value.startswith('//') and '..' not in value) and not value.startswith(('https://', 'http://')):
            raise ValidationError('لینک باید آدرس داخلی یا آدرس معتبر اینترنتی باشد.')
        return value


class SectionViewSet(StaffViewSet):
    queryset = SiteSection.objects.select_related('page', 'draft_asset').prefetch_related('images', 'draft_products').all()
    serializer_class = SectionSerializer
    permission_prefix, model_name = 'content', 'sitesection'
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def _check_permission(self, request):
        if not request.user.has_perm('content.view_sitepage'):
            raise PermissionDenied('مجوز مشاهده صفحات سایت را ندارید')
        if request.method != 'GET' and not request.user.has_perm('content.edit_site_pages'):
            raise PermissionDenied('مجوز ویرایش صفحات سایت را ندارید')

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(page__key=self.request.query_params['page_key']) if self.request.query_params.get('page_key') else qs

    def perform_create(self, serializer):
        serializer.save(last_editor=self.request.user)

    def perform_update(self, serializer):
        obj = serializer.save(last_editor=self.request.user)
        # Selecting a library image must supersede any earlier uploaded draft.
        if 'draft_asset' in serializer.validated_data and obj.draft_asset_id and obj.draft_image:
            obj.draft_image = ''
            obj.save(update_fields=['draft_image', 'updated_at'])

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        obj = self.get_object()
        obj.publish(request.user)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        obj = self.get_object()
        obj.is_published = False
        obj.save(update_fields=['is_published', 'updated_at'])
        return Response(self.get_serializer(obj).data)


class SectionImageSerializer(serializers.ModelSerializer):
    url = serializers.CharField(read_only=True)

    class Meta:
        model = SiteSectionImage
        fields = ['id', 'section', 'image', 'library_asset', 'url', 'caption', 'alt_text', 'sort_order']

    def validate(self, data):
        if not (data.get('image', getattr(self.instance, 'image', None)) or
                data.get('library_asset', getattr(self.instance, 'library_asset', None))):
            raise serializers.ValidationError('فایل یا تصویر کتابخانه لازم است.')
        return data


class SectionImageViewSet(StaffViewSet):
    queryset = SiteSectionImage.objects.all()
    serializer_class = SectionImageSerializer
    permission_prefix, model_name = 'content', 'sitesectionimage'

    def _check_permission(self, request):
        if not request.user.has_perm('content.view_sitepage'):
            raise PermissionDenied('مجوز مشاهده صفحات سایت را ندارید')
        if request.method != 'GET' and not request.user.has_perm('content.edit_site_pages'):
            raise PermissionDenied('اجازه تغییر تصاویر را ندارید')

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(section_id=self.request.query_params['section']) if self.request.query_params.get('section') else qs


class AnnouncementSerializer(serializers.ModelSerializer):
    delivery_count = serializers.IntegerField(source='deliveries.count', read_only=True)

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'body', 'audience', 'selected_representatives', 'selected_users',
                  'channel', 'status', 'scheduled_at', 'delivery_count', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']


class AnnouncementViewSet(StaffViewSet):
    def _check_permission(self, request):
        if request.method == 'POST' and getattr(self, 'action', '') in {'queue','preview'}:
            if not request.user.has_perm('communications.change_announcement'):
                raise PermissionDenied('اجازه ارسال ندارید')
            return
        return super()._check_permission(request)

    queryset = Announcement.objects.prefetch_related('deliveries', 'selected_representatives', 'selected_users').all()
    serializer_class = AnnouncementSerializer
    permission_prefix, model_name = 'communications', 'announcement'
    search_fields = ['title', 'body']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def audiences(self, request):
        """Search active panel users or representatives for the announcement picker."""
        from django.db.models import Q
        from accounts.models import User
        kind=request.query_params.get('kind','representatives')
        query=request.query_params.get('q','').strip()[:100]
        if kind=='panel_users':
            qs=User.objects.filter(is_staff=True,is_active=True)
            if query:qs=qs.filter(Q(first_name__icontains=query)|Q(last_name__icontains=query)|Q(email__icontains=query)|Q(phone__icontains=query))
            count=qs.count();rows=qs.order_by('first_name','last_name','pk')[:100]
            return Response({'count':count,'results':[{'id':u.pk,'name':u.get_full_name() or u.email,'email':u.email,'phone':u.phone,'role':u.role} for u in rows]})
        if kind!='representatives':return Response({'detail':'نوع مخاطب معتبر نیست.'},status=400)
        qs=Representative.objects.filter(status='active').select_related('user')
        if query:qs=qs.filter(Q(company_name__icontains=query)|Q(contact_name__icontains=query)|Q(code__icontains=query)|Q(phone__icontains=query))
        count=qs.count();rows=qs.order_by('company_name','pk')[:100]
        consents=set(RepresentativeProfile.objects.filter(representative_id__in=[r.pk for r in rows],sms_consent=True).values_list('representative_id',flat=True))
        return Response({'count':count,'results':[{'id':r.pk,'name':r.company_name,'contact_name':r.contact_name,'phone':r.phone,'code':r.code,'sms_consent':r.pk in consents} for r in rows]})

    def _preview(self, announcement):
        from accounts.models import User
        channels=['in_app','email','sms'] if announcement.channel==Announcement.Channel.ALL else [announcement.channel]
        records=[]
        if announcement.audience in (Announcement.Audience.ACTIVE,Announcement.Audience.SELECTED):
            reps=(Representative.objects.filter(status='active') if announcement.audience==Announcement.Audience.ACTIVE else announcement.selected_representatives.filter(status='active')).select_related('user').order_by('pk')
            consent=set(RepresentativeProfile.objects.filter(representative_id__in=reps.values('id'),sms_consent=True).values_list('representative_id',flat=True))
            for rep in reps:
                email=rep.email or (rep.user.email if rep.user else '')
                for channel in channels:
                    eligible=channel=='in_app' or (channel=='email' and bool(email)) or (channel=='sms' and bool(rep.phone) and rep.pk in consent)
                    reason='' if eligible else ('رضایت پیامکی ثبت نشده است' if channel=='sms' and rep.phone else 'اطلاعات تماس موجود نیست')
                    records.append({'kind':'representative','id':rep.pk,'name':rep.company_name,'phone':rep.phone,'channel':channel,'eligible':eligible,'reason':reason})
        else:
            users=(User.objects.filter(is_staff=True,is_active=True) if announcement.audience==Announcement.Audience.ALL_PANEL else announcement.selected_users.filter(is_staff=True,is_active=True)).order_by('pk')
            for user in users:
                for channel in channels:
                    eligible=channel=='in_app' or (channel=='email' and bool(user.email)) or (channel=='sms' and bool(user.phone))
                    reason='' if eligible else 'شماره تماس یا ایمیل ثبت نشده است'
                    records.append({'kind':'panel_user','id':user.pk,'name':user.get_full_name() or user.email,'phone':user.phone,'channel':channel,'eligible':eligible,'reason':reason})
        signature=[{k:r[k] for k in ('kind','id','phone','channel','eligible')} for r in records]
        digest=sha256(json.dumps(signature,ensure_ascii=False,sort_keys=True).encode('utf-8')).hexdigest()
        eligible_count=sum(1 for row in records if row['eligible'])
        return {'preview_hash':digest,'eligible_count':eligible_count,'skipped_count':len(records)-eligible_count,
                'total_count':len(records),'recipients':records[:150]}

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        if not request.user.has_perm('communications.change_announcement'):
            raise PermissionDenied('اجازه پیش‌نمایش گیرندگان را ندارید.')
        item=self.get_object()
        if item.status!='draft':return Response({'detail':'فقط پیش‌نویس قابل پیش‌نمایش است.'},status=409)
        return Response(self._preview(item))

    @action(detail=True, methods=['post'])
    def queue(self, request, pk=None):
        if not request.user.has_perm('communications.change_announcement'):
            raise PermissionDenied('اجازه ارسال اطلاعیه را ندارید')
        item = self.get_object()
        if item.status != 'draft':return Response({'detail':'این اطلاعیه قبلاً از پیش‌نویس خارج شده است.'},status=409)
        preview=self._preview(item)
        if not request.data.get('preview_hash') or request.data.get('preview_hash')!=preview['preview_hash']:
            return Response({'detail':'فهرست مخاطبان تغییر کرده است؛ دوباره پیش‌نمایش بگیرید.'},status=409)
        if preview['eligible_count']<1:return Response({'detail':'هیچ گیرنده‌ی واجد شرایطی وجود ندارد.'},status=409)
        if item.channel in (Announcement.Channel.SMS,Announcement.Channel.ALL):
            from sms_campaigns.services import provider_is_ready
            try:connected=provider_is_ready()
            except RuntimeError:connected=False
            if not connected:return Response({'detail':'اتصال پیامک فعال نیست؛ ابتدا از تنظیمات پیامک آن را راه‌اندازی کنید.'},status=409)
        with transaction.atomic():
            locked=Announcement.objects.select_for_update().get(pk=item.pk)
            if locked.status!='draft':return Response({'detail':'این اطلاعیه قبلاً از پیش‌نویس خارج شده است.'},status=409)
            locked.queue_deliveries()
        return Response({**self.get_serializer(locked).data,'eligible_count':preview['eligible_count'],'skipped_count':preview['skipped_count']})


class DeliverySerializer(serializers.ModelSerializer):
    announcement_title = serializers.CharField(source='announcement.title', read_only=True)
    representative_name = serializers.SerializerMethodField()

    def get_representative_name(self,obj):
        if obj.representative_id:return obj.representative.company_name
        return (obj.recipient_user.get_full_name() or obj.recipient_user.email) if obj.recipient_user_id else ''

    class Meta:
        model = Delivery
        fields = ['id', 'announcement', 'announcement_title', 'representative', 'recipient_user', 'representative_name',
                  'recipient_phone', 'channel', 'status', 'attempts', 'last_error', 'processed_at', 'read_at']


class DeliveryViewSet(StaffViewSet):
    queryset = Delivery.objects.select_related('announcement', 'representative', 'recipient_user').all()
    serializer_class = DeliverySerializer
    permission_prefix, model_name = 'communications', 'delivery'
    search_fields = ['announcement__title', 'representative__company_name', 'recipient_user__email', 'recipient_user__first_name', 'recipient_user__last_name']
    http_method_names = ['get', 'head', 'options']


class UserSerializer(serializers.ModelSerializer):
    # accounts.User extends AbstractUser: it has date_joined, not created_at.
    # Preserve the frontend's expected created_at response field.
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=10)
    sms_access = serializers.ListField(child=serializers.ChoiceField(choices=['manager','viewer','administrator']), required=False)
    staff_team_name = serializers.CharField(source='staff_team.name', read_only=True, allow_null=True)
    staff_team = serializers.PrimaryKeyRelatedField(queryset=StaffTeam.objects.all(), required=False, allow_null=True)

    def validate_staff_team(self, value):
        if value and not value.is_active and (not self.instance or self.instance.staff_team_id != value.pk):
            raise serializers.ValidationError('تیم غیرفعال را نمی‌توان به کارمند جدید اختصاص داد.')
        return value

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        try: validate_password(value)
        except DjangoValidationError as exc: raise serializers.ValidationError(exc.messages) from exc
        return value

    def validate_sms_access(self,value):
        if len(value)>1:raise serializers.ValidationError('برای هر حساب فقط یک سطح دسترسی پیامک انتخاب کنید.')
        return value

    def to_representation(self, instance):
        data=super().to_representation(instance)
        names={'sms_campaign_managers':'manager','sms_campaign_viewers':'viewer','sms_campaign_administrators':'administrator'}
        data['sms_access']=[names[group.name] for group in instance.groups.filter(name__in=names)]
        return data

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone', 'role', 'staff_team', 'staff_team_name',
                  'is_active', 'is_staff', 'password', 'created_at', 'sms_access']
        read_only_fields = ['id', 'is_staff', 'created_at']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        sms_access = validated_data.pop('sms_access', [])
        if not password:
            raise ValidationError({'password': 'برای حساب جدید رمز عبور لازم است.'})
        role = validated_data.get('role', 'representative')
        if role == 'admin' and not self.context['request'].user.is_superuser:
            raise PermissionDenied('فقط مدیر ارشد می‌تواند مدیر جدید ایجاد کند')
        with transaction.atomic():
            instance = User.objects.create_user(password=password,
                                                is_staff=(role != 'representative'), **validated_data)
            group = Group.objects.filter(name=role).first()
            if group: instance.groups.set([group])
            else: instance.groups.clear()
            self._set_sms_access(instance, sms_access)
        return instance

    def update(self, instance, validated_data):
        actor = self.context['request'].user
        if instance.is_superuser and not actor.is_superuser:
            raise PermissionDenied('امکان تغییر حساب مدیر ارشد وجود ندارد')
        if instance.pk == actor.pk and ('role' in validated_data or 'is_active' in validated_data):
            raise PermissionDenied('تغییر نقش یا غیرفعال کردن حساب خودتان مجاز نیست')
        role = validated_data.get('role', instance.role)
        if role == 'admin' and not actor.is_superuser:
            raise PermissionDenied('فقط مدیر ارشد می‌تواند نقش مدیر اختصاص دهد')
        password = validated_data.pop('password', None)
        sms_access = validated_data.pop('sms_access', None)
        with transaction.atomic():
            for key, value in validated_data.items(): setattr(instance, key, value)
            instance.is_staff = (instance.role != 'representative') or instance.is_superuser
            if password: instance.set_password(password)
            instance.save()
            group = Group.objects.filter(name=role).first()
            if not instance.is_superuser:
                sms_groups = list(Group.objects.filter(name__in={'sms_campaign_managers','sms_campaign_viewers','sms_campaign_administrators'}))
                instance.groups.set(([group] if group else []) + [x for x in sms_groups if x in instance.groups.all()])
            if sms_access is not None: self._set_sms_access(instance, sms_access)
        return instance

    @staticmethod
    def _set_sms_access(instance, access):
        sms_groups = {'sms_campaign_managers', 'sms_campaign_viewers', 'sms_campaign_administrators'}
        instance.groups.remove(*Group.objects.filter(name__in=sms_groups))
        names = {'manager':'sms_campaign_managers','viewer':'sms_campaign_viewers','administrator':'sms_campaign_administrators'}
        instance.groups.add(*Group.objects.filter(name__in=[names[x] for x in access]))
        if access and not instance.is_staff:
            instance.is_staff=True
            instance.save(update_fields=['is_staff'])


class StaffTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffTeam
        fields = ['id', 'name', 'is_active']
        read_only_fields = ['id']


class StaffTeamViewSet(StaffViewSet):
    queryset = StaffTeam.objects.all()
    serializer_class = StaffTeamSerializer
    # Team membership is organizational data; only users administrators may manage it.
    permission_prefix, model_name = 'accounts', 'user'
    search_fields = ['name']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def destroy(self, request, *args, **kwargs):
        team = self.get_object()
        team.is_active = False
        team.save(update_fields=['is_active', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserViewSet(StaffViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_prefix, model_name = 'accounts', 'user'
    search_fields = ['username', 'email', 'first_name', 'last_name']
    http_method_names = ['get', 'post', 'patch', 'head', 'options']


class ManagerDashboardView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        try: days = int(request.query_params.get('days', '30'))
        except ValueError: days = 30
        if days not in (7, 30, 90):
            return Response({'detail': 'بازه باید ۷، ۳۰ یا ۹۰ روز باشد.'}, status=400)
        category_id = request.query_params.get('category', '').strip()
        if category_id and (not category_id.isdigit() or not ProductCategory.objects.filter(pk=category_id).exists()):
            return Response({'detail': 'شناسه دسته‌بندی نامعتبر است.'}, status=400)
        now = timezone.now()
        today = timezone.localdate(now)
        since_day = today - timedelta(days=days - 1)
        since = timezone.make_aware(datetime.combine(since_day, time.min))
        can = lambda perm: request.user.has_perm(perm)
        can_analytics = can('analytics.view_trafficevent')
        if can_analytics:
            traffic = TrafficEvent.objects.filter(occurred_at__gte=since)
            grouped = traffic.annotate(day=TruncDate('occurred_at')).values('day', 'kind').annotate(n=Count('id'))
            by_day = defaultdict(dict)
            for item in grouped:
                by_day[str(item['day'])][item['kind']] = item['n']
            trend = [
                {'date': (since_day + timedelta(days=i)).isoformat(),
                 'views': by_day.get((since_day + timedelta(days=i)).isoformat(), {}).get('page_view', 0),
                 'products': by_day.get((since_day + timedelta(days=i)).isoformat(), {}).get('product_view', 0)}
                for i in range(days)
            ]
            visits = sum(x['views'] for x in trend)
            popular_pages = list(traffic.filter(kind='page_view').values('path').annotate(views=Count('id')).order_by('-views')[:5])
        else:
            trend, visits, popular_pages, popular_products, top_product_series = [], None, [], [], []
        # Product managers need product-view charts even when they do not have
        # permission to inspect site-wide analytics or popular pages.
        if can('catalog.view_product'):
            product_traffic = TrafficEvent.objects.filter(
                occurred_at__gte=since, kind='product_view', product__isnull=False,
            )
            if category_id:
                product_traffic = product_traffic.filter(product__category_id=int(category_id))
            popular_products = list(product_traffic
                                    .values('product_id', 'product__name', 'product__slug')
                                    .annotate(views=Count('id')).order_by('-views')[:8])
            # Series use accepted product-view events, never the legacy counter.
            product_ids = [item['product_id'] for item in popular_products[:5]]
            product_group = (product_traffic.filter(product_id__in=product_ids)
                             .annotate(day=TruncDate('occurred_at'))
                             .values('product_id', 'day').annotate(n=Count('id')))
            product_daily = defaultdict(dict)
            for item in product_group:
                product_daily[item['product_id']][str(item['day'])] = item['n']
            top_product_series = [
                {'product_id': product['product_id'], 'name': product['product__name'], 'views': product['views'],
                 'data': [product_daily[product['product_id']].get((since_day + timedelta(days=i)).isoformat(), 0)
                          for i in range(days)]}
                for product in popular_products[:5]
            ]
        else:
            popular_products, top_product_series = [], []
        if can('crm.view_inquiry'):
            qs = Inquiry.objects.all()
            inquiry_status = list(qs.filter(created_at__gte=since).values('status').annotate(count=Count('id')))
            recent = list(qs.values('id', 'tracking_code', 'full_name', 'kind', 'status', 'created_at')[:7])
            pending = qs.filter(status='new').count()
            request_total = qs.filter(created_at__gte=since).count()
        else:
            inquiry_status, recent, pending, request_total = [], [], None, None
        return Response({
            'days': days, 'period_start': since_day.isoformat(), 'period_end': today.isoformat(),
            'metrics': {
                'visits': visits,
                'representatives': Representative.objects.filter(status='active').count() if can('accounts.view_representative') else None,
                'new_inquiries': pending,
                'products': Product.objects.filter(status='published').count() if can('catalog.view_product') else None,
                'recruitment': JobApplication.objects.filter(status='new').count() if can('crm.view_jobapplication') else None,
            },
            'trend': trend, 'popular_pages': popular_pages,
            'popular_products': popular_products if can('catalog.view_product') else [],
            'product_series': top_product_series if can('catalog.view_product') else [],
            'inquiry_status': inquiry_status, 'recent_inquiries': recent,
            'inquiries_period_total': request_total,
        })


router = routers.DefaultRouter()
router.register('categories', CategoryViewSet, basename='manage-categories')
router.register('products', ProductViewSet, basename='manage-products')
router.register('textures', TextureViewSet, basename='manage-textures')
router.register('product-images', ProductImageViewSet, basename='manage-product-images')
router.register('representatives', RepresentativeViewSet, basename='manage-representatives')
router.register('inquiries', InquiryViewSet, basename='manage-inquiries')
router.register('applications', JobViewSet, basename='manage-applications')
router.register('media', MediaViewSet, basename='manage-media')
router.register('content', ContentViewSet, basename='manage-content')
router.register('pages', PageViewSet, basename='manage-pages')
router.register('sections', SectionViewSet, basename='manage-sections')
router.register('section-images', SectionImageViewSet, basename='manage-section-images')
router.register('announcements', AnnouncementViewSet, basename='manage-announcements')
router.register('deliveries', DeliveryViewSet, basename='manage-deliveries')
router.register('users', UserViewSet, basename='manage-users')
router.register('teams', StaffTeamViewSet, basename='manage-teams')
