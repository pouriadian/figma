"""Read-only diagnosis of Faromid panel API routes and backing tables.

Usage from backend/:
    python manage.py check_panel_errors

No user passwords, JWTs, or private data are printed. No data is modified.
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.urls import resolve, Resolver404
from rest_framework.test import APIClient

from content.models import PageSEO, SitePage


class Command(BaseCommand):
    help = 'Check panel API routing and database/serializer responses without changing records.'

    def handle(self, *args, **options):
        self.stdout.write('=== Faromid panel API diagnostic (read-only) ===')
        errors = 0
        check_paths = [
            '/api/v1/manage/pages/',
            '/api/v1/manage/sections/',
            '/api/v1/manage/users/',
            '/api/v1/manage/pages/home/seo/',
            '/api/v1/manage/media/',
            '/api/v1/manage/representatives/summary/',
            '/api/v1/representatives/',
            '/api/v1/analytics/',
        ]
        for path in check_paths:
            try:
                match = resolve(path)
                view = getattr(match.func, 'cls', None) or getattr(match.func, 'view_class', None)
                self.stdout.write(f'ROUTE OK    {path}  ->  {getattr(view, "__name__", match.url_name)}')
            except Resolver404:
                errors += 1
                self.stdout.write(self.style.ERROR(f'ROUTE 404   {path} (backend URL not registered)'))

        tables = set(connection.introspection.table_names())
        required = ['accounts_user', 'content_sitepage', 'content_sitesection', 'content_pageseo', 'partners_representativeprofile']
        for table in required:
            present = table in tables
            text = f'TABLE {"OK" if present else "MISSING"} {table}'
            if not present: errors += 1
            self.stdout.write(text if present else self.style.ERROR(text))

        if not all(table in tables for table in required):
            self.stdout.write(self.style.WARNING(
                'Apply pending Django migrations before testing the related endpoints.'))
            raise CommandError(f'{errors} API route/table errors detected. Run migrations first.')

        admin = get_user_model().objects.filter(
            is_active=True, is_staff=True, is_superuser=True,
        ).first()
        if admin is None:
            self.stdout.write(self.style.WARNING('No active staff superuser found. HTTP checks skipped.'))
            if errors: raise CommandError(f'{errors} route/table errors detected.')
            return

        client = APIClient()
        client.force_authenticate(user=admin)
        endpoints = [
            '/api/v1/manage/pages/?page_size=100',
            '/api/v1/manage/sections/?page_key=home&page_size=100',
            '/api/v1/manage/users/?page=1&search=',
            '/api/v1/manage/media/?page_key=home',
            '/api/v1/manage/representatives/summary/',
            '/api/v1/representatives/',
        ]
        # The Page SEO API creates a default row on first GET. Skip it when
        # absent, to keep this diagnostic strictly read-only.
        if SitePage.objects.filter(key='home').exists():
            if PageSEO.objects.filter(path='/').exists():
                endpoints.append('/api/v1/manage/pages/home/seo/')
            else:
                self.stdout.write('SEO GET SKIPPED (default SEO row has not been created yet)')
        else:
            self.stdout.write('HOME PAGE MISSING (run seed_site_pages after migrations)')

        for endpoint in endpoints:
            try:
                result = client.get(endpoint, HTTP_HOST='localhost')
                if result.status_code != 200: errors += 1
                label = 'OK' if result.status_code == 200 else 'FAILED'
                message = f'HTTP {result.status_code} {label} {endpoint}'
                self.stdout.write(message if result.status_code == 200 else self.style.ERROR(message))
                if result.status_code != 200:
                    detail = getattr(result, 'data', None)
                    if isinstance(detail, dict):
                        self.stdout.write(f'  Response keys: {", ".join(detail.keys())[:150]}')
            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.ERROR(
                    f'HTTP EXCEPTION {endpoint}: {type(exc).__name__}: {str(exc)[:240]}'))
        self.stdout.write('=== End ===')
        if errors: raise CommandError(f'{errors} API checks failed; see diagnostics above.')
