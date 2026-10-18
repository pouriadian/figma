"""Technical Django Admin remains available, while employees use Next.js /panel."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class NativeDjangoAdminSmokeTests(TestCase):
    def test_native_admin_maintenance_page_points_to_next_panel(self):
        user = get_user_model().objects.create_superuser(
            username='technical-owner', email='technical-owner@example.com', password='LongSafePassword123!'
        )
        self.client.force_login(user)
        response = self.client.get(reverse('admin:index'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'پنل اصلی')
        self.assertContains(response, '/panel')
