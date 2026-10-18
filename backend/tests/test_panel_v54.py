"""Faromid 5.4 regressions: visual CMS, media organization, public list and import."""
from io import BytesIO
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from openpyxl import Workbook
from accounts.models import Representative
from partners.models import RepresentativeProfile
from content.models import SitePage, SiteSection, _cms_upload_name
from catalog.models import _product_photo_path
from communications.models import Announcement, Delivery


class AdminV54Tests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_superuser(
            username='v54', email='v54@test.local', password='LongTestPassword123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_page_key_does_not_conflict_with_pagination(self):
        home = SitePage.objects.create(key='home', name='خانه')
        other = SitePage.objects.create(key='about', name='درباره')
        section = SiteSection.objects.create(page=home, key='hero', name='Hero')
        SiteSection.objects.create(page=other, key='hero', name='About Hero')
        res = self.client.get('/api/v1/manage/sections/?page_key=home&page_size=100')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual([x['id'] for x in res.data['results']], [section.pk])

    def test_all_media_routes_exists(self):
        res = self.client.get('/api/v1/manage/media/?page_key=home')
        self.assertEqual(res.status_code, 200, res.content)
        res = self.client.get('/api/v1/manage/media/?page_key=invalid!')
        self.assertEqual(res.status_code, 400)

    def test_new_filenames_group_by_page_and_section(self):
        name = _cms_upload_name('home', 'hero', 'photo.webp')
        self.assertTrue(name.startswith('public/cms/pages/home/home-hero-'))
        self.assertTrue(name.endswith('.webp'))
        self.assertNotIn('..', name)
        name2 = _product_photo_path(type('Product', (), {'sku':'7185'})(), 'cover.jpg')
        self.assertIn('/products/products-cover-7185-', name2)

    def test_public_representatives_are_approved_and_redacted(self):
        rep = Representative.objects.create(
            company_name='Approved Test Partner', contact_name='Person',
            phone='09121111111', province='تهران', city='تهران'
        )
        public = APIClient()
        self.assertEqual(public.get('/api/v1/representatives/').data['count'], 0)
        bad = self.client.patch(f'/api/v1/manage/representatives/{rep.pk}/',{'is_public':True},format='json')
        self.assertEqual(bad.status_code, 400)
        good = self.client.patch(f'/api/v1/manage/representatives/{rep.pk}/',
                                 {'is_public':True,'status':'active','last_month_sales':'55000000',
                                  'performance_score':84},format='json')
        self.assertEqual(good.status_code, 200, good.content)
        result = public.get('/api/v1/representatives/')
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(result.data['count'], 1)
        exposed = result.data['results'][0]
        self.assertEqual(set(exposed), {'id','company_name','province','city'})
        self.assertNotIn('09121111111', str(result.data))
        report = self.client.get('/api/v1/manage/representatives/summary/')
        self.assertEqual(report.data['last_month_sales_total'], '55000000')
        self.assertEqual(report.data['average_score'], 84)
        self.assertEqual(report.data['public'], 1)
        # Disabling a partnership automatically makes it non-public.
        changed = self.client.patch(f'/api/v1/manage/representatives/{rep.pk}/',{'status':'suspended', 'is_public':True},format='json')
        self.assertEqual(changed.status_code, 200, changed.content)
        self.assertEqual(public.get('/api/v1/representatives/').data['count'],0)

    def test_excel_preview_then_confirm_is_not_auto_published(self):
        def workbook():
            book=Workbook();sheet=book.active
            sheet.append(['لیست نمایندگان', None, None]); sheet.append(['ردیف','نام مشتری','تلفن'])
            sheet.append([1,'Demo Contact','09120000001'])
            sheet.append([2,'Duplicated','09120000001'])
            sheet.append([3,'Invalid','123'])
            mem=BytesIO();book.save(mem);return mem.getvalue()
        def upload(apply):
            return self.client.post('/api/v1/manage/representatives/import-excel/',{
                'file':SimpleUploadedFile('test.xlsx',workbook(),content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                'apply':'true' if apply else 'false',
            },format='multipart')
        preview = upload(False)
        self.assertEqual(preview.status_code,200,preview.content)
        self.assertEqual(preview.data['summary']['valid'],1)
        self.assertEqual(preview.data['summary']['duplicated'],1)
        self.assertEqual(preview.data['summary']['invalid'],1)
        self.assertFalse(Representative.objects.exists())
        applied = upload(True)
        self.assertEqual(applied.status_code,200,applied.content)
        self.assertEqual(applied.data['summary']['created'],1)
        self.assertEqual(Representative.objects.get().status,Representative.Status.PENDING)
        self.assertFalse(RepresentativeProfile.objects.exists())
        again = upload(True)
        self.assertEqual(again.data['summary']['created'],0)
        self.assertEqual(Representative.objects.count(),1)

    def test_sms_is_not_queued_without_explicit_consent(self):
        rep=Representative.objects.create(company_name='X',contact_name='Contact',phone='09120000001',status='active')
        ann=Announcement.objects.create(title='New Product',body='New MDF launch',channel='sms')
        ann.queue_deliveries()
        deliver=Delivery.objects.get(announcement=ann,representative=rep)
        self.assertEqual(deliver.status,Delivery.State.SKIPPED)
        self.assertFalse(RepresentativeProfile.objects.filter(representative_id=rep.pk,sms_consent=True).exists())
