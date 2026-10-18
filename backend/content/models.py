from django.db import models
import re
from pathlib import Path
from uuid import uuid4
from django.utils import timezone
from common.models import TimestampedModel, SEOFields
from common.validators import validate_image


def _content_cover_upload_path(instance, filename):
    # Only newly added files move to page-oriented CMS storage.
    return _cms_upload_name(getattr(instance, 'kind', 'content'), 'cover', filename)


def _content_gallery_upload_path(instance, filename):
    return _cms_upload_name(getattr(instance.entry, 'kind', 'content'), 'gallery', filename)


class ContentEntry(TimestampedModel, SEOFields):
    class Kind(models.TextChoices):
        GALLERY = 'gallery', 'گالری تصاویر'
        PROJECT = 'project', 'پروژه اجراشده'
        NEWS = 'news', 'اخبار'
        EXHIBITION = 'exhibition', 'نمایشگاه'
        PAGE = 'page', 'صفحه مستقل'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'پیش‌نویس'
        PUBLISHED = 'published', 'منتشرشده'

    kind = models.CharField('نوع محتوا', max_length=14, choices=Kind.choices, db_index=True)
    title = models.CharField('عنوان', max_length=220)
    slug = models.SlugField('نشانی', max_length=220, unique=True, allow_unicode=True)
    summary = models.TextField('خلاصه', blank=True)
    body = models.TextField('متن', blank=True)
    existing_asset = models.CharField('تصویر اصلی سایت', max_length=500, blank=True)
    cover_image = models.ImageField('تصویر جدید', upload_to=_content_cover_upload_path, blank=True, validators=[validate_image])
    status = models.CharField('وضعیت', max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    event_date = models.DateField('تاریخ رویداد', null=True, blank=True)
    sort_order = models.PositiveIntegerField('اولویت', default=0)
    published_at = models.DateTimeField('تاریخ انتشار', blank=True, null=True)
    show_on_home = models.BooleanField('نمایش در خانه', default=False)

    class Meta:
        ordering = ['sort_order', '-published_at']
        verbose_name = 'محتوای سایت'
        verbose_name_plural = 'محتوای سایت (CMS)'
        indexes = [models.Index(fields=['kind', 'status'])]

    def save(self, *args, **kwargs):
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def image_url(self):
        return '/uploads/' + self.cover_image.name.removeprefix('public/') if self.cover_image else self.existing_asset

    def __str__(self):
        return f'{self.get_kind_display()}: {self.title}'


class ContentImage(TimestampedModel):
    entry = models.ForeignKey(ContentEntry, on_delete=models.CASCADE, related_name='images', verbose_name='محتوا')
    image = models.ImageField('تصویر', upload_to=_content_gallery_upload_path, validators=[validate_image])
    caption = models.CharField('شرح', max_length=150, blank=True)
    order = models.PositiveIntegerField('ترتیب', default=0)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'تصویر محتوا'
        verbose_name_plural = 'تصاویر محتوایی'


class PageSEO(TimestampedModel, SEOFields):
    path = models.CharField('مسیر صفحه مانند /contact', max_length=180, unique=True)
    title = models.CharField('عنوان صفحه', max_length=180)
    description = models.CharField('توضیحات صفحه', max_length=320, blank=True)
    indexable = models.BooleanField('اجازه ایندکس شدن', default=True)

    class Meta:
        verbose_name = 'تنظیمات سئوی صفحه'
        verbose_name_plural = 'SEO صفحات ثابت'

    def __str__(self):
        return self.path


# Page-based CMS: saves draft fields separately from immutable published snapshots.
# Legacy ContentEntry news/project/gallery records remain untouched.
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.conf import settings


def _safe_asset_path(path):
    if not path:
        return ''
    if not path.startswith('/assets/') or '..' in path or '\\' in path or '?' in path or '#' in path:
        raise ValidationError('Only original /assets/ paths are allowed.')
    if not path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.svg')):
        raise ValidationError('Unsupported original image format.')
    return path


def _public_file_url(field_file):
    if not field_file:
        return ''
    return '/uploads/' + field_file.name.removeprefix('public/')


def _safe_segment(value, fallback='general'):
    value = str(value or '').lower()
    value = re.sub(r'[^a-z0-9_-]+', '-', value).strip('-_')[:45]
    return value or fallback


def _cms_upload_name(page_key, section_key, filename):
    page = _safe_segment(page_key)
    section = _safe_segment(section_key, 'image')
    extension = Path(filename).suffix.lower()
    if extension not in ('.png', '.jpg', '.jpeg', '.webp'):
        extension = '.jpg'
    return f'public/cms/pages/{page}/{page}-{section}-{uuid4().hex[:12]}{extension}'


def _library_upload_path(instance, filename):
    category = (instance.category or 'shared').split(':', 1)
    return _cms_upload_name(category[0], category[1] if len(category) == 2 else 'image', filename)


def _section_upload_path(instance, filename):
    return _cms_upload_name(instance.page.key, instance.key, filename)


def _gallery_upload_path(instance, filename):
    return _cms_upload_name(instance.section.page.key, instance.section.key + '-gallery', filename)


class MediaAsset(TimestampedModel):
    title = models.CharField(max_length=160)
    image = models.ImageField(upload_to=_library_upload_path, blank=True, validators=[validate_image])
    original_path = models.CharField(max_length=500, blank=True)
    alt_text = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=80, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Image library'
        verbose_name_plural = 'Media library'

    def clean(self):
        super().clean()
        if not self.image and not self.original_path:
            raise ValidationError('Choose an uploaded image or a preserved original asset.')
        _safe_asset_path(self.original_path)

    @property
    def url(self):
        return _public_file_url(self.image) or self.original_path

    def __str__(self):
        return self.title


class SitePage(TimestampedModel):
    key = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=140)
    description = models.CharField(max_length=300, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Website page'
        verbose_name_plural = 'Website pages'
        permissions = [('edit_site_pages', 'Can edit page-based CMS')]

    def __str__(self):
        return self.name


class SiteSection(TimestampedModel):
    class Kind(models.TextChoices):
        HERO = 'hero', 'Banner / Hero'
        TEXT = 'text', 'Text and image'
        GALLERY = 'gallery', 'Gallery'
        PRODUCTS = 'products', 'Featured products'
        CARDS = 'cards', 'Content cards'

    page = models.ForeignKey(SitePage, on_delete=models.CASCADE, related_name='sections')
    key = models.SlugField(max_length=80, validators=[RegexValidator(r'^[a-z0-9_-]+$')])
    name = models.CharField(max_length=150)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.TEXT)
    sort_order = models.PositiveIntegerField(default=0)
    draft_title = models.CharField(max_length=250, blank=True)
    draft_subtitle = models.CharField(max_length=250, blank=True)
    draft_body = models.TextField(blank=True)
    draft_image = models.ImageField(upload_to=_section_upload_path, blank=True, validators=[validate_image])
    draft_asset = models.ForeignKey(MediaAsset, on_delete=models.SET_NULL, blank=True, null=True, related_name='sections')
    draft_image_alt = models.CharField(max_length=200, blank=True)
    draft_link_label = models.CharField(max_length=100, blank=True)
    draft_link_url = models.CharField(max_length=250, blank=True)
    draft_products = models.ManyToManyField('catalog.Product', blank=True)
    draft_enabled = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    published_snapshot = models.JSONField(default=dict, blank=True)
    published_at = models.DateTimeField(blank=True, null=True)
    last_editor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True)

    class Meta:
        ordering = ['sort_order', 'id']
        constraints = [models.UniqueConstraint(fields=['page', 'key'], name='unique_page_cms_section')]
        verbose_name = 'Page section'
        verbose_name_plural = 'Page sections'

    def clean(self):
        super().clean()
        if self.draft_link_url and not (
            self.draft_link_url.startswith('/') and not self.draft_link_url.startswith('//') and '..' not in self.draft_link_url
        ) and not self.draft_link_url.startswith(('https://', 'http://')):
            raise ValidationError({'draft_link_url': 'Use a site URL beginning with / or an https:// URL.'})

    def publish(self, user=None):
        from bleach import clean
        from django.db import transaction
        allowed = ['p', 'div', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'blockquote', 'h2', 'h3']
        html = clean(self.draft_body, tags=allowed, attributes={'a': ['href', 'title', 'rel', 'target']}, protocols=['http', 'https', 'mailto'], strip=True)
        with transaction.atomic():
            snapshot = {
                'key': self.key, 'kind': self.kind, 'title': self.draft_title,
                'subtitle': self.draft_subtitle, 'body': html,
                'image': _public_file_url(self.draft_image) or (self.draft_asset.url if self.draft_asset_id else ''),
                'image_alt': self.draft_image_alt, 'link_label': self.draft_link_label,
                'link_url': self.draft_link_url, 'enabled': self.draft_enabled,
                'images': [{'url': item.url, 'caption': item.caption, 'alt': item.alt_text}
                           for item in self.images.select_related('library_asset').all() if item.url],
                'product_ids': list(self.draft_products.values_list('id', flat=True)),
                'sort_order': self.sort_order,
            }
            self.published_snapshot = snapshot
            self.is_published = True
            self.published_at = timezone.now()
            if user and user.is_authenticated:
                self.last_editor = user
            self.save(update_fields=['published_snapshot', 'is_published', 'published_at', 'last_editor', 'updated_at'])
        return snapshot

    def __str__(self):
        return f'{self.page.name} / {self.name}'


class SiteSectionImage(TimestampedModel):
    section = models.ForeignKey(SiteSection, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=_gallery_upload_path, blank=True, validators=[validate_image])
    library_asset = models.ForeignKey(MediaAsset, blank=True, null=True, on_delete=models.SET_NULL)
    caption = models.CharField(max_length=200, blank=True)
    alt_text = models.CharField(max_length=200, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']
        verbose_name = 'Section image'
        verbose_name_plural = 'Section images'

    @property
    def url(self):
        return _public_file_url(self.image) or (self.library_asset.url if self.library_asset_id else '')

    def clean(self):
        super().clean()
        if not self.image and not self.library_asset_id:
            raise ValidationError('Choose an uploaded image or an image from the media library.')

    def __str__(self):
        return self.caption or str(self.pk)
