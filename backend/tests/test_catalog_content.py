from django.test import TestCase
from catalog.models import Product, ProductCategory
from content.models import ContentEntry
from rest_framework.test import APIClient


class ContentSecurityTests(TestCase):
    def test_only_published_cms_entries_are_listed(self):
        ContentEntry.objects.create(title='Hidden', slug='hidden', kind='news', status='draft')
        ContentEntry.objects.create(title='Live', slug='live', kind='news', status='published')
        client = APIClient()
        result = client.get('/api/v1/content/?kind=news')
        self.assertEqual(result.data['count'], 1)
        self.assertEqual(client.get('/api/v1/content/hidden/').status_code, 404)
