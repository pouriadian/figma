from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.conf import settings
from django.contrib.admin import TabularInline
from common.admin import BrandModelAdmin
from .models import ContentEntry, ContentImage, PageSEO


class ContentImageInline(TabularInline):
    model = ContentImage
    extra = 0


@admin.register(ContentEntry)
class ContentEntryAdmin(BrandModelAdmin):
    list_display = ('preview', 'title', 'kind', 'status', 'show_on_home', 'published_at')
    list_filter = ('kind', 'status', 'show_on_home')
    list_editable = ('show_on_home',)
    search_fields = ('title', 'summary', 'slug')
    readonly_fields = ('created_at', 'updated_at', 'published_at')
    prepopulated_fields = {'slug': ('title',)}
    inlines = (ContentImageInline,)
    actions = ('publish_selected',)
    fieldsets = (
        ('اطلاعات و محتوا', {'fields': ('kind', 'title', 'slug', 'summary', 'body')}),
        ('تصاویر', {'fields': ('existing_asset', 'cover_image')}),
        ('انتشار', {'fields': ('status', 'published_at', 'event_date', 'show_on_home', 'sort_order')}),
        ('SEO', {'fields': ('seo_title', 'seo_description', 'canonical_url'), 'classes': ('collapse',)}),
        ('سیستم', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    @admin.display(description='تصویر')
    def preview(self, obj):
        if not obj.image_url:
            return '—'
        src = obj.image_url
        if src.startswith('/'):
            src = settings.FRONTEND_PUBLIC_URL.rstrip('/') + src
        return format_html('<img src="{}" width="54" height="54" style="object-fit:cover;border-radius:10px"/>', src)

    @admin.action(description='انتشار محتوای انتخاب‌شده')
    def publish_selected(self, request, queryset):
        queryset.update(status='published', published_at=timezone.now())


@admin.register(PageSEO)
class PageSEOAdmin(BrandModelAdmin):
    list_display = ('path', 'title', 'indexable', 'updated_at')
    list_editable = ('indexable',)
    search_fields = ('path', 'title')
    readonly_fields = ('created_at', 'updated_at')

# Dedicated, task-oriented CMS views are linked from the dashboard and page list.
from django.urls import reverse
from .models import SitePage, SiteSection, SiteSectionImage, MediaAsset


@admin.register(SitePage)
class SitePageAdmin(BrandModelAdmin):
    list_display = ('name', 'key', 'is_active', 'manage_link')
    list_display_links = ('name',)
    search_fields = ('name', 'key')
    readonly_fields = ('key', 'name', 'description', 'order', 'is_active')

    @admin.display(description='Page editor')
    def manage_link(self, obj):
        return format_html('<a href="{}">Edit page and sections</a>', reverse('cms-page-editor', args=[obj.key]))

    def has_add_permission(self, request):
        return False


@admin.register(MediaAsset)
class MediaAssetAdmin(BrandModelAdmin):
    list_display = ('thumb', 'title', 'category', 'created_at')
    search_fields = ('title', 'alt_text', 'category')

    @admin.display(description='Preview')
    def thumb(self, obj):
        src = obj.url
        if src.startswith('/assets/'):
            src = settings.FRONTEND_PUBLIC_URL.rstrip('/') + src
        return format_html('<img src="{}" width="64" height="44" style="object-fit:cover;border-radius:8px"/>', src) if src else '—'


@admin.register(SiteSection)
class SiteSectionAdmin(BrandModelAdmin):
    list_display = ('name', 'page', 'kind', 'is_published', 'updated_at')
    list_filter = ('page', 'kind', 'is_published')

    def has_add_permission(self, request):
        return False

    def get_model_perms(self, request):
        # Keep admin navigation simple: use the friendly per-page editor instead.
        return {}


@admin.register(SiteSectionImage)
class SiteSectionImageAdmin(BrandModelAdmin):
    list_display = ('section', 'caption', 'sort_order')

    def get_model_perms(self, request):
        return {}
