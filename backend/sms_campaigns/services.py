import re
import requests
from django.conf import settings
from django.db import transaction, connection
from django.utils import timezone
from datetime import timedelta
from .models import SMSCampaignRecipient, SMSCampaign

TOKENS = {'representative_name', 'representative_code', 'last_month_sales', 'discount_percent'}


def normalize_phone(value):
    digits=str(value or '').translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩','01234567890123456789'))
    digits=re.sub(r'[^0-9+]','',digits)
    if digits.startswith('0098'):digits='+98'+digits[4:]
    elif digits.startswith('98'):digits='+'+digits
    elif digits.startswith('09'):digits='+98'+digits[1:]
    if not re.fullmatch(r'\+989\d{9}',digits):raise ValueError('شماره همراه ایرانی معتبر نیست.')
    return digits


def render_message(template, representative, sales=None, discount_percent=''):
    names = set(re.findall(r'\{([^{}]+)\}', template))
    unknown = names - TOKENS
    if unknown:
        raise ValueError('Unknown template variables: ' + ', '.join(sorted(unknown)))
    if template.count('{')!=template.count('}') or names and re.sub(r'\{[^{}]+\}','',template).find('{')>=0:
        raise ValueError('Malformed message template variable.')
    values = {
        'representative_name': representative.contact_name,
        'representative_code': representative.code,
        'last_month_sales': str(sales or 0),
        'discount_percent': str(discount_percent),
    }
    return re.sub(r'\{([a-z_]+)\}', lambda match: values[match.group(1)], template)


def farazsms_send(phone, message):
    if settings.SMS_MODE != 'live':
        return {'state': 'submitted', 'request_id': 'mock-' + timezone.now().strftime('%Y%m%d%H%M%S%f')}
    if not settings.FARAZSMS_API_KEY or not settings.FARAZSMS_SENDER_LINE:
        raise RuntimeError('FarazSMS is not configured')
    payload = {'text': message, 'line_number': settings.FARAZSMS_SENDER_LINE,
               'recipients': [normalize_phone(phone)], 'number_format': 'english', 'schedule': None}
    try:
        response = requests.post(f'{settings.FARAZSMS_BASE_URL}/ws/v1/sms/simple', json=payload,
                                 headers={'Api-Key': settings.FARAZSMS_API_KEY}, timeout=(4, 12))
    except (requests.Timeout,requests.ConnectionError):
        # The request may have reached the provider. Do not retry without reconciliation.
        return {'state': 'unknown', 'request_id': '', 'error': 'Provider timeout; reconciliation required'}
    if response.status_code >= 500:
        return {'state':'unknown','request_id':'','error':f'Provider returned HTTP {response.status_code}; reconciliation required'}
    response.raise_for_status()
    try:data = response.json() if response.content else {}
    except ValueError:return {'state':'unknown','request_id':'','error':'Provider accepted request but returned an unreadable response'}
    request_id = data.get('id') or data.get('send_request_id') or data.get('request_id') or ''
    if not request_id and isinstance(data.get('data'),(str,int)):
        request_id = data['data']
    return {'state': 'submitted', 'request_id': str(request_id)[:120]}


def farazsms_request_items(request_id):
    if settings.SMS_MODE != 'live':
        return {'mode':'mock','items':[]}
    if not settings.FARAZSMS_API_KEY:
        raise RuntimeError('FarazSMS is not configured')
    response=requests.get(f'{settings.FARAZSMS_BASE_URL}/ws/v1/send_request/{request_id}/items',
        headers={'Api-Key':settings.FARAZSMS_API_KEY},timeout=(4,12))
    response.raise_for_status()
    return response.json() if response.content else {}


def process_pending(limit=50):
    processed = 0
    # An abandoned claim may have reached the provider before the worker crashed.
    # Move it to unknown and require reconciliation; never requeue it automatically.
    stale_before=timezone.now()-timedelta(minutes=5)
    SMSCampaignRecipient.objects.filter(status='processing',updated_at__lt=stale_before).update(
        status='unknown',error_message='Worker claim expired; provider reconciliation required')
    for _ in range(max(0, min(int(limit), int(settings.SMS_BULK_BATCH_SIZE)))):
        with transaction.atomic():
            query = SMSCampaignRecipient.objects.filter(status='pending', campaign__status__in=['queued', 'processing']).order_by('pk')
            if connection.features.has_select_for_update_skip_locked:
                query = query.select_for_update(skip_locked=True)
            else:
                query = query.select_for_update()
            item = query.first()
            if item is None:
                break
            item.status = 'processing'
            item.attempts += 1
            item.save(update_fields=['status', 'attempts', 'updated_at'])
            SMSCampaign.objects.filter(pk=item.campaign_id, status='queued').update(status='processing')
            recipient_id = item.pk
        # The claim transaction is committed before consent lookup or provider HTTP.
        item = SMSCampaignRecipient.objects.select_related('representative', 'campaign').get(pk=recipient_id)
        from partners.models import RepresentativeProfile
        if not RepresentativeProfile.objects.filter(representative_id=item.representative_id, sms_consent=True).exists():
            SMSCampaignRecipient.objects.filter(pk=recipient_id, status='processing').update(status='canceled', error_message='Marketing consent withdrawn')
            processed += 1
            continue
        if not item.phone_number:
            SMSCampaignRecipient.objects.filter(pk=recipient_id, status='processing').update(status='failed', error_message='Missing phone number')
            processed += 1
            continue
        try:
            result = farazsms_send(item.phone_number, item.rendered_message)
            state = result['state']
            updates = {'status': state, 'provider_request_id': result.get('request_id', ''),
                       'error_message': result.get('error', ''), 'submitted_at': timezone.now() if state == 'submitted' else None}
        except requests.RequestException as exc:
            updates = {'status': 'failed', 'error_message': str(exc)[:500]}
        except Exception as exc:
            updates = {'status': 'failed', 'error_message': str(exc)[:500]}
        SMSCampaignRecipient.objects.filter(pk=recipient_id, status='processing').update(**updates)
        processed += 1
    for campaign in SMSCampaign.objects.filter(status__in=['queued','processing']):
        if not campaign.recipients.filter(status__in=['pending','processing']).exists():
            campaign.status='finished';campaign.save(update_fields=['status','updated_at'])
    return processed
