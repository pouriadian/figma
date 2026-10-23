import re
import requests
from django.conf import settings
from django.db import transaction, connection
from django.utils import timezone
from datetime import timedelta
from .models import SMSCampaignRecipient, SMSCampaign

TOKENS = {'representative_name', 'representative_code', 'last_month_sales', 'discount_percent', 'name', 'code', 'sales', 'product_name', 'product_link'}


def provider_configuration():
    """Return effective provider configuration without exposing it to clients."""
    from .models import SMSProviderConfig
    config = SMSProviderConfig.objects.filter(pk=1).first()
    if config:
        if not config.enabled:
            return {'mode': 'mock', 'api_key': '', 'sender_line': ''}
        if not settings.SMS_CONFIG_ENCRYPTION_KEY:
            raise RuntimeError('کلید رمزگذاری تنظیمات پیامک در Backend تنظیم نشده است.')
        try:
            from cryptography.fernet import Fernet, InvalidToken
            key = settings.SMS_CONFIG_ENCRYPTION_KEY.encode('ascii')
            api_key = Fernet(key).decrypt(config.api_key_encrypted.encode('ascii')).decode('utf-8')
        except Exception as exc:
            raise RuntimeError('کلید رمزگذاری تنظیمات پیامک معتبر نیست.') from exc
        return {'mode': 'live', 'api_key': api_key, 'sender_line': config.sender_line}
    return {
        'mode': settings.SMS_MODE,
        'api_key': settings.FARAZSMS_API_KEY,
        'sender_line': settings.FARAZSMS_SENDER_LINE,
    }


def encrypt_provider_key(api_key):
    if not settings.SMS_CONFIG_ENCRYPTION_KEY:
        raise RuntimeError('کلید رمزگذاری تنظیمات پیامک در Backend تنظیم نشده است.')
    try:
        from cryptography.fernet import Fernet
        return Fernet(settings.SMS_CONFIG_ENCRYPTION_KEY.encode('ascii')).encrypt(api_key.encode('utf-8')).decode('ascii')
    except Exception as exc:
        raise RuntimeError('کلید رمزگذاری تنظیمات پیامک معتبر نیست.') from exc


def encryption_key_ready():
    if not settings.SMS_CONFIG_ENCRYPTION_KEY:return False
    try:
        from cryptography.fernet import Fernet
        Fernet(settings.SMS_CONFIG_ENCRYPTION_KEY.encode('ascii'))
        return True
    except Exception:return False


def provider_is_ready():
    config=provider_configuration()
    return config['mode']=='live' and bool(config['api_key']) and bool(config['sender_line'])


def normalize_phone(value):
    digits=str(value or '').translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩','01234567890123456789'))
    digits=re.sub(r'[^0-9+]','',digits)
    if digits.startswith('+980'):digits=digits[3:]
    elif digits.startswith('+98'):digits='0'+digits[3:]
    elif digits.startswith('0098'):digits='0'+digits[4:]
    elif digits.startswith('98') and len(digits)==12:digits='0'+digits[2:]
    elif digits.startswith('9') and len(digits)==10:digits='0'+digits
    if not re.fullmatch(r'09\d{9}',digits):raise ValueError('شماره همراه ایرانی معتبر نیست.')
    return digits


def farazsms_accessible_lines(api_key):
    """Fetch the authenticated account's usable sender lines; never log its key."""
    response=requests.get(f'{settings.FARAZSMS_BASE_URL}/ws/v1/lines/accessible',
        headers={'Api-Key':api_key,'Accept':'application/json'},timeout=(4,12))
    response.raise_for_status()
    payload=response.json()
    if not isinstance(payload,dict) or payload.get('status')!='success' or not isinstance(payload.get('data'),list):
        raise ValueError('Invalid accessible sender-lines response')
    lines=[]
    for item in payload['data']:
        if isinstance(item,dict) and item.get('number'):
            lines.append({'number':str(item['number']).strip(),'is_dedicated':bool(item.get('is_dedicated',False)),
                'sms_cost':item.get('sms_cost')})
    return lines


def preferred_sender_line(lines, current=''):
    numbers=[line['number'] for line in lines]
    if current in numbers:return current
    if '90008361' in numbers:return '90008361'
    return numbers[0] if numbers else ''


def render_message(template, representative, sales=None, discount_percent=''):
    values = {
        'representative_name': representative.contact_name,
        'representative_code': representative.code,
        'last_month_sales': str(sales or 0),
        'discount_percent': str(discount_percent),
        'name': representative.contact_name,
        'code': representative.code,
        'sales': str(sales or 0),
        'product_name': '',
        'product_link': '',
    }
    return render_template(template, values)


