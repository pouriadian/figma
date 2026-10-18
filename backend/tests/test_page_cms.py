"""Integration regression checks for editable pages, publication and access control."""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.urls import reverse
from rest_framework.test import APITestCase
from content.models import MediaAsset, SitePage, SiteSection, SiteSectionImage


class PageCMSApiTests(APITestCase):
    def setUp(self):
        call_command('seed_site_pages', verbosity=0)
        self.page = SitePage.objects.get(key='home')
        self.hero = self.page.sections.get(key='hero')
        self.url = '/api/v1/site-pages/home/'

    def test_seed_is_idempotent(self):
        initial = SitePage.objects.count(), SiteSection.objects.count()
        call_command('seed_site_pages', verbosity=0)
        self.assertEqual((SitePage.objects.count(), SiteSection.objects.count()), initial)

    def test_draft_never_leaks_to_public_api(self):
        self.hero.draft_title = 'Unpublished secret title'
        self.hero.save()
        self.assertEqual(self.client.get(self.url).data['sections'], [])
        self.hero.publish()
        self.assertEqual(self.client.get(self.url).data['sections'][0]['title'], 'Unpublished secret title')
        self.hero.draft_title = 'Still a private draft'
        self.hero.save()
        self.assertEqual(self.client.get(self.url).data['sections'][0]['title'], 'Unpublished secret title')
        self.hero.publish()
        self.assertEqual(self.client.get(self.url).data['sections'][0]['title'], 'Still a private draft')
        self.hero.is_published = False
        self.hero.save()
        self.assertFalse(self.client.get(self.url).data['sections'])


    def test_published_disabled_section_can_be_hidden_by_frontend(self):
        self.hero.draft_enabled = False
        self.hero.save()
        self.hero.publish()
        self.assertFalse(self.client.get(self.url).data['sections'][0]['enabled'])

    def test_uploaded_files_only_expose_public_snapshot_paths(self):
        media = MediaAsset.objects.create(title='Demo original', original_path='/assets/home/example.webp')
        self.hero.draft_asset = media
        self.hero.draft_title = 'New banner'
        self.hero.save()
        result = self.hero.publish()
        self.assertEqual(result['image'], '/assets/home/example.webp')
        self.assertNotIn('draft_image', self.client.get(self.url).data['sections'][0])

    def test_gallery_stays_stable_until_replication(self):
        media = MediaAsset.objects.create(title='Example', original_path='/assets/home/example.webp')
        image = SiteSectionImage.objects.create(section=self.hero, library_asset=media, caption='Photo')
        self.hero.publish()
        image.delete()
        self.assertEqual(len(self.client.get(self.url).data['sections'][0]['images']), 1)
        self.hero.publish()
        self.assertEqual(len(self.client.get(self.url).data['sections'][0]['images']), 0)

    def test_disallowed_html_removed_before_publication(self):
        self.hero.draft_body = '<p>Hello <b>world</b> <script>alert(1)</script><a href="javascript:alert(1)">click</a></p>'
        self.hero.save()
        self.hero.publish()
        body = self.client.get(self.url).data['sections'][0]['body']
        self.assertNotIn('<script', body)
        self.assertNotIn('javascript:', body)
        self.assertIn('<p>', body)

    def test_admin_editor_requires_permission_and_post_csrf(self):
        user = get_user_model().objects.create_user(username='editor', email='editor@faromid.test', password='StrongPassword111!')
        user.is_staff = True
        user.save()
        url = reverse('cms-page-overview')
        self.client.force_login(user)
        self.assertEqual(self.client.get(url).status_code, 403)
        perm = Permission.objects.get(codename='view_sitepage')
        user.user_permissions.add(perm)
        user = get_user_model().objects.get(pk=user.pk)
        self.client.force_login(user)
        self.assertEqual(self.client.get(url).status_code, 200)
        section_url = reverse('cms-section-editor', args=['home', self.hero.pk])
        self.assertEqual(self.client.post(section_url, {'action':'unpublish'}).status_code, 403)
        user.user_permissions.add(Permission.objects.get(codename='edit_site_pages'))
        user = get_user_model().objects.get(pk=user.pk)
        self.client.force_login(user)
        self.assertEqual(self.client.get(section_url).status_code, 200)

    def test_public_cms_read_rejects_unknown_key(self):
        self.assertEqual(self.client.get('/api/v1/site-pages/no-such-page/').status_code, 404)
