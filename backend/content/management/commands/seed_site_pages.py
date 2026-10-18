"""Create a friendly page/section structure without publishing or overwriting any content."""
from django.core.management.base import BaseCommand
from pathlib import Path
from content.models import SitePage, SiteSection, MediaAsset

PAGES = [
    ('home', 'صفحه اصلی', [
        ('hero', 'بنر اصلی', 'hero'),
        ('marquee', 'نوار متحرک برند', 'text'),
        ('featured', 'محصولات ویژه', 'products'),
        ('gallery', 'گالری صفحه اصلی', 'gallery'),
        ('values', 'ارزش‌های سازمانی', 'text'),
        ('about', 'معرفی شرکت', 'text'),
        ('samples', 'سمپل‌ها', 'gallery'),
    ]),
    ('products', 'محصولات', [('hero', 'بنر محصولات', 'hero'), ('featured', 'محصولات ویژه', 'products'), ('gallery', 'تکسچر محصولات', 'gallery')]),
    ('about', 'درباره ما', [('hero', 'بنر درباره ما', 'hero'), ('intro', 'معرفی شرکت', 'text')]),
    ('contact', 'تماس با ما', [('hero', 'عنوان صفحه تماس', 'hero'), ('details', 'اطلاعات تماس', 'text')]),
    ('gallery', 'گالری تصاویر', [('hero', 'عنوان گالری', 'hero'), ('gallery', 'تصاویر گالری', 'gallery')]),
    ('exhibitions', 'نمایشگاه‌ها', [('hero', 'عنوان نمایشگاه', 'hero'), ('gallery', 'تصاویر نمایشگاه', 'gallery')]),
    ('textures', 'بافت و تکسچر', [('hero', 'عنوان تکسچر', 'hero'), ('gallery', 'گالری تکسچر', 'gallery')]),
    ('careers', 'استخدام و همکاری', [('hero', 'بنر استخدام', 'hero'), ('intro', 'توضیحات استخدام', 'text')]),
    ('dealership', 'اخذ نمایندگی', [('hero', 'بنر نمایندگی', 'hero'), ('intro', 'توضیحات نمایندگی', 'text')]),
    ('collaboration', 'همکاری سازمانی', [('hero', 'بنر همکاری', 'hero'), ('intro', 'توضیحات همکاری', 'text')]),
    ('pages', 'سایر مطالب', [('hero', 'عنوان مطالب', 'hero')]),
    ('news', 'اخبار', [('hero', 'عنوان اخبار', 'hero')]),
    ('projects', 'پروژه‌ها', [('hero', 'عنوان پروژه‌ها', 'hero')]),
]


class Command(BaseCommand):
    help = 'Create all site pages and their editable sections, leaving existing published data untouched.'

    def handle(self, *args, **options):
        page_count = 0
        section_count = 0
        for order, (key, name, sections) in enumerate(PAGES):
            page, created = SitePage.objects.get_or_create(key=key, defaults={'name': name, 'order': order * 10})
            page_count += int(created)
            for position, (section_key, section_name, kind) in enumerate(sections):
                _, created = SiteSection.objects.get_or_create(page=page, key=section_key, defaults={
                    'name': section_name, 'kind': kind, 'sort_order': position * 10,
                })
                section_count += int(created)
        # Expose existing frontend artwork as selectable media, without changing bytes.
        assets_root = Path(__file__).resolve().parents[4] / 'frontend' / 'public' / 'assets'
        added_assets = 0
        if assets_root.is_dir():
            for item in assets_root.rglob('*'):
                if item.is_file() and item.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp', '.svg'):
                    rel = item.relative_to(assets_root).as_posix()
                    url = '/assets/' + rel
                    _, created = MediaAsset.objects.get_or_create(original_path=url, defaults={
                        'title': 'تصویر اصلی سایت / ' + rel.replace('_', ' ')[:110],
                        'alt_text': item.stem[:160],
                        'category': rel.split('/')[0],
                    })
                    added_assets += int(created)
        self.stdout.write(self.style.SUCCESS(f'Created {page_count} pages, {section_count} sections, and {added_assets} media references. Existing edits preserved.'))
