"""Security and data correctness checks for the Next.js /panel staff API."""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.test import TestCase
import json
from rest_framework.test import APIClient
from analytics.models import TrafficEvent
from accounts.models import Representative, StaffTeam
from catalog.models import Product, ProductCategory, Texture
from crm.models import Inquiry
from content.models import SitePage, SiteSection, MediaAsset


class StaffApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.admin = User.objects.create_superuser(username='site-owner', email='site-owner@example.com', password='StrongAndLong123!')
        cls.rep_user = User.objects.create_user(username='external-rep', email='external-rep@example.com', password='StrongAndLong123!')
        cls.staff_no_perm = User.objects.create_user(username='limited', email='limited@example.com', password='StrongAndLong123!', is_staff=True)
        cls.cat = ProductCategory.objects.create(name='MDF', slug='mdf')
        cls.product = Product.objects.create(name='Sample Product', slug='sample-product', sku='SP-001', category=cls.cat, cover_asset='/assets/product.webp', status='published')

    def test_staff_email_login_issues_valid_tokens(self):
        client = APIClient()
        response = client.post('/api/v1/auth/staff-token/', {
            'email': 'site-owner@example.com',
            'password': 'StrongAndLong123!',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])
        me = client.get('/api/v1/manage/me/')
        self.assertEqual(me.status_code, 200, me.data)
        self.assertEqual(me.data['email'], 'site-owner@example.com')

    def test_staff_login_wrong_password_and_dealer_rejected(self):
        client = APIClient()
        wrong = client.post('/api/v1/auth/staff-token/', {
            'email': 'site-owner@example.com', 'password': 'incorrect',
        }, format='json')
        self.assertEqual(wrong.status_code, 401)
        dealer = client.post('/api/v1/auth/staff-token/', {
            'email': 'external-rep@example.com', 'password': 'StrongAndLong123!',
        }, format='json')
        self.assertEqual(dealer.status_code, 403)
        invalid = client.post('/api/v1/auth/staff-token/', {'email': 'bad'}, format='json')
        self.assertEqual(invalid.status_code, 400)

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_anonymous_and_dealer_cannot_access_management_data(self):
        self.assertIn(APIClient().get('/api/v1/manage/dashboard/').status_code, (401, 403))
        self.assertEqual(self.client_for(self.rep_user).get('/api/v1/manage/dashboard/').status_code, 403)
        self.assertEqual(self.client_for(self.rep_user).get('/api/v1/manage/products/').status_code, 403)

    def test_staff_without_permission_cannot_read_products_or_content(self):
        client = self.client_for(self.staff_no_perm)
        self.assertEqual(client.get('/api/v1/manage/products/').status_code, 403)
        self.assertEqual(client.get('/api/v1/manage/pages/').status_code, 403)
        session = client.get('/api/v1/manage/me/')
        self.assertEqual(session.status_code, 200)
        self.assertFalse(session.data['modules']['products'])
        self.assertFalse(session.data['modules']['pages'])

    def test_staff_teams_require_user_management_and_are_soft_deactivated(self):
        limited=self.client_for(self.staff_no_perm)
        self.assertEqual(limited.get('/api/v1/manage/teams/').status_code,403)
        owner=self.client_for(self.admin)
        created=owner.post('/api/v1/manage/teams/',{'name':'پرسنل'},format='json')
        self.assertEqual(created.status_code,201,created.data)
        team_id=created.data['id']
        deleted=owner.delete(f'/api/v1/manage/teams/{team_id}/')
        self.assertEqual(deleted.status_code,204)
        team=StaffTeam.objects.get(pk=team_id)
        self.assertFalse(team.is_active)

    def test_only_superuser_can_assign_admin_role(self):
        permission=Permission.objects.get(content_type__app_label='accounts',codename='add_user')
        self.staff_no_perm.user_permissions.add(permission)
        response=self.client_for(self.staff_no_perm).post('/api/v1/manage/users/',{
            'username':'new-admin','first_name':'New','email':'new-admin@example.com',
            'password':'StrongAndLong123!','role':'admin',
        },format='json')
        self.assertEqual(response.status_code,403,response.data)

    def test_inactive_team_membership_is_preserved_when_editing_employee(self):
        team=StaffTeam.objects.create(name='تیم قدیمی',is_active=False)
        employee=get_user_model().objects.create_user(username='team-member',email='team-member@example.com',password='StrongAndLong123!',is_staff=True,staff_team=team)
        response=self.client_for(self.admin).patch(f'/api/v1/manage/users/{employee.pk}/',{
            'phone':'09120000000','staff_team':team.pk,
        },format='json')
        self.assertEqual(response.status_code,200,response.data)
        employee.refresh_from_db()
        self.assertEqual(employee.staff_team_id,team.pk)

    def test_real_analytics_and_top_product_series(self):
        TrafficEvent.objects.create(kind='page_view', path='/')
        TrafficEvent.objects.create(kind='page_view', path='/products')
        TrafficEvent.objects.create(kind='product_view', path='/products/sample-product', product=self.product)
        TrafficEvent.objects.create(kind='product_view', path='/products/sample-product', product=self.product)
        client = self.client_for(self.admin)
        result = client.get('/api/v1/manage/dashboard/?days=7')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data['metrics']['visits'], 2)
        self.assertEqual(len(result.data['trend']), 7)
        self.assertEqual(result.data['popular_products'][0]['views'], 2)
        self.assertEqual(result.data['product_series'][0]['views'], 2)
        self.assertEqual(sum(result.data['product_series'][0]['data']), 2)

    def test_products_write_through_authenticated_api(self):
        client = self.client_for(self.admin)
        response = client.patch(f'/api/v1/manage/products/{self.product.pk}/', {'name':'Edited product'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, 'Edited product')
        self.assertEqual(client.get('/api/v1/products/sample-product/').data['name'], 'Edited product')

    def test_product_texture_relations_can_be_set_and_cleared_from_multipart(self):
        texture = Texture.objects.create(name='Oak', slug='oak', code='TEX-OAK')
        client = self.client_for(self.admin)
        url = f'/api/v1/manage/products/{self.product.pk}/'

        linked = client.patch(url, {'textures': json.dumps([texture.pk])}, format='multipart')
        self.assertEqual(linked.status_code, 200, linked.data)
        self.product.refresh_from_db()
        self.assertEqual(list(self.product.textures.values_list('pk', flat=True)), [texture.pk])
        self.assertIn(self.product.pk, texture.products.values_list('pk', flat=True))

        cleared = client.patch(url, {'textures': '[]'}, format='multipart')
        self.assertEqual(cleared.status_code, 200, cleared.data)
        self.product.refresh_from_db()
        self.assertFalse(self.product.textures.exists())
        self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())

    def test_draft_section_requires_publish_and_does_not_change_original_asset(self):
        page = SitePage.objects.create(key='home', name='خانه')
        section = SiteSection.objects.create(page=page, key='hero', name='بنر', draft_title='Draft One')
        client = self.client_for(self.admin)
        old = client.get('/api/v1/site-pages/home/').data['sections']
        self.assertEqual(old, [])
        result = client.patch(f'/api/v1/manage/sections/{section.pk}/', {'draft_title':'New Banner'}, format='json')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(client.get('/api/v1/site-pages/home/').data['sections'], [])
        publish = client.post(f'/api/v1/manage/sections/{section.pk}/publish/', {}, format='json')
        self.assertEqual(publish.status_code, 200, publish.data)
        snapshot = client.get('/api/v1/site-pages/home/').data['sections'][0]
        self.assertEqual(snapshot['title'], 'New Banner')
        self.assertEqual(snapshot['image'], '')
        self.assertEqual(client.post(f'/api/v1/manage/sections/{section.pk}/unpublish/', {}, format='json').status_code, 200)
        self.assertEqual(client.get('/api/v1/site-pages/home/').data['sections'], [])

    def test_media_original_asset_path_is_validated(self):
        client = self.client_for(self.admin)
        bad = client.post('/api/v1/manage/media/', {'title':'X', 'original_path':'https://evil.example/a.jpg'}, format='json')
        self.assertEqual(bad.status_code, 400)
        good = client.post('/api/v1/manage/media/', {'title':'Existing asset', 'original_path':'/assets/home/original.webp'}, format='json')
        self.assertEqual(good.status_code, 201, good.data)

    def test_representative_search_is_paginated(self):
        Representative.objects.create(company_name='Sample Company',contact_name='Person',phone='09121234567',province='تهران',city='تهران')
        r = self.client_for(self.admin).get('/api/v1/manage/representatives/?search=Sample')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['count'], 1)

    def test_manage_sections_route_exists_and_filters_by_page(self):
        home = SitePage.objects.create(key='home', name='Home')
        section = SiteSection.objects.create(page=home, key='hero', name='Hero')
        other = SitePage.objects.create(key='about', name='About')
        SiteSection.objects.create(page=other, key='about-hero', name='About Hero')
        result = self.client_for(self.admin).get('/api/v1/manage/sections/?page_key=home&page_size=100')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual([x['id'] for x in result.data['results']], [section.pk])

    def test_page_seo_get_and_patch(self):
        SitePage.objects.create(key='home', name='Home')
        client = self.client_for(self.admin)
        result = client.get('/api/v1/manage/pages/home/seo/')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data['path'], '/')
        result = client.patch('/api/v1/manage/pages/home/seo/', {'seo_title': 'Homepage SEO'}, format='json')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(client.get('/api/v1/manage/pages/home/seo/').data['seo_title'], 'Homepage SEO')

    def test_users_list_has_created_at_date(self):
        result = self.client_for(self.admin).get('/api/v1/manage/users/?page=1&search=')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertGreater(result.data['count'], 0)
        self.assertIn('created_at', result.data['results'][0])
        self.assertIsNotNone(result.data['results'][0]['created_at'])

    def test_manager_cannot_modify_superuser_with_insufficient_rights(self):
        client = self.client_for(self.staff_no_perm)
        self.assertEqual(client.patch(f'/api/v1/manage/users/{self.admin.pk}/', {'role':'representative'}, format='json').status_code,403)
