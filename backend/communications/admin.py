from django.contrib import admin, messages
from django.db.models import Count, Q
from django.contrib.admin import TabularInline
from common.admin import BrandModelAdmin
from .models import Announcement, Delivery


class DeliveryInline(TabularInline):
    model = Delivery
    extra = 0
    can_delete = False
    readonly_fields = ('representative', 'channel', 'status', 'attempts', 'last_error', 'processed_at', 'read_at')
    fields = ('representative', 'channel', 'status', 'attempts', 'last_error')
    show_change_link = True

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Announcement)
class AnnouncementAdmin(BrandModelAdmin):
    list_display = ('title', 'audience', 'channel', 'status', 'delivery_total', 'delivery_accepted', 'delivery_failed', 'created_at')
    list_filter = ('status', 'channel', 'audience')
    search_fields = ('title', 'body')
    filter_horizontal = ('selected_representatives',)
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    inlines = (DeliveryInline,)
    actions = ('enqueue_selected',)
    fields = ('title', 'body', 'audience', 'selected_representatives', 'channel', 'scheduled_at', 'status', 'created_by', 'created_at', 'updated_at')

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    @admin.display(description='همه')
    def delivery_total(self, obj):
        return obj.deliveries.count()

    @admin.display(description='پذیرفته‌شده')
    def delivery_accepted(self, obj):
        return obj.deliveries.filter(status='accepted').count()

    @admin.display(description='ناموفق')
    def delivery_failed(self, obj):
        return obj.deliveries.filter(status__in=['failed', 'skipped']).count()

    @admin.action(description='قرار دادن اطلاعیه‌ها در صف ارسال')
    def enqueue_selected(self, request, queryset):
        for announcement in queryset:
            announcement.queue_deliveries()
        self.message_user(request, 'پیام‌ها در صف قرار گرفتند. برای ارسال ایمیل و پیامک باید worker اجرا شود.', messages.INFO)


@admin.register(Delivery)
class DeliveryAdmin(BrandModelAdmin):
    list_display = ('announcement', 'representative', 'channel', 'status', 'attempts', 'last_error', 'processed_at')
    list_filter = ('status', 'channel', 'announcement')
    search_fields = ('announcement__title', 'representative__code', 'representative__company_name')
    readonly_fields = ('announcement', 'representative', 'channel', 'status', 'attempts', 'last_error', 'provider_reference', 'processed_at', 'read_at', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
