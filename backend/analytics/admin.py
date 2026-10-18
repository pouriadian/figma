from django.contrib import admin
from common.admin import BrandModelAdmin
from .models import TrafficEvent


@admin.register(TrafficEvent)
class TrafficEventAdmin(BrandModelAdmin):
    list_display = ('kind', 'path', 'product', 'occurred_at')
    list_filter = ('kind', 'occurred_at')
    search_fields = ('path',)
    readonly_fields = ('kind', 'path', 'product', 'occurred_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
