"""Periodic worker: run every minute using cron/Task Scheduler/Celery beat.

EMAIL_BACKEND=console is treated as simulation, not a sent email. SMS_WEBHOOK_URL
is a provider-independent JSON adapter accepting {to, message}; use HTTPS only.
"""
import json
import requests
from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.db import transaction, connection
from django.utils import timezone
from communications.models import Announcement, Delivery


class Command(BaseCommand):
    help = 'ارسال صف اطلاعیه‌ها و ثبت نتیجه هر گیرنده (حداکثر ۱۰۰ در هر اجرا)'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=100)

    def handle(self, *args, **options):
        from django.db.models import Q
        processed = 0
        due = Q(announcement__scheduled_at__isnull=True) | Q(announcement__scheduled_at__lte=timezone.now())
        for _ in range(min(max(0, options['limit']), 500)):
            with transaction.atomic():
                query = Delivery.objects.filter(status='pending', announcement__status='queued').filter(due).select_related('announcement', 'representative', 'representative__user').order_by('pk')
                if connection.features.has_select_for_update_skip_locked:
                    query = query.select_for_update(skip_locked=True)
                else:
                    query = query.select_for_update()
                item = query.first()
                if item is None:
                    break
                item.attempts += 1
                try:
                    self.dispatch(item)
                except Exception as exc:
                    item.status = Delivery.State.FAILED
                    item.last_error = str(exc)[:500]
                item.processed_at = timezone.now()
                item.save(update_fields=['status', 'attempts', 'last_error', 'provider_reference', 'processed_at', 'updated_at'])
                processed += 1
        for announcement in Announcement.objects.filter(status='queued'):
            if not announcement.deliveries.filter(status='pending').exists():
                announcement.status = Announcement.State.FINISHED
                announcement.save(update_fields=['status', 'updated_at'])
        self.stdout.write(f'Processed {processed} deliveries.')

    def dispatch(self, item):
        representative = item.representative
        ann = item.announcement
        item.last_error = ''
        if item.channel == 'in_app':
            item.status = Delivery.State.ACCEPTED
            return
        if item.channel == 'email':
            target = representative.email or (representative.user.email if representative.user else '')
            if not target:
                item.status = Delivery.State.SKIPPED
                item.last_error = 'No email address'
                return
            if 'console' in settings.EMAIL_BACKEND or 'dummy' in settings.EMAIL_BACKEND:
                item.status = Delivery.State.SIMULATED
                item.last_error = 'Development email backend: no email delivered'
                return
            accepted = send_mail(ann.title, ann.body, settings.DEFAULT_FROM_EMAIL, [target], fail_silently=False)
            if not accepted:
                raise RuntimeError('SMTP did not accept the message')
            item.status = Delivery.State.ACCEPTED
            return
        if item.channel == 'sms':
            from partners.models import RepresentativeProfile
            if not RepresentativeProfile.objects.filter(representative_id=representative.pk, sms_consent=True).exists():
                item.status = Delivery.State.SKIPPED
                item.last_error = 'SMS consent is not enabled'
                return
            if not representative.phone:
                item.status = Delivery.State.SKIPPED
                item.last_error = 'Missing phone'
                return
            if not settings.SMS_WEBHOOK_URL:
                item.status = Delivery.State.SKIPPED
                item.last_error = 'SMS_WEBHOOK_URL not configured'
                return
            if not settings.SMS_WEBHOOK_URL.startswith('https://'):
                raise ValueError('SMS provider endpoint must use HTTPS')
            resp = requests.post(settings.SMS_WEBHOOK_URL, json={'to': representative.phone, 'message': ann.body},
                                 headers={'Authorization': f'Bearer {settings.SMS_API_TOKEN}'}, timeout=12)
            resp.raise_for_status()
            # Provider acknowledgement is not proof of handset delivery.
            data = resp.json() if 'application/json' in resp.headers.get('content-type', '') else {}
            item.provider_reference = str(data.get('id', ''))[:150] if isinstance(data, dict) else ''
            item.status = Delivery.State.ACCEPTED
            return
        raise ValueError('Unsupported channel')
