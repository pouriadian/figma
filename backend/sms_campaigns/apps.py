from django.apps import AppConfig


class SmsCampaignsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sms_campaigns'
    verbose_name = 'SMS campaigns and rewards'

    def ready(self):
        from django.db.models.signals import post_migrate
        from .signals import seed_sms_permission_groups
        post_migrate.connect(seed_sms_permission_groups, sender=self, dispatch_uid='sms_campaigns.seed_permission_groups')
