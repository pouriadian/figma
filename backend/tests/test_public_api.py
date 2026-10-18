from django.test import TestCase, override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from catalog.models import Product, ProductCategory
from crm.models import Inquiry, JobApplication
from accounts.models import Representative
from communications.models import Announcement, Delivery
from analytics.models import TrafficEvent


class PublicApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.cat = ProductCategory.objects.create(name='Clean', slug='clean')
        self.product = Product.objects.create(name='Sample', slug='sample', sku='100', category=self.cat, status='published', cover_asset='/assets/products/textures/texture-1.webp')
        Product.objects.create(name='Private', slug='hidden', sku='101', category=self.cat, status='draft')

    def test_only_published_products_visible(self):
        response = self.client.get('/api/v1/products/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['image'], '/assets/products/textures/texture-1.webp')
        self.assertEqual(self.client.get('/api/v1/products/hidden/').status_code, 404)

    def test_inquiry_creates_tracking_without_pii_leak(self):
        response = self.client.post('/api/v1/inquiries/', {'kind': 'quote', 'product': self.product.id, 'full_name': 'Test User', 'phone': '09123456789', 'message': 'Please provide pricing details'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        code = response.data['tracking_code']
        tracking = self.client.get('/api/v1/track/' + code + '/')
        self.assertEqual(tracking.status_code, 200)
        self.assertNotIn('phone', tracking.data)
        self.assertNotIn('message', tracking.data)

    def test_inquiry_requires_contact(self):
        response = self.client.post('/api/v1/inquiries/', {'kind': 'contact', 'full_name': 'Anonymous', 'message': 'A sufficiently long message'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_anonymous_cannot_view_dealer_portal(self):
        self.assertEqual(self.client.get('/api/v1/portal/me/').status_code, 401)

    def test_public_cannot_access_resume(self):
        self.assertNotEqual(self.client.get('/admin/resumes/1/download/').status_code, 200)

    def test_analytics_collects_only_nonidentifying_data(self):
        response = self.client.post('/api/v1/analytics/', {'kind': 'page_view', 'path': '/products'}, format='json')
        self.assertEqual(response.status_code, 204)
        self.assertEqual(TrafficEvent.objects.count(), 1)


class RepresentativeApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(email='rep@example.com', username='rep', password='LongSafePassword123', role='representative')
        self.other = User.objects.create_user(email='other@example.com', username='other', password='LongSafePassword123', role='representative')
        self.rep = Representative.objects.create(user=self.user, company_name='A', contact_name='A', city='Tehran', province='Tehran', phone='09121234567', status='active')
        self.other_rep = Representative.objects.create(user=self.other, company_name='B', contact_name='B', city='Tehran', province='Tehran', phone='09129876543', status='active')
        self.cat = ProductCategory.objects.create(name='Clean', slug='clean')
        self.product = Product.objects.create(name='A', slug='a', sku='10', category=self.cat, status='published')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_portal_restricts_representatives_to_own_inquiries(self):
        Inquiry.objects.create(kind='quote', representative=self.other_rep, product=self.product, full_name='B', phone='09129876543', message='Some private quote data')
        response = self.client.get('/api/v1/portal/inquiries/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 0)
        response = self.client.post('/api/v1/portal/inquiries/', {'kind': 'quote', 'product': self.product.id, 'message': 'Please send me a quote for this item'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Inquiry.objects.filter(representative=self.rep).count(), 1)

    def test_notifications_are_dealer_scoped(self):
        a = Announcement.objects.create(title='News', body='News body', audience='selected', channel='in_app')
        a.selected_representatives.add(self.rep)
        a.queue_deliveries()
        response = self.client.get('/api/v1/portal/notifications/')
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(Delivery.objects.count(), 1)
