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
from datetime import timedelta
from communications.models import Announcement, Delivery


class Command(BaseCommand):
    help = 'ارسال صف اطلاعیه‌ها و ثبت نتیجه هر گیرنده (حداکثر ۱۰۰ در هر اجرا)'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=100)

    def handle(self, *args, **options):
        from django.db.models import Q
        from sms_campaigns.services import process_pending
        campaign_processed = process_pending(options['limit'])
        Delivery.objects.filter(channel='sms',status='processing',updated_at__lt=timezone.now()-timedelta(minutes=5)).update(
            status=Delivery.State.UNKNOWN,last_error='Worker claim expired; provider reconciliation required')
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
                item.status = Delivery.State.PROCESSING
                item.save(update_fields=['status', 'attempts', 'updated_at'])
                claimed_id = item.pk
            # The lock is committed before external mail/SMS calls.
            item = Delivery.objects.select_related('announcement', 'representative', 'representative__user').get(pk=claimed_id)
            try:
                self.dispatch(item)
            except Exception as exc:
                item.status = Delivery.State.FAILED
                item.last_error = str(exc)[:500]
            item.processed_at = timezone.now()
            item.save(update_fields=['status', 'last_error', 'provider_reference', 'processed_at', 'updated_at'])
            processed += 1
        for announcement in Announcement.objects.filter(status='queued'):
            if not announcement.deliveries.filter(status__in=['pending','processing']).exists():
                announcement.status = Announcement.State.FINISHED
                announcement.save(update_fields=['status', 'updated_at'])
        self.stdout.write(f'Processed {processed} deliveries and {campaign_processed} campaign recipients.')

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
            from sms_campaigns.services import farazsms_send
            result=farazsms_send(representative.phone,ann.body)
            item.provider_reference=result.get('request_id','')[:150]
            item.last_error=result.get('error','')
            item.status={'submitted':Delivery.State.SUBMITTED,'unknown':Delivery.State.UNKNOWN}.get(result['state'],Delivery.State.FAILED)
            return
        raise ValueError('Unsupported channel')
