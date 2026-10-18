"""Faromid v5.3: management route coverage and consistent traffic metrics."""
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from analytics.models import TrafficEvent
from catalog.models import Product, ProductCategory
from content.models import SitePage, SiteSection


@override_settings(SECURE_SSL_REDIRECT=False)
class PanelRouteTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_superuser(
            username='test-panel-admin', email='panel@example.com', password='LongPassword123!'
        )
        cls.category = ProductCategory.objects.create(name='Textures', slug='textures')
        cls.product = Product.objects.create(
            name='Texture 1', slug='texture-1', sku='7185', category=cls.category,
            cover_asset='/assets/products/textures/texture-1.webp', status='published',
        )
        cls.page = SitePage.objects.create(key='home', name='خانه')
        cls.section = SiteSection.objects.create(page=cls.page, key='hero', name='بنر سایت')

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_manager_routes_have_no_404_or_500(self):
        urls = [
            'me/', 'dashboard/?days=30', 'categories/', 'products/',
            f'products/{self.product.pk}/', 'product-images/',
            'representatives/', 'inquiries/', 'applications/', 'media/',
            'content/', 'pages/', 'pages/home/', 'pages/home/seo/',
            'sections/?page_key=home', f'sections/{self.section.pk}/',
            'section-images/', 'announcements/', 'deliveries/', 'users/',
        ]
        for url in urls:
            with self.subTest(url=url):
                response = self.client.get('/api/v1/manage/'+url)
                self.assertEqual(response.status_code, 200, f'{url}: {response.status_code}, {response.content[:400]!r}')

    def test_page_seo_and_section_routes_are_writable(self):
        response = self.client.patch('/api/v1/manage/pages/home/seo/', {'seo_title':'مدیریت ساده'}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        section = self.client.post('/api/v1/manage/sections/', {
            'page': self.page.pk, 'key':'features', 'name':'مزایای ما',
            'kind':'text', 'draft_enabled':True,
        }, format='json')
        self.assertEqual(section.status_code, 201, section.content)
        publish = self.client.post('/api/v1/manage/sections/'+str(section.data['id'])+'/publish/', {}, format='json')
        self.assertEqual(publish.status_code, 200, publish.content)

    def test_product_get_does_not_increment_views(self):
        for _ in range(3):
            response = self.client.get('/api/v1/products/texture-1/')
            self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.view_count, 0)
        result = self.client.get(f'/api/v1/manage/products/{self.product.pk}/')
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(result.data['view_count'], 0)
        event = self.client.post('/api/v1/analytics/', {
            'kind':'product_view','product':self.product.pk,'path':'/products/texture-1'
        }, format='json')
        self.assertEqual(event.status_code, 204, event.content)
        self.assertEqual(TrafficEvent.objects.filter(kind='product_view',product=self.product).count(), 1)
        result = self.client.get(f'/api/v1/manage/products/{self.product.pk}/')
        self.assertEqual(result.data['view_count'], 1)
        report = self.client.get('/api/v1/manage/dashboard/?days=7')
        self.assertEqual(report.status_code, 200, report.content)
        self.assertEqual(report.data['product_series'][0]['views'], 1)

    def test_panel_visit_does_not_count_as_public_traffic(self):
        rejected = self.client.post('/api/v1/analytics/', {
            'kind':'page_view', 'path':'/panel/products',
        }, format='json')
        self.assertEqual(rejected.status_code, 400)
        accepted = self.client.post('/api/v1/analytics/', {
            'kind':'page_view', 'path':'/products',
        }, format='json')
        self.assertEqual(accepted.status_code, 204, accepted.content)

    def test_staff_required_for_management(self):
        guest = APIClient()
        for path in ['dashboard/', 'users/', 'pages/home/seo/', 'sections/']:
            with self.subTest(path=path):
                self.assertIn(guest.get('/api/v1/manage/'+path).status_code, [401,403])