def render_template(template, values, allowed_tokens=None):
    """Render the UI's %field% tokens and keep legacy {field} campaign tokens."""
    tokens = re.findall(r'%([^%]+)%|\{([^{}]+)\}', template)
    names = {left or right for left, right in tokens}
    unknown = names - (set(allowed_tokens) if allowed_tokens is not None else TOKENS)
    if unknown:
        raise ValueError('فیلد پیام ناشناخته است: ' + ', '.join(sorted(unknown)))
    if template.count('%') != 2 * len(re.findall(r'%[^%]+%', template)):
        raise ValueError('جای‌نگهدار پیام ناقص است.')
    brace_tokens=re.findall(r'\{[^{}]+\}',template)
    if template.count('{') != len(brace_tokens) or template.count('}') != len(brace_tokens):
        raise ValueError('جای‌نگهدار پیام ناقص است.')
    return re.sub(r'%([^%]+)%|\{([^{}]+)\}', lambda match: str(values.get(match.group(1) or match.group(2), '')), template)


def _post_sms(endpoint, payload):
    config = provider_configuration()
    if config['mode'] != 'live' or not config['api_key'] or not config['sender_line']:
        raise RuntimeError('اتصال واقعی پیامک فعال نیست.')
    try:
        response = requests.post(f'{settings.FARAZSMS_BASE_URL}/ws/v1/sms/{endpoint}', json=payload,
            headers={'Api-Key': config['api_key'], 'Accept': 'application/json'}, timeout=(4, 12))
    except (requests.Timeout, requests.ConnectionError):
        return {'state': 'unknown', 'request_id': '', 'error': 'Provider timeout; reconciliation required'}
    if response.status_code >= 500:
        return {'state': 'unknown', 'request_id': '', 'error': f'Provider returned HTTP {response.status_code}; reconciliation required'}
    response.raise_for_status()
    try:
        data = response.json() if response.content else {}
    except ValueError:
        return {'state': 'unknown', 'request_id': '', 'error': 'Provider accepted request but returned an unreadable response'}
    if isinstance(data, dict) and data.get('status') == 'error':
        raise ValueError('سرویس پیامک درخواست را نپذیرفت.')
    request_id = data.get('id') or data.get('send_request_id') or data.get('request_id') or '' if isinstance(data, dict) else ''
    if not request_id and isinstance(data, dict) and isinstance(data.get('data'), (str, int)):
        request_id = data['data']
    return {'state': 'submitted', 'request_id': str(request_id)[:120]}


def farazsms_send(phone, message):
    config = provider_configuration()
    if config['mode'] != 'live':
        raise RuntimeError('اتصال واقعی پیامک فعال نیست؛ ارسال شبیه‌سازی‌شده پذیرفته نمی‌شود.')
    if not config['api_key'] or not config['sender_line']:
        raise RuntimeError('FarazSMS is not configured')
    payload = {'text': message, 'line_number': config['sender_line'],
               'recipients': [normalize_phone(phone)], 'number_format': 'english', 'schedule': None}
    return _post_sms('simple', payload)


def farazsms_send_pattern(phone, pattern, attributes):
    return _post_sms('pattern', {'code': pattern.code, 'attributes': attributes,
        'recipient': normalize_phone(phone), 'line_number': provider_configuration()['sender_line'],
        'number_format': 'english'})


def farazsms_send_keywords(campaign, recipients):
    """Submit one provider request for a campaign batch; payload contract follows the account's API docs."""
    rows = []
    for item in recipients:
        row = {'mobile': normalize_phone(item.phone_number)}
        for key, value in item.attributes.items():
            if key not in {'name', 'code', 'sales', 'product_name', 'product_link'}:
                raise ValueError('فیلد Keywords مجاز نیست.')
            row[key] = str(value)
        rows.append(row)
    return _post_sms('keywords', {'text': campaign.message_template, 'line_number': provider_configuration()['sender_line'],
        'recipients': rows, 'number_format': 'english', 'schedule': None})


def farazsms_create_pattern(text, description, category, variables):
    config = provider_configuration()
    if config['mode'] != 'live' or not config['api_key']:
        raise RuntimeError('اتصال واقعی پیامک فعال نیست.')
    remote_vars = [{'var': item['var'], 'length': item['length'], 'type': item['type']} for item in variables]
    response = requests.post(f'{settings.FARAZSMS_BASE_URL}/ws/v1/patterns',
        json={'text': text, 'description': description or None, 'share': 0, 'website': '', 'category': category, 'vars': remote_vars},
        headers={'Api-Key': config['api_key'], 'Accept': 'application/json'}, timeout=(4, 12))
    response.raise_for_status()
    data = response.json() if response.content else {}
    code = data.get('data') if isinstance(data, dict) else None
    if isinstance(code, dict):
        code = code.get('code') or code.get('uid')
    if not code:
        raise ValueError('سرویس پترن را ساخت اما کد آن را برنگرداند.')
    return str(code)


def farazsms_get_pattern(code):
    config = provider_configuration()
    if config['mode'] != 'live' or not config['api_key']:
        raise RuntimeError('اتصال واقعی پیامک فعال نیست.')
    response = requests.get(f'{settings.FARAZSMS_BASE_URL}/ws/v1/patterns/{code}',
        headers={'Api-Key': config['api_key'], 'Accept': 'application/json'}, timeout=(4, 12))
    response.raise_for_status()
    data = response.json() if response.content else {}
    return data.get('data', data) if isinstance(data, dict) else {}


