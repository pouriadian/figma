"""Regression tests for the v5.5 homepage CMS and real category metadata."""
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from catalog.models import Product, ProductCategory
from content.models import SitePage, SiteSection


class HomeCMSV55Tests(TestCase):
    def test_home_marquee_is_editable_and_seed_is_idempotent(self):
        call_command('seed_site_pages', verbosity=0)
        page = SitePage.objects.get(key='home')
        marquee = SiteSection.objects.get(page=page, key='marquee')
        self.assertEqual(marquee.name, 'نوار متحرک برند')
        before = SiteSection.objects.count()
        call_command('seed_site_pages', verbosity=0)
        self.assertEqual(SiteSection.objects.count(), before)

    def test_marquee_publishes_only_after_explicit_publish(self):
        call_command('seed_site_pages', verbosity=0)
        marquee = SiteSection.objects.get(page__key='home', key='marquee')
        marquee.draft_body = 'MATERIAL DESIGN\nCLEAN TOUCH\nFAROMID'
        marquee.save(update_fields=['draft_body'])
        public = APIClient()
        url = '/api/v1/site-pages/home/'
        self.assertNotIn('marquee', [x['key'] for x in public.get(url).data['sections']])
        marquee.publish()
        result = public.get(url)
        self.assertEqual(result.status_code, 200)
        snapshots = [x for x in result.data['sections'] if x['key'] == 'marquee']
        self.assertEqual(len(snapshots), 1)
        self.assertIn('CLEAN TOUCH', snapshots[0]['body'])
        marquee.draft_body = 'DRAFT ONLY'
        marquee.save(update_fields=['draft_body'])
        self.assertNotIn('DRAFT ONLY', str(public.get(url).data))

    def test_published_marquee_can_be_hidden(self):
        call_command('seed_site_pages', verbosity=0)
        marquee = SiteSection.objects.get(page__key='home', key='marquee')
        marquee.draft_enabled = False
        marquee.save(update_fields=['draft_enabled'])
        marquee.publish()
        item = next(x for x in APIClient().get('/api/v1/site-pages/home/').data['sections'] if x['key'] == 'marquee')
        self.assertFalse(item['enabled'])


class CategoryFilterV55Tests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cat_a = ProductCategory.objects.create(name='دسته تست اول', slug='test-category-a')
        self.cat_b = ProductCategory.objects.create(name='دسته تست دوم', slug='test-category-b')
        self.product_a = Product.objects.create(
            name='محصول اول', slug='v55-product-a', sku='V55-A', category=self.cat_a,
            cover_asset='/assets/products/textures/texture-1.webp', status=Product.Status.PUBLISHED,
            technical_specs={'رنگ': 'مشکی', 'بافت': 'مات'},
        )
        Product.objects.create(
            name='محصول دوم', slug='v55-product-b', sku='V55-B', category=self.cat_b,
            cover_asset='/assets/products/textures/texture-2.webp', status=Product.Status.PUBLISHED,
        )
        Product.objects.create(
            name='پیش نویس', slug='v55-draft', sku='V55-C', category=self.cat_a,
            status=Product.Status.DRAFT,
        )

    def test_category_api_reports_actual_database_categories(self):
        response = self.client.get('/api/v1/categories/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual({c['slug'] for c in response.data}, {'test-category-a', 'test-category-b'})

    def test_product_filters_by_category_and_exposes_slug(self):
        response = self.client.get('/api/v1/products/?category=test-category-a')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        item = response.data['results'][0]
        self.assertEqual(item['category_slug'], 'test-category-a')
        self.assertEqual(item['technical_specs']['رنگ'], 'مشکی')
        self.assertEqual(item['href'], '/products/v55-product-a')
        self.assertEqual(self.client.get('/api/v1/products/v55-draft/').status_code, 404)
