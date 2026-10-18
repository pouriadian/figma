from django.contrib.auth.models import Group
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User


@receiver(post_save, sender=User)
def sync_role(sender, instance, **kwargs):
    if instance.is_superuser:
        return
    group = Group.objects.filter(name=instance.role).first()
    allowed = ['admin', 'manager', 'sales', 'content', 'hr', 'representative']
    if group and instance.role in allowed:
        instance.groups.remove(*Group.objects.filter(name__in=allowed).exclude(pk=group.pk))
        instance.groups.add(group)