def farazsms_request_items(request_id):
    config = provider_configuration()
    if config['mode'] != 'live':
        return {'mode':'mock','items':[]}
    if not config['api_key']:
        raise RuntimeError('FarazSMS is not configured')
    response=requests.get(f'{settings.FARAZSMS_BASE_URL}/ws/v1/send_request/{request_id}/items',
        headers={'Api-Key':config['api_key']},timeout=(4,12))
    response.raise_for_status()
    return response.json() if response.content else {}


def process_pending(limit=50):
    processed = 0
    # An abandoned claim may have reached the provider before the worker crashed.
    # Move it to unknown and require reconciliation; never requeue it automatically.
    stale_before=timezone.now()-timedelta(minutes=5)
    SMSCampaignRecipient.objects.filter(status='processing',updated_at__lt=stale_before).update(
        status='unknown',error_message='Worker claim expired; provider reconciliation required')
    processed = 0
    max_items = max(0, min(int(limit), int(settings.SMS_BULK_BATCH_SIZE)))
    while processed < max_items:
        with transaction.atomic():
            query = SMSCampaignRecipient.objects.filter(status='pending', campaign__status__in=['queued', 'processing']).order_by('pk')
            if connection.features.has_select_for_update_skip_locked:
                query = query.select_for_update(skip_locked=True)
            else:
                query = query.select_for_update()
            first = query.select_related('campaign').first()
            if first is None:
                break
            claim_query = query.filter(campaign_id=first.campaign_id)
            if first.campaign.send_method != 'keywords':
                claim_query = claim_query.filter(pk=first.pk)
            claimed = list(claim_query[:min(max_items - processed, settings.SMS_BULK_BATCH_SIZE)])
            if not claimed:
                break
            for row in claimed:
                row.status = 'processing'; row.attempts += 1
                row.save(update_fields=['status', 'attempts', 'updated_at'])
            SMSCampaign.objects.filter(pk=first.campaign_id, status='queued').update(status='processing')
            claimed_ids = [row.pk for row in claimed]
        items = list(SMSCampaignRecipient.objects.filter(pk__in=claimed_ids).select_related('representative', 'recipient_user', 'campaign', 'campaign__pattern'))
        eligible = []
        for item in items:
            if item.recipient_user_id and (not item.recipient_user.is_active or not item.recipient_user.is_staff):
                SMSCampaignRecipient.objects.filter(pk=item.pk, status='processing').update(status='canceled', error_message='Panel account is no longer active')
                continue
            if item.representative_id:
                from partners.models import RepresentativeProfile
                if not RepresentativeProfile.objects.filter(representative_id=item.representative_id, sms_consent=True).exists():
                    SMSCampaignRecipient.objects.filter(pk=item.pk, status='processing').update(status='canceled', error_message='Marketing consent withdrawn')
                    continue
            if not item.phone_number:
                SMSCampaignRecipient.objects.filter(pk=item.pk, status='processing').update(status='failed', error_message='Missing phone number')
                continue
            eligible.append(item)
        if eligible and first.campaign.send_method == 'keywords':
            try:
                result = farazsms_send_keywords(first.campaign, eligible)
                updates = {'status': result['state'], 'provider_request_id': result.get('request_id', ''), 'error_message': result.get('error', ''),
                    'submitted_at': timezone.now() if result['state'] == 'submitted' else None}
            except Exception as exc:
                updates = {'status': 'failed', 'error_message': str(exc)[:500]}
            SMSCampaignRecipient.objects.filter(pk__in=[item.pk for item in eligible], status='processing').update(**updates)
        else:
            for item in eligible:
                try:
                    if item.campaign.send_method == 'pattern':
                        if not item.campaign.pattern_id or item.campaign.pattern.state != 'approved':
                            raise ValueError('Pattern is not approved in the provider panel.')
                        result = farazsms_send_pattern(item.phone_number, item.campaign.pattern, item.attributes)
                    else:
                        result = farazsms_send(item.phone_number, item.rendered_message)
                    updates = {'status': result['state'], 'provider_request_id': result.get('request_id', ''),
                        'error_message': result.get('error', ''), 'submitted_at': timezone.now() if result['state'] == 'submitted' else None}
                except requests.RequestException as exc:
                    updates = {'status': 'failed', 'error_message': str(exc)[:500]}
                except Exception as exc:
                    updates = {'status': 'failed', 'error_message': str(exc)[:500]}
                SMSCampaignRecipient.objects.filter(pk=item.pk, status='processing').update(**updates)
        processed += len(claimed_ids)
    for campaign in SMSCampaign.objects.filter(status__in=['queued','processing']):
        if not campaign.recipients.filter(status__in=['pending','processing']).exists():
            campaign.status='finished';campaign.save(update_fields=['status','updated_at'])
    return processed
