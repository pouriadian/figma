from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand
from ._permissions import GROUP_PERMISSIONS


class Command(BaseCommand):
    help = 'Create independent SMS access groups and assign module permissions.'

    def handle(self, *args, **options):
        for name, codenames in GROUP_PERMISSIONS.items():
            group, _ = Group.objects.get_or_create(name=name)
            permissions = Permission.objects.filter(codename__in=codenames, content_type__app_label='sms_campaigns')
            if permissions.count() != len(codenames):
                missing = set(codenames) - set(permissions.values_list('codename', flat=True))
                self.stderr.write(self.style.ERROR(f'Missing SMS permissions: {", ".join(sorted(missing))}. Run migrations first.'))
                continue
            group.permissions.set(permissions)
            self.stdout.write(self.style.SUCCESS(f'Configured {name}'))
