from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.generics import CreateAPIView, ListCreateAPIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from common.throttles import ProxyAwareScopedRateThrottle
from rest_framework.views import APIView
from accounts.permissions import IsActiveRepresentative
from catalog.models import Product
from .models import Inquiry, JobApplication, InquiryStatusHistory


class InquiryCreateSerializer(serializers.ModelSerializer):
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Inquiry
        fields = ('kind', 'product', 'full_name', 'email', 'phone', 'city', 'company', 'message', 'website')

    def validate_website(self, value):
        if value:
            raise serializers.ValidationError('درخواست معتبر نیست.')
        return value

    def create(self, validated_data):
        validated_data.pop('website', None)
        return super().create(validated_data)

    def validate_message(self, value):
        if len(value.strip()) < 8 or len(value) > 3000:
            raise serializers.ValidationError('متن باید بین ۸ تا ۳۰۰۰ حرف باشد.')
        return value.strip()

    def validate(self, attrs):
        if not attrs.get('phone') and not attrs.get('email'):
            raise serializers.ValidationError('شماره تماس یا ایمیل لازم است.')
        product = attrs.get('product')
        if attrs.get('kind') in (Inquiry.Kind.QUOTE, Inquiry.Kind.PRODUCT) and not product:
            raise serializers.ValidationError('برای استعلام اطلاعات یا قیمت، محصول باید مشخص باشد.')
        if product and product.status != Product.Status.PUBLISHED:
            raise serializers.ValidationError('محصول انتخابی قابل استعلام نیست.')
        return attrs


class InquiryCreateView(CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = InquiryCreateSerializer
    throttle_classes = [ProxyAwareScopedRateThrottle]
    throttle_scope = 'forms'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        InquiryStatusHistory.objects.create(inquiry=obj, status=obj.status)
        return Response({'tracking_code': obj.tracking_code, 'status': obj.status}, status=status.HTTP_201_CREATED)


class TrackingViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inquiry
        fields = ('tracking_code', 'kind', 'status', 'created_at', 'updated_at')


class InquiryTrackingView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ProxyAwareScopedRateThrottle]
    throttle_scope = 'tracking'

    def get(self, request, code):
        item = get_object_or_404(Inquiry, tracking_code=code.upper())
        # Tracking token grants only status, never message/contact/personal details.
        return Response(TrackingViewSerializer(item).data)


class JobApplicationSerializer(serializers.ModelSerializer):
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = JobApplication
        fields = ('full_name', 'email', 'phone', 'specialization', 'message', 'resume', 'website')

    def validate_website(self, value):
        if value:
            raise serializers.ValidationError('درخواست معتبر نیست.')
        return value

    def create(self, validated_data):
        validated_data.pop('website', None)
        return super().create(validated_data)

    def validate_resume(self, value):
        from common.validators import validate_resume
        validate_resume(value)
        return value


class JobApplicationCreateView(CreateAPIView):
    permission_classes = [AllowAny]
    parser_classes = (MultiPartParser, FormParser)
    serializer_class = JobApplicationSerializer
    throttle_classes = [ProxyAwareScopedRateThrottle]
    throttle_scope = 'forms'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        return Response({'tracking_code': application.tracking_code, 'status': application.status}, status=201)


class PortalInquirySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Inquiry
        fields = ('id', 'tracking_code', 'kind', 'product', 'product_name', 'full_name',
                  'email', 'phone', 'message', 'status', 'created_at', 'updated_at')
        read_only_fields = ('tracking_code', 'full_name', 'email', 'phone', 'status', 'created_at', 'updated_at')

    def validate_kind(self, value):
        if value not in (Inquiry.Kind.PRODUCT, Inquiry.Kind.QUOTE):
            raise serializers.ValidationError('نمایندگان فقط استعلام قیمت و اطلاعات محصول ثبت می‌کنند.')
        return value

    def validate(self, attrs):
        if not attrs.get('product'):
            raise serializers.ValidationError('انتخاب محصول ضروری است.')
        return attrs

    def validate_product(self, value):
        if value.status != Product.Status.PUBLISHED:
            raise serializers.ValidationError('محصول منتشر نشده است.')
        return value

    def validate_message(self, value):
        if len(value.strip()) < 8:
            raise serializers.ValidationError('توضیحات باید حداقل ۸ حرف داشته باشد.')
        return value


class PortalInquiryListCreateView(ListCreateAPIView):
    permission_classes = [IsActiveRepresentative]
    serializer_class = PortalInquirySerializer

    def get_queryset(self):
        return Inquiry.objects.filter(representative=self.request.user.representative).select_related('product')

    def perform_create(self, serializer):
        user = self.request.user
        rep = user.representative
        instance = serializer.save(representative=rep, full_name=rep.contact_name,
                                   email=rep.email or user.email, phone=rep.phone)
        InquiryStatusHistory.objects.create(inquiry=instance, status=instance.status, changed_by=user)
