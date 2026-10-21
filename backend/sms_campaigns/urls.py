from django.urls import path
from .api import SalesImportView, SalesImportApprovalView, RepresentativeFilterView, RepresentativeSelectionPreviewView, RepresentativeSalesSummaryView, CampaignListView, CampaignDetailView, CampaignActionView, CampaignRecipientsView, RewardView, SMSSettingsView, SMSUtilityView, DiscountRuleDetailView

urlpatterns = [
    path('sales/import-preview/', SalesImportView.as_view()),
    path('sales/imports/<int:pk>/approve/', SalesImportApprovalView.as_view()),
    path('representatives/filter/', RepresentativeFilterView.as_view()),
    path('representatives/selection-preview/', RepresentativeSelectionPreviewView.as_view()),
    path('representatives/sales-summary/', RepresentativeSalesSummaryView.as_view()),
    path('sms/campaigns/', CampaignListView.as_view()),
    path('sms/campaigns/<int:pk>/', CampaignDetailView.as_view()),
    path('sms/campaigns/<int:pk>/recipients/', CampaignRecipientsView.as_view()),
    path('sms/campaigns/<int:pk>/<str:action>/', CampaignActionView.as_view()),
    path('rewards/', RewardView.as_view()),
    path('rewards/history/', RewardView.as_view()),
    path('rewards/<str:action>/', RewardView.as_view()),
    path('rewards/<int:pk>/<str:action>/', RewardView.as_view()),
    path('rewards/rules/<int:pk>/', DiscountRuleDetailView.as_view()),
    path('sms/settings/', SMSSettingsView.as_view()),
    path('sms/<str:action>/', SMSUtilityView.as_view()),
]
