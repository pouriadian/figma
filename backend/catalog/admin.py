from django.contrib import admin, messages
from django.utils import timezone
from django.conf import settings
from django.utils.html import format_html
from django.contrib.admin import TabularInline
from common.admin import BrandModelAdmin
from .models import Product, ProductCategory, ProductImage


@admin.register(ProductCategory)
class ProductCategoryAdmin(BrandModelAdmin):
    list_display = ('name', 'slug', 'order')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)


class ProductImageInline(TabularInline):
    model = ProductImage
    extra = 0
    fields = ('image', 'caption', 'sort_order')


@admin.register(Product)
class ProductAdmin(BrandModelAdmin):
    list_display = ('thumbnail', 'name', 'sku', 'category', 'status', 'featured', 'view_count', 'published_at')
    list_filter = ('status', 'featured', 'category')
    search_fields = ('name', 'sku', 'model', 'slug')
    list_editable = ('featured',)
    readonly_fields = ('view_count', 'published_at', 'created_at', 'updated_at')
    autocomplete_fields = ('category',)
    prepopulated_fields = {'slug': ('name',)}
    inlines = (ProductImageInline,)
    actions = ('publish_selected', 'archive_selected')
    fieldsets = (
        ('اطلاعات محصول', {'fields': ('name', 'slug', 'sku', 'model', 'category', 'dimensions', 'description')}),
        ('مشخصات فنی پیشرفته', {'fields': ('technical_specs',), 'classes': ('collapse',)}),
        ('تصاویر و کاتالوگ', {'fields': ('cover_asset', 'cover_image', 'catalog_pdf')}),
        ('انتشار', {'fields': ('status', 'featured', 'sort_order', 'published_at', 'view_count')}),
        ('SEO', {'fields': ('seo_title', 'seo_description', 'canonical_url'), 'classes': ('collapse',)}),
        ('سیستم', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    @admin.display(description='پیش‌نمایش')
    def thumbnail(self, obj):
        if not obj.image_url:
            return '—'
        src = obj.image_url
        if src.startswith('/'):
            src = settings.FRONTEND_PUBLIC_URL.rstrip('/') + src
        return format_html('<img src="{}" width="48" height="48" style="object-fit:cover;border-radius:10px"/>', src)

    @admin.action(description='انتشار محصولات انتخاب‌شده')
    def publish_selected(self, request, queryset):
        valid = queryset.exclude(cover_asset='').exclude(cover_asset__isnull=True)
        uploaded = queryset.exclude(cover_image='').exclude(cover_image__isnull=True)
        eligible_ids = set(valid.values_list('pk', flat=True)) | set(uploaded.values_list('pk', flat=True))
        count = queryset.filter(pk__in=eligible_ids).update(status=Product.Status.PUBLISHED, published_at=timezone.now())
        skipped = queryset.count() - count
        if count:
            self.message_user(request, f'{count} محصول منتشر شد.', messages.SUCCESS)
        if skipped:
            self.message_user(request, f'{skipped} محصول بدون تصویر منتشر نشد.', messages.WARNING)

    @admin.action(description='بایگانی محصولات انتخاب‌شده')
    def archive_selected(self, request, queryset):
        queryset.update(status=Product.Status.ARCHIVED)
