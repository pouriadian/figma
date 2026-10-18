from django.contrib import admin
from django.utils import timezone
from django.urls import reverse
from django.utils.html import format_html
from django.contrib.admin import TabularInline
from common.admin import BrandModelAdmin
from .models import Inquiry, InquiryStatusHistory, JobApplication


class HistoryInline(TabularInline):
    model = InquiryStatusHistory
    extra = 0
    readonly_fields = ('status', 'changed_by', 'note', 'created_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Inquiry)
class InquiryAdmin(BrandModelAdmin):
    list_display = ('tracking_code', 'kind', 'full_name', 'phone', 'representative', 'product', 'status', 'assigned_to', 'created_at')
    list_filter = ('status', 'kind', 'created_at')
    search_fields = ('tracking_code', 'full_name', 'phone', 'email', 'representative__company_name', 'product__sku')
    readonly_fields = ('tracking_code', 'created_at', 'updated_at')
    autocomplete_fields = ('product', 'representative', 'assigned_to')
    inlines = (HistoryInline,)
    actions = ('mark_in_progress', 'mark_closed')
    fieldsets = (
        ('درخواست', {'fields': ('tracking_code', 'kind', 'product', 'representative', 'full_name', 'email', 'phone', 'city', 'company', 'message')}),
        ('رسیدگی', {'fields': ('status', 'assigned_to', 'internal_note', 'handled_at')}),
        ('سیستم', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def save_model(self, request, obj, form, change):
        old_status = Inquiry.objects.filter(pk=obj.pk).values_list('status', flat=True).first() if change else None
        super().save_model(request, obj, form, change)
        if not change or obj.status != old_status:
            InquiryStatusHistory.objects.create(inquiry=obj, status=obj.status, changed_by=request.user)

    def _change_status(self, request, queryset, new_status):
        for obj in queryset.exclude(status=new_status):
            obj.status = new_status
            obj.handled_at = timezone.now()
            obj.save(update_fields=['status', 'handled_at', 'updated_at'])
            InquiryStatusHistory.objects.create(inquiry=obj, status=obj.status, changed_by=request.user)

    @admin.action(description='قرار دادن در حال بررسی')
    def mark_in_progress(self, request, queryset):
        self._change_status(request, queryset, Inquiry.Status.IN_PROGRESS)

    @admin.action(description='بستن درخواست‌های انتخاب‌شده')
    def mark_closed(self, request, queryset):
        self._change_status(request, queryset, Inquiry.Status.CLOSED)


@admin.register(JobApplication)
class JobApplicationAdmin(BrandModelAdmin):
    list_display = ('full_name', 'specialization', 'email', 'phone', 'status', 'assigned_to', 'created_at', 'download_link')
    list_filter = ('status', 'specialization')
    search_fields = ('full_name', 'email', 'phone', 'specialization')
    readonly_fields = ('tracking_code', 'created_at', 'updated_at', 'download_link')
    autocomplete_fields = ('assigned_to',)
    fields = ('tracking_code', 'full_name', 'email', 'phone', 'specialization', 'message', 'download_link',
              'status', 'assigned_to', 'internal_note', 'created_at', 'updated_at')

    @admin.display(description='دانلود محرمانه')
    def download_link(self, obj):
        if not obj or not obj.pk or not obj.resume:
            return '—'
        return format_html('<a href="{}">دریافت رزومه</a>', reverse('download-resume', args=[obj.pk]))
