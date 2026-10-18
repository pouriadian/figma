from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAdminUser
from common.throttles import ProxyAwareScopedRateThrottle
from rest_framework.views import APIView
from rest_framework.response import Response
from catalog.models import Product
from crm.models import Inquiry, JobApplication
from accounts.models import Representative, User
from communications.models import Delivery
from .models import TrafficEvent


class TrafficSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrafficEvent
        fields = ('kind', 'path', 'product')

    def validate_path(self, value):
        if not value.startswith('/') or value.startswith('//') or '..' in value:
            raise serializers.ValidationError('مسیر سایت نامعتبر است.')
        return value

    def validate_product(self, value):
        if value.status != Product.Status.PUBLISHED:
            raise serializers.ValidationError('Product unavailable')
        return value

    def validate(self, attrs):
        kind=attrs.get('kind')
        if kind == 'product_view' and not attrs.get('product'):
            raise serializers.ValidationError('شناسه محصول لازم است.')
        if kind == 'page_view' and attrs.get('product'):
            raise serializers.ValidationError('بازدید صفحه نباید شناسه محصول داشته باشد.')
        path=attrs.get('path', '')
        if path.startswith(('/panel', '/admin', '/api', '/representative')):
            raise serializers.ValidationError('رویداد پنل مدیریت در آمار عمومی مجاز نیست.')
        return attrs


class EventCreateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ProxyAwareScopedRateThrottle]
    throttle_scope = 'analytics'

    def post(self, request):
        serializer = TrafficSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if not request.user.has_perm('analytics.view_trafficevent'):
            return Response({'detail': 'Permission denied'}, status=403)
        since = timezone.now() - timedelta(days=30)
        return Response({
            'page_views_30d': TrafficEvent.objects.filter(kind='page_view', occurred_at__gte=since).count(),
            'products_published': Product.objects.filter(status='published').count(),
            'representatives_active': Representative.objects.filter(status='active').count(),
            'users_active': User.objects.filter(is_active=True).count() if request.user.has_perm('accounts.view_user') else None,
            'inquiries_new': Inquiry.objects.filter(status='new').count(),
            'applications_new': JobApplication.objects.filter(status='new').count() if request.user.has_perm('crm.view_jobapplication') else None,
            'top_products': list(
                Product.objects.annotate(recorded_views=Count('trafficevent', filter=Q(trafficevent__kind='product_view')))
                .order_by('-recorded_views', 'name').values('name', 'sku', 'recorded_views')[:8]
            ),
        })
