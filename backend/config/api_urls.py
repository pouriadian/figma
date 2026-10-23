from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from accounts.api import LoginView, StaffLoginView, PortalProfileView, RepresentativeStatsView
from catalog.api import ProductListView, ProductDetailView, CategoryListView
from crm.api import InquiryCreateView, InquiryTrackingView, JobApplicationCreateView, PortalInquiryListCreateView
from communications.api import PortalNotificationListView, PortalNotificationReadView, PanelNotificationListView, PanelNotificationReadView
from content.api import ContentListView, ContentDetailView, PageSEOView, SitePageView
from analytics.api import EventCreateView, DashboardStatsView
from partners.api import PublicRepresentativeList

from management.api import router as manager_router, AdminMeView, ManagerDashboardView

urlpatterns = [
    path('manage/me/', AdminMeView.as_view()),
    path('manage/dashboard/', ManagerDashboardView.as_view()),
    path('manage/notifications/', PanelNotificationListView.as_view()),
    path('manage/notifications/<int:pk>/read/', PanelNotificationReadView.as_view()),
    path('manage/', include(manager_router.urls)),
    path('manage/', include('sms_campaigns.urls')),
    path('auth/token/', LoginView.as_view()),
    path('auth/staff-token/', StaffLoginView.as_view(), name='panel-staff-login'),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('auth/revoke/', TokenBlacklistView.as_view()),
    path('portal/me/', PortalProfileView.as_view()),
    path('portal/dashboard/', RepresentativeStatsView.as_view()),
    path('portal/inquiries/', PortalInquiryListCreateView.as_view()),
    path('portal/notifications/', PortalNotificationListView.as_view()),
    path('portal/notifications/<int:pk>/read/', PortalNotificationReadView.as_view()),
    path('representatives/', PublicRepresentativeList.as_view(), name='public-representatives'),
    path('categories/', CategoryListView.as_view()),
    path('products/', ProductListView.as_view()),
    path('products/<slug:slug>/', ProductDetailView.as_view()),
    path('inquiries/', InquiryCreateView.as_view()),
    path('track/<str:code>/', InquiryTrackingView.as_view()),
    path('applications/', JobApplicationCreateView.as_view()),
    path('seo/<path:path>/', PageSEOView.as_view()),
    path('site-pages/<slug:key>/', SitePageView.as_view()),
    path('content/', ContentListView.as_view()),
    path('content/<slug:slug>/', ContentDetailView.as_view()),
    path('analytics/', EventCreateView.as_view()),
    path('staff/stats/', DashboardStatsView.as_view()),
]
