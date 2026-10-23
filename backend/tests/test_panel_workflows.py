"""End-to-end API workflows used by the Next.js staff panel."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import Representative
from catalog.models import Product, ProductCategory
from communications.models import Announcement, Delivery
from content.models import SitePage, SiteSection
from crm.models import Inquiry, InquiryStatusHistory


class AdminPanelWorkflowTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.admin = User.objects.create_superuser(
            username='panel-workflow-admin',
            email='panel-workflow@example.test',
            password='LongSecurePassword123!',
        )
        cls.category = ProductCategory.objects.create(name='آنتی فینگر', slug='anti-finger')
        cls.product = Product.objects.create(
            name='محصول آزمایشی', slug='panel-test-product', sku='PANEL-001',
            category=cls.category, status=Product.Status.PUBLISHED,
            cover_asset='/assets/products/test.webp',
        )
        cls.page = SitePage.objects.create(key='home', name='صفحه اصلی')
        cls.section = SiteSection.objects.create(page=cls.page, key='hero', name='بنر اصلی')
        cls.representative = Representative.objects.create(
            company_name='نماینده آزمایشی', contact_name='مسئول', phone='09120000001',
            city='تهران', province='تهران', status=Representative.Status.ACTIVE,
        )
        cls.inquiry = Inquiry.objects.create(
            kind=Inquiry.Kind.CONTACT, full_name='مراجع آزمایشی', phone='09120000002',
            message='درخواست پیگیری آزمایشی',
        )

    def setUp(self):
        self.client.force_authenticate(user=self.admin)

    def test_all_panel_navigation_data_endpoints_return_success(self):
        urls = [
            '/api/v1/manage/me/',
            '/api/v1/manage/dashboard/?days=7',
            '/api/v1/manage/categories/',
            '/api/v1/manage/products/',
            f'/api/v1/manage/products/{self.product.pk}/',
            f'/api/v1/manage/product-images/?product={self.product.pk}',
            '/api/v1/manage/representatives/',
            '/api/v1/manage/representatives/summary/',
            '/api/v1/manage/inquiries/',
            '/api/v1/manage/applications/',
            '/api/v1/manage/media/',
            '/api/v1/manage/content/',
            '/api/v1/manage/pages/',
            '/api/v1/manage/pages/home/',
            '/api/v1/manage/pages/home/seo/',
            '/api/v1/manage/sections/?page_key=home',
            f'/api/v1/manage/sections/{self.section.pk}/',
            '/api/v1/manage/section-images/',
            '/api/v1/manage/announcements/',
            '/api/v1/manage/deliveries/',
            '/api/v1/manage/users/',
        ]
        for url in urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200, response.content[:300])

    def test_category_and_content_create_edit_actions(self):
        created_category = self.client.post('/api/v1/manage/categories/', {
            'name': 'دسته تازه', 'slug': 'new-category', 'order': 2,
        }, format='json')
        self.assertEqual(created_category.status_code, 201, created_category.data)
        changed_category = self.client.patch(
            f"/api/v1/manage/categories/{created_category.data['id']}/",
            {'name': 'دسته ویرایش‌شده'}, format='json',
        )
        self.assertEqual(changed_category.status_code, 200, changed_category.data)
        self.assertEqual(changed_category.data['name'], 'دسته ویرایش‌شده')

        created_entry = self.client.post('/api/v1/manage/content/', {
            'kind': 'gallery', 'title': 'گالری پنل', 'slug': 'panel-gallery',
            'summary': 'محتوای آزمایشی', 'status': 'draft',
        }, format='json')
        self.assertEqual(created_entry.status_code, 201, created_entry.data)
        changed_entry = self.client.patch(
            f"/api/v1/manage/content/{created_entry.data['id']}/",
            {'title': 'گالری ویرایش‌شده'}, format='json',
        )
        self.assertEqual(changed_entry.status_code, 200, changed_entry.data)
        self.assertEqual(changed_entry.data['title'], 'گالری ویرایش‌شده')

    def test_inquiry_status_button_records_audit_history(self):
        response = self.client.patch(
            f'/api/v1/manage/inquiries/{self.inquiry.pk}/',
            {'status': Inquiry.Status.IN_PROGRESS, 'internal_note': 'پیگیری شد'},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.inquiry.refresh_from_db()
        self.assertEqual(self.inquiry.status, Inquiry.Status.IN_PROGRESS)
        self.assertEqual(InquiryStatusHistory.objects.filter(inquiry=self.inquiry).count(), 1)

    def test_queue_announcement_button_creates_delivery_records(self):
        created = self.client.post('/api/v1/manage/announcements/', {
            'title': 'آزمایش پنل', 'body': 'متن اطلاعیه آزمایشی',
            'audience': Announcement.Audience.ACTIVE,
            'channel': Announcement.Channel.IN_APP,
        }, format='json')
        self.assertEqual(created.status_code, 201, created.data)

        preview = self.client.post(
            f"/api/v1/manage/announcements/{created.data['id']}/preview/", {}, format='json'
        )
        self.assertEqual(preview.status_code, 200, preview.data)
        queued = self.client.post(
            f"/api/v1/manage/announcements/{created.data['id']}/queue/",
            {'preview_hash': preview.data['preview_hash']}, format='json'
        )
        self.assertEqual(queued.status_code, 200, queued.data)
        self.assertEqual(queued.data['status'], Announcement.State.QUEUED)
        self.assertTrue(Delivery.objects.filter(
            announcement_id=created.data['id'], representative=self.representative,
        ).exists())

    def test_staff_login_and_logout_boundary_permissions(self):
        anonymous = self.client_class()
        for url in (
            '/api/v1/manage/me/', '/api/v1/manage/dashboard/',
            '/api/v1/manage/products/', '/api/v1/manage/pages/',
        ):
            with self.subTest(url=url):
                self.assertIn(anonymous.get(url).status_code, (401, 403))

        non_staff = get_user_model().objects.create_user(
            username='panel-workflow-customer', email='customer@example.test',
            password='LongSecurePassword123!',
        )
        self.client.force_authenticate(user=non_staff)
        for url in ('/api/v1/manage/dashboard/', '/api/v1/manage/products/', '/api/v1/manage/pages/'):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 403)
