from django.db.models import Count
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import serializers
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from common.throttles import ProxyAwareScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .permissions import IsActiveRepresentative
from .models import Representative


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    throttle_classes = [ProxyAwareScopedRateThrottle]
    throttle_scope = 'auth'


class StaffLoginSerializer(serializers.Serializer):
    """The panel accepts email, not Django's optional username field."""
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class StaffLoginView(APIView):
    """Independent, rate-limited JWT login for Faromid's Next.js /panel.

    Unlike the representative's token endpoint this explicitly authenticates
    by the custom user's USERNAME_FIELD and requires an active staff account.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ProxyAwareScopedRateThrottle]
    throttle_scope = 'staff_auth'

    def post(self, request):
        credentials = StaffLoginSerializer(data=request.data)
        credentials.is_valid(raise_exception=True)
        email = credentials.validated_data['email'].strip()
        password = credentials.validated_data['password']
        user_model = get_user_model()
        user = authenticate(
            request=request,
            **{user_model.USERNAME_FIELD: email},
            password=password,
        )
        if user is None or not user.is_active:
            return Response(
                {'detail': 'ایمیل یا رمز عبور صحیح نیست.'},
                status=401,
            )
        if not user.is_staff:
            return Response(
                {'detail': 'این حساب مجوز ورود به پنل مدیریت را ندارد.'},
                status=403,
            )
        refresh = RefreshToken.for_user(user)
        update_last_login(None, user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class PortalProfileView(APIView):
    permission_classes = [IsActiveRepresentative]

    def get(self, request):
        rep = request.user.representative
        return Response({
            'name': request.user.get_full_name() or request.user.email,
            'email': request.user.email, 'company_name': rep.company_name,
            'code': rep.code, 'city': rep.city, 'province': rep.province,
            'status': rep.status,
        })


class RepresentativeStatsView(APIView):
    permission_classes = [IsActiveRepresentative]

    def get(self, request):
        from crm.models import Inquiry
        from communications.models import Delivery
        rep = request.user.representative
        inquiries = Inquiry.objects.filter(representative=rep)
        notifications = Delivery.objects.filter(representative=rep, channel='in_app')
        return Response({
            'company_name': rep.company_name,
            'total_inquiries': inquiries.count(),
            'open_inquiries': inquiries.exclude(status__in=['closed', 'rejected']).count(),
            'unread_notifications': notifications.filter(read_at__isnull=True).count(),
        })
