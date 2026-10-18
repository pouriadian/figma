from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.models import Group
import csv
from django.http import HttpResponse
from django.utils.html import format_html
from django.contrib.admin import ModelAdmin
from common.admin import BrandModelAdmin
from .models import User, Representative


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff', 'last_login')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('email',)
    fieldsets = BaseUserAdmin.fieldsets + (("فرامید", {'fields': ('role', 'phone')}),)
    add_fieldsets = BaseUserAdmin.add_fieldsets + (("فرامید", {'fields': ('email', 'role', 'phone')}),)

    def get_readonly_fields(self, request, obj=None):
        if not request.user.is_superuser:
            return ('role', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        return super().get_readonly_fields(request, obj)

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(Representative)
class RepresentativeAdmin(BrandModelAdmin):
    list_display = ('code', 'company_name', 'contact_name', 'city', 'province', 'phone', 'map_link', 'status', 'updated_at')
    list_filter = ('status', 'province', 'city')
    search_fields = ('code', 'company_name', 'contact_name', 'phone', 'email')
    readonly_fields = ('code', 'created_at', 'updated_at')
    autocomplete_fields = ('user',)
    actions = ('export_csv',)
    fieldsets = (
        ('اطلاعات نماینده', {'fields': ('code', 'user', 'company_name', 'contact_name', 'status', 'contract_started_at')}),
        ('اطلاعات ارتباطی', {'fields': ('phone', 'email', 'province', 'city', 'address', 'latitude', 'longitude')}),
        ('مدیریت داخلی', {'fields': ('internal_notes', 'created_at', 'updated_at')}),
    )

    @admin.display(description='نقشه')
    def map_link(self, obj):
        if obj.latitude is None or obj.longitude is None:
            return '—'
        return format_html('<a href="https://www.google.com/maps?q={},{}" target="_blank" rel="noopener noreferrer">موقعیت</a>', obj.latitude, obj.longitude)

    @admin.action(description='دریافت خروجی CSV نمایندگان')
    def export_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="faromid-representatives.csv"'
        response.write('\ufeff')
        writer = csv.writer(response)
        writer.writerow(['code', 'company_name', 'contact_name', 'phone', 'email', 'province', 'city', 'status'])
        def safe(value):
            text = str(value or '')
            return "'" + text if text.startswith(('=', '+', '-', '@', '\t', '\r')) else text
        for r in queryset.iterator():
            writer.writerow([safe(getattr(r, field)) for field in ['code', 'company_name', 'contact_name', 'phone', 'email', 'province', 'city', 'status']])
        return response


admin.site.unregister(Group)
@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass
