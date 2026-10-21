from django.contrib.auth.models import Group, Permission
from .management.commands._permissions import GROUP_PERMISSIONS


def seed_sms_permission_groups(sender, **kwargs):
    for name, codenames in GROUP_PERMISSIONS.items():
        group, _ = Group.objects.get_or_create(name=name)
        permissions=Permission.objects.filter(content_type__app_label='sms_campaigns',codename__in=codenames)
        if permissions.count()==len(codenames):group.permissions.set(permissions)
