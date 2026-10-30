from django.db import models
from uuid import uuid4
import re
from pathlib import Path
from django.core.exceptions import ValidationError
from django.utils import timezone
from common.models import TimestampedModel, SEOFields
from common.validators import validate_image, validate_public_document


def _product_photo_path(instance, filename):
    code = getattr(instance, 'sku', None) or getattr(getattr(instance, 'product', None), 'sku', None) or 'item'
    code = re.sub(r'[^a-zA-Z0-9_-]', '-', code).strip('-')[:45] or 'item'
    section = 'gallery' if hasattr(instance, 'product_id') else 'cover'
    extension = Path(filename).suffix.lower()
    if extension not in ('.jpg', '.jpeg', '.png', '.webp'):
        extension = '.jpg'
    return f'public/cms/pages/products/products-{section}-{code}-{uuid4().hex[:10]}{extension}'


def _texture_photo_path(instance, filename):
    code = re.sub(r'[^a-zA-Z0-9_-]', '-', getattr(instance, 'code', '') or 'texture').strip('-')[:45]
    extension = Path(filename).suffix.lower()
    if extension not in ('.jpg', '.jpeg', '.png', '.webp'):
        extension = '.jpg'
    return f'public/catalog/textures/{code or "texture"}-{uuid4().hex[:10]}{extension}'


class ProductCategory(TimestampedModel):
    name = models.CharField('دسته', max_length=100)
    slug = models.SlugField('نشانی', max_length=120, unique=True, allow_unicode=True)
    order = models.PositiveIntegerField('ترتیب', default=0)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'دسته محصول'
        verbose_name_plural = 'دسته‌های محصولات'

    def __str__(self):
        return self.name


class Product(TimestampedModel, SEOFields):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'پیش‌نویس'
        PUBLISHED = 'published', 'منتشرشده'
        ARCHIVED = 'archived', 'بایگانی'

    name = models.CharField('نام محصول', max_length=200)
    slug = models.SlugField('نشانی', max_length=200, unique=True, allow_unicode=True)
    sku = models.CharField('کد محصول', max_length=60, unique=True)
    model = models.CharField('مدل', max_length=120, blank=True)
    category = models.ForeignKey(ProductCategory, on_delete=models.PROTECT, related_name='products', verbose_name='دسته')
    dimensions = models.CharField('ابعاد', max_length=120, blank=True)
    description = models.TextField('توضیحات', blank=True)
    technical_specs = models.JSONField('مشخصات فنی (JSON)', default=dict, blank=True)
    # Preserve local original artwork without copying or altering assets.
    cover_asset = models.CharField('مسیر تصویر اصلی سایت', max_length=500, blank=True)
    cover_image = models.ImageField('تصویر جدید محصول', upload_to=_product_photo_path, blank=True, validators=[validate_image])
    catalog_pdf = models.FileField('کاتالوگ PDF', upload_to='public/catalogs/%Y/%m/', blank=True, validators=[validate_public_document])
    status = models.CharField('وضعیت انتشار', max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    featured = models.BooleanField('ویژه', default=False)
    sort_order = models.PositiveIntegerField('اولویت نمایش', default=0)
    view_count = models.PositiveIntegerField('تعداد بازدید', default=0, editable=False)
    published_at = models.DateTimeField('تاریخ انتشار', blank=True, null=True)

    class Meta:
        ordering = ['sort_order', '-published_at', '-created_at']
        verbose_name = 'محصول'
        verbose_name_plural = 'محصولات'
        indexes = [models.Index(fields=['status', 'featured'])]

    def __str__(self):
        return f'{self.name} — {self.sku}'

    def clean(self):
        super().clean()
        if self.status == self.Status.PUBLISHED and not (self.cover_asset or self.cover_image):
            raise ValidationError({'cover_image': 'محصول منتشرشده به تصویر نیاز دارد.'})
        if self.cover_asset and not self.cover_asset.startswith('/assets/'):
            raise ValidationError({'cover_asset': 'فقط مسیر /assets/ از سایت اصلی مجاز است.'})

    def save(self, *args, **kwargs):
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def image_url(self):
        if self.cover_image:
            return '/uploads/' + self.cover_image.name.removeprefix('public/')
        return self.cover_asset

    @property
    def catalog_url(self):
        return '/uploads/' + self.catalog_pdf.name.removeprefix('public/') if self.catalog_pdf else ''


class Texture(TimestampedModel, SEOFields):
    name = models.CharField('نام بافت', max_length=160)
    slug = models.SlugField('نشانی', max_length=180, unique=True, allow_unicode=True)
    code = models.CharField('کد بافت', max_length=60, unique=True)
    category = models.CharField('دسته‌بندی', max_length=100, blank=True)
    description = models.TextField('توضیحات', blank=True)
    technical_specs = models.JSONField('مشخصات فنی', default=dict, blank=True)
    image = models.ImageField('تصویر بافت', upload_to=_texture_photo_path, blank=True, validators=[validate_image])
    products = models.ManyToManyField(Product, related_name='textures', blank=True, verbose_name='محصولات سازگار')
    is_published = models.BooleanField('نمایش در سایت', default=False, db_index=True)

    class Meta:
        ordering = ['name', 'code']
        verbose_name = 'بافت'
        verbose_name_plural = 'بافت‌ها'

    def __str__(self):
        return f'{self.name} — {self.code}'

    @property
    def image_url(self):
        return '/uploads/' + self.image.name.removeprefix('public/') if self.image else ''


class ProductImage(TimestampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images', verbose_name='محصول')
    image = models.ImageField('تصویر', upload_to=_product_photo_path, validators=[validate_image])
    caption = models.CharField('توضیح تصویر', max_length=200, blank=True)
    sort_order = models.PositiveIntegerField('ترتیب', default=0)

    class Meta:
        ordering = ['sort_order', 'id']
        verbose_name = 'تصویر محصول'
        verbose_name_plural = 'تصاویر محصولات'

    def __str__(self):
        return self.caption or self.product.name
