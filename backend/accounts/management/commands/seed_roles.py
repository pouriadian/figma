from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from accounts.models import User

ROLE_APPS = {
    'admin': {'accounts', 'catalog', 'crm', 'communications', 'content', 'analytics'},
    'manager': {'accounts', 'catalog', 'crm', 'communications', 'content', 'analytics'},
    'sales': {'catalog', 'crm', 'communications', 'accounts'},
    'content': {'catalog', 'content'},
    'hr': {'crm'},
    'representative': set(),
}


class Command(BaseCommand):
    help = 'ایجاد گروه‌های دسترسی فرامید بدون ایجاد کاربران نمونه'

    def handle(self, *args, **options):
        for role, apps in ROLE_APPS.items():
            group, _ = Group.objects.get_or_create(name=role)
            permissions = Permission.objects.filter(content_type__app_label__in=apps)
            if role == 'sales':
                permissions = permissions.exclude(content_type__app_label='accounts', content_type__model='user')
                permissions = permissions.exclude(content_type__app_label='crm', content_type__model='jobapplication')
            if role == 'hr':
                permissions = permissions.filter(content_type__model='jobapplication')
            if role == 'manager':
                permissions = permissions.exclude(content_type__app_label='accounts', content_type__model='user')
            # Sales and HR staff must not acquire page-editor permissions.
            if role not in ('admin', 'manager', 'content'):
                permissions = permissions.exclude(codename='edit_site_pages')
            group.permissions.set(permissions)
            self.stdout.write(self.style.SUCCESS(f'{role}: {group.permissions.count()} permissions'))
        for user in User.objects.filter(is_superuser=False):
            group = Group.objects.filter(name=user.role).first()
            if group:
                user.groups.set([group])
