"""Idempotently register original frontend assets, without modifying source images."""
from django.core.management.base import BaseCommand
from catalog.models import Product, ProductCategory
from content.models import ContentEntry, PageSEO

GALLERY = [
    ('G2LAB | Monalia Hotel', '/assets/home/b9b8b19e05859645385b0b841d5112546ac6d38e.webp'),
    ('Studio Arketo | Ristorante ExMahalo', '/assets/home/784e31d97a69752e46d950511d73fe486e26d3d4.webp'),
    ('دکوراسیون داخلی مدرن', '/assets/home/952e714f21d848a4f43100af707fad703479183e.webp'),
    ('پروژه‌های معماری فرامید', '/assets/home/54599740ae5947f5499c6cec10768e77c692aa33.webp'),
    ('اجرای دکوراسیون', '/assets/home/f670a0b2f7a85da7fe936c86d1d26d5c31e7c572.webp'),
    ('طراحی فضای زندگی', '/assets/gallery/7d5fd5f606bf882f577d870419f52b8fc626ed5a.webp'),
]
EXHIBITIONS = [
    '/assets/exhibitions/d3471a4c64b8364bc7e69f6a4be31cb250fbc1e3.webp',
    '/assets/exhibitions/4d338e36137dea36205711558bd7212be01f44d2.webp',
    '/assets/exhibitions/91a3610d005c0b4a09a25ced43838bb6537d7110.webp',
    '/assets/exhibitions/538c69fc2bc47c721bb0e223c7c601e0381362a4.webp',
]


class Command(BaseCommand):
    help = 'ایجاد ۱۲ محصول اولیه و محتوای گالری با اشاره به تصاویر موجود Frontend؛ بدون تغییر فایل‌ها'

    def handle(self, *args, **options):
        category, _ = ProductCategory.objects.get_or_create(slug='clean-touch', defaults={'name': 'کلین تاچ'})
        for index in range(12):
            code = str(7185 + index)
            Product.objects.get_or_create(sku=code, defaults={
                'name': 'کلین تاچ', 'slug': f'product-{index+1}',
                'model': 'CLEAN TOUCH', 'category': category, 'dimensions': '121 × 228',
                'cover_asset': f'/assets/products/textures/texture-{index%8+1}.webp',
                'featured': index < 8, 'status': 'published', 'sort_order': index,
            })
        for idx, (title, image) in enumerate(GALLERY, start=1):
            ContentEntry.objects.get_or_create(slug=f'gallery-{idx}', defaults={
                'title': title, 'kind': 'gallery', 'existing_asset': image,
                'status': 'published', 'sort_order': idx, 'show_on_home': True,
            })
        for idx, image in enumerate(EXHIBITIONS, start=1):
            ContentEntry.objects.get_or_create(slug=f'exhibition-{idx}', defaults={
                'title': f'تصاویر نمایشگاه {idx}', 'kind': 'exhibition',
                'existing_asset': image, 'status': 'published', 'sort_order': idx,
            })
        seo = {
            '/': ('فرامید | گروه تولیدی فرامید', 'تولید MDF و محصولات دکوراسیون داخلی فرامید'),
            '/about': ('درباره فرامید', 'درباره گروه فرامید'),
            '/products': ('محصولات فرامید', 'کاتالوگ MDF فرامید'),
            '/textures': ('بافت‌های فرامید', 'بافت و تکسچر محصولات'),
            '/gallery': ('گالری فرامید', 'تصاویر و پروژه‌های فرامید'),
            '/exhibitions': ('نمایشگاه‌های فرامید', 'نمایشگاه‌های فرامید'),
            '/careers': ('همکاری با فرامید', 'فرصت‌های همکاری'),
            '/dealership': ('اخذ نمایندگی', 'شرایط دریافت نمایندگی'),
            '/contact': ('تماس با فرامید', 'اطلاعات ارتباط با فرامید'),
        }
        for path, (title, description) in seo.items():
            PageSEO.objects.get_or_create(path=path, defaults={'title': title, 'description': description})
        self.stdout.write(self.style.SUCCESS('Seeded 12 products, 10 images and default SEO records.'))
