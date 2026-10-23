import csv
import io
import re
from datetime import date
from decimal import Decimal, InvalidOperation
from django.contrib.auth.models import Group, Permission
from django.db import transaction
from django.db.models import Q, Sum, Count
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.models import Representative, User
from partners.models import RepresentativeProfile
from .models import SalesSnapshot, SalesImportBatch, DiscountRule, RepresentativeReward, SMSCampaign, SMSCampaignRecipient, SMSPattern
from .services import render_message, render_template, normalize_phone


def can(user, permission):
    if not (user.is_authenticated and user.is_active and user.is_staff):return False
    if user.is_superuser or user.has_perm(permission):return True
    groups={g for g in user.groups.values_list('name',flat=True)}
    if permission in {'sms_campaigns.view_sms_results','sms_campaigns.view_smscampaign','sms_campaigns.view_smscampaignrecipient'}:
        return bool(groups & {'sms_campaign_managers','sms_campaign_viewers','sms_campaign_administrators'})
    if permission in {'sms_campaigns.manage_sms_campaigns','sms_campaigns.send_sms_campaign'}:
        return bool(groups & {'sms_campaign_managers','sms_campaign_administrators'})
    if permission in {'sms_campaigns.approve_sms_campaign','sms_campaigns.approve_sales_import','sms_campaigns.approve_sms_reward','sms_campaigns.activate_sms_reward'}:
        return 'sms_campaign_administrators' in groups
    return False


def normalize_balance_response(data):
    """Normalize IranPayamak balance fields across casing/nesting variants."""
    if not isinstance(data, dict):
        raise ValueError('Invalid provider balance payload')
    values = data
    for _ in range(2):
        normalized = {re.sub(r'[^a-z0-9]', '', str(key).lower()): value for key, value in values.items()}
        if 'balanceamount' in normalized and 'balancecount' in normalized:
            break
        nested = values.get('data')
        if not isinstance(nested, dict):
            break
        values = nested
    normalized = {re.sub(r'[^a-z0-9]', '', str(key).lower()): value for key, value in values.items()}
    amount = normalized.get('balanceamount')
    count = normalized.get('balancecount')
    if amount is None or count is None:
        raise ValueError('Balance fields are missing')
    details = normalized.get('details', [])
    if not isinstance(details, list):
        details = []
    return {'balanceAmount': amount, 'balanceCount': count, 'details': details}


def provider_rejection_detail(response, api_key=''):
    """Extract a short, non-secret explanation from an upstream SMS error."""
    message = ''
    try:
        payload = response.json()
    except ValueError:
        payload = None
    if isinstance(payload, dict):
        for key in ('messages', 'message', 'detail', 'errors', 'error', 'title'):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                message = value.strip()
                break
            if isinstance(value, list):
                parts = [str(item).strip() for item in value if isinstance(item, (str, int, float)) and str(item).strip()]
                if parts:
                    message = '; '.join(parts)
                    break
            if isinstance(value, dict):
                labels = {'line_number':'خط فرستنده', 'recipients':'شماره مقصد', 'text':'متن پیام'}
                parts = []
                for field, errors in value.items():
                    if isinstance(errors, str): errors = [errors]
                    if isinstance(errors, list):
                        for error in errors:
                            if isinstance(error, str) and error.strip():
                                parts.append(f"{labels.get(field, field)}: {error.strip()}")
                if parts:
                    message = '؛ '.join(parts)
                    break
    if not message:
        message = re.sub(r'<[^>]*>', ' ', getattr(response, 'text', '') or '')
        message = re.sub(r'\s+', ' ', message).strip()
    if api_key:
        message = message.replace(api_key, '[کلید حذف شد]')
    message = message[:240]
    status_code = getattr(response, 'status_code', 'نامشخص')
    detail = f'سرویس پیامک درخواست را نپذیرفت (HTTP {status_code}).'
    if message:
        detail += f' پاسخ سرویس: {message}'
    return detail


def validate_audience_filters(raw):
    if not isinstance(raw,dict):raise ValueError('فیلترها باید یک شیء معتبر باشند.')
    allowed={'province','city','status','sales_month','min_sales','max_sales','min_orders','max_orders','min_score','max_score','representative_ids','audience','user_ids','search'}
    if set(raw)-allowed:raise ValueError('فیلتر مخاطب ناشناخته است.')
    result=dict(raw)
    for key in ('province','city'):
        if result.get(key) is not None and (not isinstance(result[key],str) or len(result[key])>80):raise ValueError(f'{key} معتبر نیست.')
    if result.get('status') not in (None,'active','pending','suspended','closed'):raise ValueError('وضعیت نماینده معتبر نیست.')
    if result.get('sales_month') is not None:
        try:date.fromisoformat(str(result['sales_month'])+'-01')
        except ValueError:raise ValueError('ماه فروش باید YYYY-MM باشد.')
    for key in ('min_sales','max_sales'):
        if result.get(key) is not None:
            try:
                amount=Decimal(str(result[key]))
                if amount<0:raise ValueError()
                result[key]=str(amount)
            except (InvalidOperation,ValueError):raise ValueError(f'{key} باید عدد نامنفی باشد.')
    for key in ('min_orders','max_orders','min_score','max_score'):
        if result.get(key) is not None:
            try:value=int(result[key])
            except (TypeError,ValueError):raise ValueError(f'{key} باید عدد صحیح باشد.')
            if value<0 or (key.endswith('score') and value>100):raise ValueError(f'{key} خارج از بازه است.')
            result[key]=value
    if result.get('representative_ids') is not None:
        if not isinstance(result['representative_ids'],list) or len(result['representative_ids'])>1000:raise ValueError('فهرست نمایندگان معتبر نیست.')
        try:result['representative_ids']=list(dict.fromkeys(int(value) for value in result['representative_ids']))
        except (ValueError,TypeError):raise ValueError('شناسه نمایندگان معتبر نیست.')
    if result.get('audience') not in (None, 'representatives', 'staff'):raise ValueError('نوع مخاطب معتبر نیست.')
    if result.get('user_ids') is not None:
        if not isinstance(result['user_ids'],list) or len(result['user_ids'])>1000:raise ValueError('فهرست کاربران پنل معتبر نیست.')
        try:result['user_ids']=list(dict.fromkeys(int(value) for value in result['user_ids']))
        except (ValueError,TypeError):raise ValueError('شناسه کاربران پنل معتبر نیست.')
    if result.get('search') is not None and (not isinstance(result['search'],str) or len(result['search'])>100):raise ValueError('جست‌وجوی مخاطب معتبر نیست.')
    for lower,upper in (('min_sales','max_sales'),('min_orders','max_orders'),('min_score','max_score')):
        if result.get(lower) is not None and result.get(upper) is not None and Decimal(str(result[lower]))>Decimal(str(result[upper])):raise ValueError(f'{lower} از {upper} بیشتر است.')
    if any(result.get(key) is not None for key in ('min_sales','max_sales','min_orders','max_orders')) and not result.get('sales_month'):
        raise ValueError('برای فیلتر فروش و سفارش، ماه فروش الزامی است.')
    return result


class AccessView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    required = 'sms_campaigns.view_sms_results'
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not can(request.user, self.required):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('دسترسی مدیریت پیامک ندارید.')


class SalesImportView(AccessView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    required = 'sms_campaigns.manage_sms_campaigns'
    def post(self, request):
        uploaded = request.FILES.get('file')
        month = request.data.get('sales_month', '')
        replace_existing = str(request.data.get('replace_existing', 'false')).lower() == 'true'
        try:
            if not re.fullmatch(r'\d{4}-\d{2}', month): raise ValueError()
            year, mon = map(int, month.split('-')); month_start = date(year, mon, 1)
        except ValueError:
            return Response({'sales_month': 'فرمت ماه باید YYYY-MM باشد.'}, status=400)
        if not uploaded:
            return Response({'file': 'فایل CSV یا XLSX الزامی است.'}, status=400)
        try:
            if uploaded.name.lower().endswith('.csv'):
                rows = list(csv.DictReader(io.StringIO(uploaded.read().decode('utf-8-sig'))))
                rows = [{str(k).strip().lower(): v for k, v in row.items()} for row in rows]
            elif uploaded.name.lower().endswith('.xlsx'):
                from openpyxl import load_workbook
                sheet = load_workbook(uploaded, read_only=True, data_only=True).active
                values = sheet.iter_rows(values_only=True)
                headers = [str(x or '').strip().lower() for x in next(values)]
                rows = [dict(zip(headers, row)) for row in values]
            else: raise ValueError('فرمت فایل باید CSV یا XLSX باشد.')
        except Exception as exc:
            return Response({'file': f'خواندن فایل ناموفق بود: {exc}'}, status=400)
        errors, preview, seen = [], [], set()
        reps = {r.code: r for r in Representative.objects.filter(code__in=[str(x.get('representative_code', '')).strip() for x in rows])}
        for index, row in enumerate(rows, start=2):
            code = str(row.get('representative_code', '') or '').strip()
            try: amount = Decimal(str(row.get('net_sales_irr', '')).replace(',', '').strip())
            except (InvalidOperation, AttributeError): amount = Decimal('-1')
            orders_raw = row.get('completed_orders', '')
            try: orders = int(orders_raw) if orders_raw not in (None, '') else None
            except (ValueError, TypeError): orders = -1
            row_errors = []
            if code not in reps: row_errors.append('کد نماینده معتبر نیست.')
            if amount < 0 or amount != amount.to_integral_value(): row_errors.append('فروش خالص باید عدد صحیح نامنفی به ریال باشد.')
            if orders is not None and orders < 0: row_errors.append('تعداد سفارش باید عدد صحیح نامنفی باشد.')
            if code in seen: row_errors.append('کد نماینده در فایل تکراری است.')
            seen.add(code)
            if code in reps and SalesSnapshot.objects.filter(representative=reps[code], sales_month=month_start).exists() and not replace_existing:
                row_errors.append('برای این نماینده در ماه انتخاب‌شده رکورد موجود است؛ جایگزینی را صریحاً انتخاب کنید.')
            errors.extend([{'row': index, 'code': code, 'errors': row_errors}] if row_errors else [])
            preview.append({'row': index, 'code': code, 'representative': reps[code].contact_name if code in reps else '',
                            'net_sales_irr': str(amount) if amount >= 0 else '', 'completed_orders': orders if orders is not None and orders >= 0 else None,
                            'errors': row_errors})
        batch = SalesImportBatch.objects.create(sales_month=month_start, replace_existing=replace_existing,
            preview_rows=preview, validation_errors=errors, created_by=request.user)
        return Response({'batch_id': batch.pk, 'sales_month': month, 'row_count': len(preview), 'valid': not errors, 'errors': errors, 'preview': preview}, status=201)


class SalesImportApprovalView(AccessView):
    required = 'sms_campaigns.approve_sales_import'
    def post(self, request, pk):
        with transaction.atomic():
            batch = SalesImportBatch.objects.select_for_update().filter(pk=pk, state='preview').first()
            if not batch: return Response({'detail': 'پیش‌نمایش معتبر یافت نشد.'}, status=404)
            if batch.validation_errors: return Response({'detail': 'پیش‌نمایش دارای خطاست و قابل تأیید نیست.'}, status=400)
            if batch.replace_existing:
                SalesSnapshot.objects.filter(sales_month=batch.sales_month, representative__code__in=[r['code'] for r in batch.preview_rows]).delete()
            reps = {r.code: r for r in Representative.objects.filter(code__in=[x['code'] for x in batch.preview_rows])}
            SalesSnapshot.objects.bulk_create([SalesSnapshot(representative=reps[x['code']], sales_month=batch.sales_month,
                net_sales_irr=Decimal(x['net_sales_irr']), completed_orders=x['completed_orders'], import_batch=batch) for x in batch.preview_rows])
            batch.state='approved'; batch.approved_by=request.user; batch.approved_at=timezone.now(); batch.save(update_fields=['state','approved_by','approved_at','updated_at'])
        return Response({'batch_id': batch.pk, 'status': batch.state, 'imported': len(batch.preview_rows)})


class RepresentativeFilterView(AccessView):
    required='sms_campaigns.manage_sms_campaigns'
    def get(self, request):
        return self._filter(request,request.query_params)
    def post(self,request):
        return self._filter(request,request.data)
    def _filter(self,request,params):
        qs=Representative.objects.all()
        search=str(params.get('search','')).strip()
        if search: qs=qs.filter(Q(code__icontains=search)|Q(contact_name__icontains=search)|Q(company_name__icontains=search)|Q(phone__icontains=search))
        for key in ('province','city','status'):
            if params.get(key): qs=qs.filter(**{key:params[key]})
        month=params.get('sales_month')
        if month:
            try: m=date.fromisoformat(month+'-01')
            except ValueError: return Response({'sales_month':'فرمت YYYY-MM معتبر نیست.'},status=400)
            min_sales=params.get('min_sales'); max_sales=params.get('max_sales')
            snaps=SalesSnapshot.objects.filter(sales_month=m)
            if min_sales: snaps=snaps.filter(net_sales_irr__gte=min_sales)
            if max_sales: snaps=snaps.filter(net_sales_irr__lte=max_sales)
            if params.get('min_orders'): snaps=snaps.filter(completed_orders__gte=params['min_orders'])
            if params.get('max_orders'): snaps=snaps.filter(completed_orders__lte=params['max_orders'])
            qs=qs.filter(pk__in=snaps.values('representative_id'))
        results=[]
        profiles={p.representative_id:p for p in RepresentativeProfile.objects.filter(representative_id__in=qs.values('id'))}
        min_score=params.get('min_score');max_score=params.get('max_score')
        if min_score or max_score:
            qs=qs.filter(pk__in=[rid for rid,p in profiles.items() if p.performance_score is not None and (not min_score or p.performance_score>=int(min_score)) and (not max_score or p.performance_score<=int(max_score))])
        for rep in qs.order_by('company_name')[:500]:
            profile=profiles.get(rep.pk)
            results.append({'id':rep.pk,'code':rep.code,'name':rep.contact_name,'company_name':rep.company_name,'phone':rep.phone,
                'province':rep.province,'city':rep.city,'status':rep.status,'performance_score':profile.performance_score if profile else None,
                'sms_consent':profile.sms_consent if profile else False})
        return Response({'count':len(results),'results':results})


class RepresentativeSelectionPreviewView(RepresentativeFilterView):
    def post(self,request):
        result=self._filter(request,request.data)
        if result.status_code>=400:return result
        rows=result.data['results']
        selected=set(map(int,request.data.get('representative_ids',[])))
        if selected:rows=[row for row in rows if row['id'] in selected]
        return Response({'count':len(rows),'representative_ids':[row['id'] for row in rows],'preview':rows[:10]})


class RepresentativeSalesSummaryView(AccessView):
    required='sms_campaigns.view_sms_results'
    def get(self,request):
        month=request.query_params.get('sales_month')
        try:m=date.fromisoformat(month+'-01')
        except (TypeError,ValueError):return Response({'sales_month':'فرمت YYYY-MM الزامی است.'},status=400)
        records=SalesSnapshot.objects.filter(sales_month=m).values('representative__id','representative__code','representative__contact_name','representative__province','representative__city','net_sales_irr','completed_orders').order_by('-net_sales_irr')
        return Response({'sales_month':month,'count':records.count(),'results':list(records[:500])})


def _pattern_variables_valid(variables):
    if not isinstance(variables, list) or len(variables) > 12:
        raise ValueError('فیلدهای پترن معتبر نیستند.')
    cleaned=[]; seen=set()
    for item in variables:
        if not isinstance(item,dict):raise ValueError('ساختار فیلد پترن معتبر نیست.')
        name=str(item.get('var','')).strip()
        source=str(item.get('source','')).strip()
        if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,39}',name) or name in seen:raise ValueError('نام فیلد پترن نامعتبر یا تکراری است.')
        if source not in {'name','code','sales','product_name','product_link'}:raise ValueError('منبع فیلد پترن معتبر نیست.')
        try:length=int(item.get('length',50))
        except (TypeError,ValueError):raise ValueError('حداکثر طول فیلد پترن معتبر نیست.')
        if length<1 or length>500:raise ValueError('حداکثر طول فیلد پترن باید بین ۱ تا ۵۰۰ باشد.')
        value_type=str(item.get('type','str'))
        if value_type not in {'int','str','date'}:raise ValueError('نوع فیلد پترن معتبر نیست.')
        seen.add(name);cleaned.append({'var':name,'source':source,'length':length,'type':value_type})
    return cleaned


class SMSPatternView(AccessView):
    required='sms_campaigns.view_sms_results'

    def get(self,request):
        return Response({'results':[{'id':x.pk,'code':x.code,'text':x.text,'description':x.description,'category':x.category,
            'variables':x.variables,'state':x.state,'synced_at':x.synced_at} for x in SMSPattern.objects.order_by('-created_at')[:100]]})

    def post(self,request,pk=None,action=None):
        if pk is not None:return self.post_action(request,pk,action)
        if not can(request.user,'sms_campaigns.manage_sms_campaigns'):return Response({'detail':'Manager permission required.'},status=403)
        text=str(request.data.get('text','')).strip();description=str(request.data.get('description','')).strip()
        try:
            variables=_pattern_variables_valid(request.data.get('variables',[]))
            category=int(request.data.get('category',255))
            if category not in {1,2,3,255}:raise ValueError('دسته‌بندی پترن معتبر نیست.')
            names=set(re.findall(r'%([^%]+)%',text))
            if not text or names!={item['var'] for item in variables} or text.count('%')!=2*len(names):raise ValueError('متن و متغیرهای پترن باید دقیقاً با هم تطبیق داشته باشند.')
            for item in variables:
                source_value={'name':'نمونه مخاطب','code':'FR-001','sales':'1000','product_name':'محصول نمونه','product_link':'https://example.com'}[item['source']]
                if len(source_value)>item['length']:raise ValueError(f"مقدار نمونهٔ {item['var']} از طول مجاز بیشتر است.")
        except (ValueError,TypeError) as exc:return Response({'detail':str(exc)},status=400)
        try:
            from .services import farazsms_create_pattern
            code=farazsms_create_pattern(text,description,category,variables)
        except Exception as exc:
            import requests
            if isinstance(exc,requests.Timeout):return Response({'detail':'پاسخ ساخت پترن دیر رسید؛ وضعیت پنل FarazSMS را پیش از تلاش مجدد بررسی کنید.'},status=504)
            return Response({'detail':'ساخت پترن در FarazSMS ناموفق بود؛ اتصال و اطلاعات پترن را بررسی کنید.'},status=502)
        pattern,_=SMSPattern.objects.update_or_create(code=code,defaults={'text':text,'description':description,'category':category,
            'variables':variables,'state':SMSPattern.State.PENDING,'synced_at':None,'created_by':request.user,'approved_by':None,'approved_at':None})
        return Response({'id':pattern.pk,'code':pattern.code,'state':pattern.state,'detail':'پترن ثبت شد؛ تأیید نهایی را در پنل FarazSMS انجام دهید.'},status=201)

    def post_action(self,request,pk,action):
        if not can(request.user,'sms_campaigns.manage_sms_campaigns'):return Response({'detail':'Manager permission required.'},status=403)
        pattern=SMSPattern.objects.filter(pk=pk).first()
        if not pattern:return Response({'detail':'پترن یافت نشد.'},status=404)
        if action=='sync':
            try:
                from .services import farazsms_get_pattern
                remote=farazsms_get_pattern(pattern.code)
            except Exception:
                return Response({'detail':'همگام‌سازی پترن با FarazSMS ناموفق بود.'},status=502)
            remote_text=remote.get('text') if isinstance(remote,dict) else None
            attrs=(remote.get('attributes') or remote.get('vars') or []) if isinstance(remote,dict) else []
            remote_names={str(item.get('name') or item.get('var')) for item in attrs if isinstance(item,dict)}
            local_names={item['var'] for item in pattern.variables}
            matched=remote_text==pattern.text and remote_names==local_names
            pattern.synced_at=timezone.now()
            if not matched:
                pattern.state=SMSPattern.State.REVIEW;pattern.approved_at=None;pattern.approved_by=None
            elif pattern.state==SMSPattern.State.REVIEW:
                pattern.state=SMSPattern.State.PENDING
            pattern.save(update_fields=['synced_at','state','approved_at','approved_by','updated_at'])
            return Response({'id':pattern.pk,'state':pattern.state,'matches':matched,'detail':'جزئیات پترن با سرویس بررسی شد؛ وضعیت تأیید ارسال را خودکار تعیین نمی‌کند.'})
        if action=='mark-approved':
            if not can(request.user,'sms_campaigns.approve_sms_campaign'):return Response({'detail':'دسترسی مدیر تأیید لازم است.'},status=403)
            if request.data.get('provider_approved') is not True or not pattern.synced_at or pattern.state==SMSPattern.State.REVIEW:
                return Response({'detail':'ابتدا پترن را در FarazSMS تأیید کنید، همگام‌سازی موفق انجام دهید و تأیید را صریحاً ثبت کنید.'},status=409)
            pattern.state=SMSPattern.State.APPROVED;pattern.approved_by=request.user;pattern.approved_at=timezone.now()
            pattern.save(update_fields=['state','approved_by','approved_at','updated_at'])
            return Response({'id':pattern.pk,'state':pattern.state})
        return Response({'detail':'عملیات پترن ناشناخته است.'},status=404)


class SMSCampaignOptionsView(AccessView):
    required='sms_campaigns.manage_sms_campaigns'
    def get(self,request):
        months=list(SalesSnapshot.objects.order_by('-sales_month').values_list('sales_month',flat=True).distinct()[:36])
        return Response({'sales_months':[x.strftime('%Y-%m') for x in months],
            'latest_sales_month':months[0].strftime('%Y-%m') if months else ''})


class SMSAudienceView(AccessView):
    required='sms_campaigns.manage_sms_campaigns'
    def get(self,request):
        kind=request.query_params.get('kind','representatives');term=request.query_params.get('q','').strip()[:100]
        if kind=='staff':
            qs=User.objects.filter(is_staff=True,is_active=True)
            if term:qs=qs.filter(Q(first_name__icontains=term)|Q(last_name__icontains=term)|Q(email__icontains=term)|Q(phone__icontains=term))
            rows=qs.order_by('first_name','last_name','pk')[:100]
            return Response({'count':qs.count(),'results':[{'id':u.pk,'name':u.get_full_name() or u.email,'phone':u.phone,'role':u.role} for u in rows]})
        if kind!='representatives':return Response({'detail':'نوع مخاطب معتبر نیست.'},status=400)
        qs=Representative.objects.filter(status='active')
        if term:qs=qs.filter(Q(code__icontains=term)|Q(contact_name__icontains=term)|Q(company_name__icontains=term)|Q(phone__icontains=term))
        rows=list(qs.order_by('company_name','pk')[:100])
        consents=set(RepresentativeProfile.objects.filter(representative_id__in=[r.pk for r in rows],sms_consent=True).values_list('representative_id',flat=True))
        return Response({'count':qs.count(),'results':[{'id':r.pk,'name':r.contact_name or r.company_name,'phone':r.phone,'code':r.code,'sms_consent':r.pk in consents} for r in rows]})


class CampaignListView(AccessView):
    required='sms_campaigns.view_sms_results'
    def get(self,request):
        return Response([{'id':c.pk,'name':c.name,'status':c.status,'send_method':c.send_method,'audience':(c.filters or {}).get('audience','representatives'),'created_at':c.created_at,'recipient_count':c.recipients.count(),'has_preview':bool(c.preview_snapshot),
            'counts':list(c.recipients.values('status').annotate(count=Count('id')))} for c in SMSCampaign.objects.order_by('-created_at')[:100]])
    def post(self,request):
        if not can(request.user,'sms_campaigns.manage_sms_campaigns'):return Response({'detail':'Manager permission required.'},status=403)
        name=str(request.data.get('name','')).strip(); template=str(request.data.get('message_template','')).strip()
        if not name or not template:return Response({'detail':'نام و متن پیام الزامی است.'},status=400)
        try:filters=validate_audience_filters(request.data.get('filters') or {})
        except ValueError as exc:return Response({'filters':str(exc)},status=400)
        method=str(request.data.get('send_method','simple'))
        if method not in {'simple','keywords','pattern'}:return Response({'send_method':'روش ارسال معتبر نیست.'},status=400)
        pattern=None
        if method=='pattern':
            pattern=SMSPattern.objects.filter(pk=request.data.get('pattern_id'),state=SMSPattern.State.APPROVED).first()
            if not pattern:return Response({'pattern_id':'پترن همگام‌شده و تأییدشده انتخاب کنید.'},status=400)
            if template!=pattern.text:return Response({'message_template':'متن باید دقیقاً با پترن تأییدشده یکسان باشد.'},status=400)
        else:
            if method=='keywords' and ('{' in template or '}' in template):
                return Response({'message_template':'برای Keywords از متغیرهای %name%، %code%، %sales%، %product_name% و %product_link% استفاده کنید.'},status=400)
            if method=='keywords':
                tokens=set(re.findall(r'%([^%]+)%',template))
                if not tokens.issubset({'name','code','sales','product_name','product_link'}) or template.count('%')!=2*len(tokens):
                    return Response({'message_template':'نام متغیرهای Keywords معتبر نیست.'},status=400)
            try:render_template(template,{key:'نمونه' for key in {'name','code','sales','product_name','product_link','representative_name','representative_code','last_month_sales','discount_percent'}})
            except ValueError as exc:return Response({'message_template':str(exc)},status=400)
        if filters.get('audience')=='staff':
            used_sources={item['source'] for item in pattern.variables} if pattern else set(re.findall(r'%([^%]+)%',template))
            if used_sources & {'code','sales','representative_code','last_month_sales'}:
                return Response({'message_template':'کد نماینده و فروش فقط برای مخاطبان نماینده در دسترس است.'},status=400)
        campaign_data=request.data.get('campaign_data') or {}
        if not isinstance(campaign_data,dict) or set(campaign_data)-{'product_name','product_link'}:return Response({'campaign_data':'اطلاعات محصول معتبر نیست.'},status=400)
        if campaign_data.get('product_link') and not re.fullmatch(r'https://[^\s]{1,500}',str(campaign_data['product_link'])):return Response({'campaign_data':'لینک محصول باید با https:// شروع شود.'},status=400)
        campaign=SMSCampaign.objects.create(name=name,message_template=template,filters=filters,campaign_data=campaign_data,
            send_method=method,pattern=pattern,created_by=request.user)
        return Response({'id':campaign.pk,'name':campaign.name,'status':campaign.status,'send_method':campaign.send_method},status=201)


class CampaignDetailView(AccessView):
    required='sms_campaigns.view_sms_results'
    def get(self,request,pk):
        campaign=SMSCampaign.objects.get(pk=pk)
        viewer=not can(request.user,'sms_campaigns.manage_sms_campaigns')
        return Response({'id':campaign.pk,'name':campaign.name,'message_template':campaign.message_template if not viewer else None,'status':campaign.status,'filters':campaign.filters,'recipient_count':campaign.recipients.count()})
    def patch(self,request,pk):
        if not can(request.user,'sms_campaigns.manage_sms_campaigns'):return Response({'detail':'Manager permission required.'},status=403)
        try:
            values={key:request.data[key] for key in ('name','message_template','filters') if key in request.data}
            if 'filters' in values:values['filters']=validate_audience_filters(values['filters'])
        except ValueError as exc:return Response({'filters':str(exc)},status=400)
        with transaction.atomic():
            campaign=SMSCampaign.objects.select_for_update().filter(pk=pk).first()
            if not campaign:return Response({'detail':'Campaign not found.'},status=404)
            if campaign.status!='draft':return Response({'detail':'Only draft campaigns can be edited.'},status=409)
            changed=any(getattr(campaign,key)!=value for key,value in values.items())
            for key,value in values.items():setattr(campaign,key,value)
            if changed:campaign.preview_snapshot=[];campaign.previewed_at=None
            campaign.save();return Response({'id':campaign.pk,'status':campaign.status})


def build_campaign_preview(campaign):
    filters=campaign.filters or {};audience=filters.get('audience','representatives');month=filters.get('sales_month')
    if not month:
        latest=SalesSnapshot.objects.order_by('-sales_month').values_list('sales_month',flat=True).first()
        month=latest.strftime('%Y-%m') if latest else None
    sales_month=date.fromisoformat(month+'-01') if month else None
    snapshots={x.representative_id:x for x in SalesSnapshot.objects.filter(sales_month=sales_month)} if sales_month else {}
    token_pairs=re.findall(r'%([^%]+)%|\{([^{}]+)\}',campaign.message_template)
    requested={a or b for a,b in token_pairs};preview=[];excluded=0

    def append_target(phone,name,code='',representative=None,user=None):
        nonlocal excluded
        if not phone:excluded+=1;return
        if representative:
            profile=RepresentativeProfile.objects.filter(representative_id=representative.pk).first()
            if not profile or not profile.sms_consent:excluded+=1;return
            snapshot=snapshots.get(representative.pk)
            if requested & {'sales','last_month_sales'} and not snapshot:excluded+=1;return
            sales=str(snapshot.net_sales_irr) if snapshot else ''
        else:sales=''
        try:phone=normalize_phone(phone)
        except ValueError:excluded+=1;return
        values={'name':name,'code':code,'sales':sales,'product_name':campaign.campaign_data.get('product_name',''),
            'product_link':campaign.campaign_data.get('product_link',''),'representative_name':name,
            'representative_code':code,'last_month_sales':sales,'discount_percent':''}
        if campaign.send_method=='pattern':
            if not campaign.pattern or campaign.pattern.state!='approved':raise ValueError('یک پترن تأییدشده انتخاب کنید.')
            attrs={v['var']:str(values.get(v['source'],'')) for v in campaign.pattern.variables}
            for variable in campaign.pattern.variables:
                value=attrs[variable['var']]
                if not value:raise ValueError(f"برای فیلد پترن {variable['var']} مقدار لازم است.")
                if len(value)>variable['length']:raise ValueError(f"مقدار {variable['var']} از طول مجاز پترن بیشتر است.")
            message=render_template(campaign.message_template,attrs,allowed_tokens=attrs.keys())
        else:
            attrs={key:str(values.get(key,'')) for key in requested if key in {'name','code','sales','product_name','product_link'}}
            message=render_template(campaign.message_template,values)
        if any(len(value)>500 for value in attrs.values()):excluded+=1;return
        preview.append({'representative_id':representative.pk if representative else None,'user_id':user.pk if user else None,
            'recipient_name':name,'phone_number':phone,'message':message,'attributes':attrs})

    if audience=='staff':
        users=User.objects.filter(is_staff=True,is_active=True)
        if filters.get('user_ids') is not None:users=users.filter(pk__in=filters['user_ids'])
        for user in users.order_by('pk'):
            append_target(user.phone,user.get_full_name().strip() or user.username,user=user)
    else:
        qs=Representative.objects.filter(status=filters.get('status','active')).select_related('user')
        for key in ('province','city'):
            if filters.get(key):qs=qs.filter(**{key:filters[key]})
        if filters.get('representative_ids') is not None:qs=qs.filter(pk__in=filters['representative_ids'])
        if filters.get('search'):
            term=filters['search'];qs=qs.filter(Q(code__icontains=term)|Q(contact_name__icontains=term)|Q(company_name__icontains=term))
        if sales_month:
            snapshots_qs=SalesSnapshot.objects.filter(sales_month=sales_month)
            for key,field,op in [('min_sales','net_sales_irr','gte'),('max_sales','net_sales_irr','lte'),('min_orders','completed_orders','gte'),('max_orders','completed_orders','lte')]:
                if filters.get(key) is not None:snapshots_qs=snapshots_qs.filter(**{f'{field}__{op}':filters[key]})
            if any(filters.get(key) is not None for key in ('min_sales','max_sales','min_orders','max_orders')):
                qs=qs.filter(pk__in=snapshots_qs.values('representative_id'))
        min_score=filters.get('min_score');max_score=filters.get('max_score')
        if min_score is not None or max_score is not None:
            profiles={x.representative_id:x for x in RepresentativeProfile.objects.filter(representative_id__in=qs.values('id'))}
            qs=qs.filter(pk__in=[rid for rid,p in profiles.items() if p.performance_score is not None and
                (min_score is None or p.performance_score>=int(min_score)) and (max_score is None or p.performance_score<=int(max_score))])
        for rep in qs.order_by('pk'):
            append_target(rep.phone,rep.contact_name or rep.company_name,rep.code,representative=rep)
    return preview,excluded,month


class CampaignActionView(AccessView):
    required='sms_campaigns.view_sms_results'
    def post(self,request,pk,action):
        if not can(request.user,'sms_campaigns.manage_sms_campaigns'):return Response({'detail':'Manager permission required.'},status=403)
        campaign=SMSCampaign.objects.get(pk=pk)
        if action=='estimate-cost':
            from django.conf import settings
            from .services import provider_configuration,provider_is_ready
            if not campaign.preview_snapshot:return Response({'detail':'Preview audience before estimating.'},status=409)
            texts=[x['message'] for x in campaign.preview_snapshot]
            provider=provider_configuration()
            if not provider_is_ready():return Response({'detail':'اتصال پیامک فعال نیست.'},status=409)
            import requests
            peers=[]
            for text in texts:
                for peer in peers:
                    if peer['text']==text:peer['receiver_count']+=1;break
                else:peers.append({'text':text,'receiver_count':1})
            response=requests.post(f'{settings.FARAZSMS_BASE_URL}/ws/v1/sms/calculate-cost/peer-to-peer',json={'line_number':provider['sender_line'],'number_format':'persian','peers':peers},headers={'Api-Key':provider['api_key']},timeout=(4,12))
            response.raise_for_status();return Response(response.json())
        if action=='send-test':
            from .services import farazsms_send,provider_is_ready
            try:connected=provider_is_ready()
            except RuntimeError:connected=False
            if not connected:return Response({'detail':'اتصال پیامک فعال نیست؛ ابتدا تنظیمات را تکمیل و بررسی کنید.'},status=409)
            phone=str(request.data.get('phone','')).strip()
            if not re.fullmatch(r'\+?[0-9]{10,15}',phone):return Response({'detail':'شماره مقصد معتبر نیست.'},status=400)
            sample=campaign.preview_snapshot[0]['message'] if campaign.preview_snapshot else campaign.message_template
            try:return Response(farazsms_send(phone,str(request.data.get('message',sample))))
            except Exception:return Response({'detail':'ارسال پیام آزمایشی ناموفق بود؛ وضعیت اتصال را بررسی کنید.'},status=502)
        if action in ('preview','approve'):
            if campaign.status!='draft': return Response({'detail':'Campaign is no longer a draft.'},status=409)
            if action=='approve':
                if not can(request.user,'sms_campaigns.approve_sms_campaign'):return Response({'detail':'Approval permission required.'},status=403)
                if not campaign.preview_snapshot:return Response({'detail':'Create a valid audience preview before approval.'},status=409)
                with transaction.atomic():
                    campaign=SMSCampaign.objects.select_for_update().get(pk=pk)
                    if campaign.status!='draft':return Response({'detail':'Campaign is no longer a draft.'},status=409)
                    rep_ids=[item['representative_id'] for item in campaign.preview_snapshot if item.get('representative_id')]
                    user_ids=[item['user_id'] for item in campaign.preview_snapshot if item.get('user_id')]
                    reps={rep.pk:rep for rep in Representative.objects.filter(pk__in=rep_ids,status='active')}
                    users={user.pk:user for user in User.objects.filter(pk__in=user_ids,is_staff=True,is_active=True)}
                    if len(reps)!=len(rep_ids) or len(users)!=len(user_ids):return Response({'detail':'یکی از مخاطبان پیش‌نمایش دیگر در دسترس نیست.'},status=409)
                    for row in campaign.preview_snapshot:
                        SMSCampaignRecipient.objects.create(campaign=campaign,representative=reps.get(row.get('representative_id')),
                            recipient_user=users.get(row.get('user_id')),recipient_name=row['recipient_name'],phone_number=row['phone_number'],
                            rendered_message=row['message'],attributes=row.get('attributes',{}))
                    campaign.status='approved';campaign.audience_frozen_at=timezone.now();campaign.approved_by=request.user;campaign.approved_at=timezone.now();campaign.save()
                return Response({'status':'approved','recipient_count':len(campaign.preview_snapshot)})
            try:preview,excluded,month=build_campaign_preview(campaign)
            except ValueError as exc:return Response({'detail':str(exc)},status=400)
            with transaction.atomic():
                campaign=SMSCampaign.objects.select_for_update().get(pk=pk)
                if campaign.status!='draft':return Response({'detail':'Campaign is no longer a draft.'},status=409)
                campaign.preview_snapshot=preview
                campaign.previewed_at=timezone.now();campaign.save(update_fields=['preview_snapshot','previewed_at','updated_at'])
            if action=='preview':return Response({'count':len(preview),'excluded_count':excluded,'sales_month':month,'preview':[{'code':(Representative.objects.filter(pk=row['representative_id']).values_list('code',flat=True).first() if row.get('representative_id') else ''),'name':row['recipient_name'],'phone':row['phone_number'],'message':row['message']} for row in preview[:10]]})
            if not preview:return Response({'detail':'No eligible recipients.'},status=400)
            return Response({'detail':'Create and review the preview before campaign approval.'},status=409)
        if action=='send':
            if campaign.status!='approved':return Response({'detail':'Campaign must be approved before sending.'},status=409)
            if not can(request.user,'sms_campaigns.send_sms_campaign'):return Response({'detail':'Send permission required.'},status=403)
            from .services import provider_is_ready
            try:connected=provider_is_ready()
            except RuntimeError:connected=False
            if not connected:return Response({'detail':'اتصال پیامک فعال نیست؛ کارزار در صف قرار نگرفت.'},status=409)
            with transaction.atomic():
                campaign=SMSCampaign.objects.select_for_update().get(pk=pk)
                if campaign.status!='approved':return Response({'detail':'Campaign already queued.'},status=409)
                campaign.status='queued';campaign.queued_by=request.user;campaign.queued_at=timezone.now();campaign.save(update_fields=['status','queued_by','queued_at','updated_at'])
            return Response({'status':'queued'})
        if action=='cancel':
            with transaction.atomic():
                campaign=SMSCampaign.objects.select_for_update().get(pk=pk)
                if campaign.status not in ('approved','queued','processing'):return Response({'detail':'Campaign cannot be canceled.'},status=409)
                campaign.recipients.filter(status='pending').update(status='canceled',error_message='Canceled by authorized manager')
                campaign.status='canceled';campaign.canceled_by=request.user;campaign.canceled_at=timezone.now();campaign.save(update_fields=['status','canceled_by','canceled_at','updated_at'])
            return Response({'status':'canceled'})
        return Response({'detail':'Unknown action.'},status=404)

    def get(self,request,pk,action):
        if action!='delivery-status':return Response({'detail':'Unknown action.'},status=404)
        campaign=SMSCampaign.objects.get(pk=pk)
        provider_checks=[]
        if can(request.user,'sms_campaigns.manage_sms_campaigns'):
            from django.conf import settings
            from .services import farazsms_request_items
            from .services import provider_configuration
            try:provider=provider_configuration();live=provider['mode']=='live' and bool(provider['api_key'])
            except RuntimeError:live=False
            if live:
                for request_id in campaign.recipients.filter(status='submitted').exclude(provider_request_id='').values_list('provider_request_id',flat=True).distinct()[:50]:
                    try:
                        # Provider docs do not define the returned per-recipient delivery schema.
                        # Fetch only for reconciliation visibility; never infer delivery states.
                        farazsms_request_items(request_id)
                        provider_checks.append({'request_id':request_id,'status':'unconfirmed'})
                    except Exception:
                        provider_checks.append({'request_id':request_id,'status':'unconfirmed'})
        if not can(request.user,'sms_campaigns.manage_sms_campaigns'):
            return Response({'campaign':campaign.status,'counts':list(campaign.recipients.values('status').annotate(count=Count('id')))} )
        return Response({'campaign':campaign.status,'counts':list(campaign.recipients.values('status').annotate(count=Count('id'))),
            'unconfirmed_provider_states':campaign.recipients.filter(status__in=['submitted','unknown']).count(),'provider_checks':provider_checks})


class CampaignRecipientsView(AccessView):
    def get(self,request,pk):
        if not can(request.user,'sms_campaigns.manage_sms_campaigns'):
            qs=SMSCampaignRecipient.objects.filter(campaign_id=pk)
            stats=list(qs.values('status').annotate(count=Count('id')))
            return Response({'results':stats})
        qs=SMSCampaignRecipient.objects.filter(campaign_id=pk).select_related('representative','recipient_user').order_by('pk')
        return Response({'results':[{'id':x.pk,'representative':x.recipient_name or (x.representative.contact_name if x.representative_id else ''),
            'code':x.representative.code if x.representative_id else '','phone':x.phone_number,'message':x.rendered_message,'status':x.status,
            'provider_request_id':x.provider_request_id,'error':x.error_message} for x in qs]})


class RewardView(AccessView):
    required='sms_campaigns.manage_sms_campaigns'
    def get(self,request):
        return Response({'rules':list(DiscountRule.objects.values('id','name','min_sales_irr','max_sales_irr','discount_percent','active')),
            'rewards':[{'id':r.pk,'representative':r.representative.contact_name,'sales_month':r.sales_month,'sales_amount_irr':r.sales_amount_irr,'discount_percent':r.discount_percent,'status':r.state} for r in RepresentativeReward.objects.select_related('representative').order_by('-created_at')[:200]]})
    def post(self,request,action=None,pk=None):
        if action=='rules':
            if not can(request.user,'sms_campaigns.approve_sms_reward'):return Response({'detail':'Reward administrator permission required.'},status=403)
            try:
                minimum=Decimal(str(request.data['min_sales_irr']));maximum=Decimal(str(request.data['max_sales_irr'])) if request.data.get('max_sales_irr') not in (None,'') else None;percent=Decimal(str(request.data['discount_percent']))
                if minimum<0 or (maximum is not None and maximum<=minimum) or percent<0 or percent>100:raise ValueError()
            except (KeyError,InvalidOperation,ValueError):return Response({'detail':'حد فروش و درصد تخفیف معتبر نیست.'},status=400)
            rule=DiscountRule.objects.create(name=str(request.data.get('name','')).strip(),min_sales_irr=minimum,max_sales_irr=maximum,discount_percent=percent)
            active=list(DiscountRule.objects.filter(active=True).order_by('min_sales_irr'))
            for left,right in zip(active,active[1:]):
                if left.max_sales_irr is None or left.max_sales_irr > right.min_sales_irr:
                    rule.delete();return Response({'detail':'Active sales tiers cannot overlap.'},status=400)
            return Response({'id':rule.pk},status=201)
        if action=='evaluate':
            try:month=date.fromisoformat(request.data.get('sales_month','')+'-01')
            except ValueError:return Response({'detail':'sales_month must be YYYY-MM.'},status=400)
            rules=list(DiscountRule.objects.filter(active=True).order_by('-min_sales_irr'))
            snapshots=list(SalesSnapshot.objects.filter(sales_month=month).select_related('representative'))
            existing=set(RepresentativeReward.objects.filter(sales_month=month,representative_id__in=[snap.representative_id for snap in snapshots]).values_list('representative_id',flat=True))
            pending=[]
            for snap in snapshots:
                rule=next((item for item in rules if item.min_sales_irr<=snap.net_sales_irr and (item.max_sales_irr is None or snap.net_sales_irr<item.max_sales_irr)),None)
                if rule and snap.representative_id not in existing:
                    pending.append(RepresentativeReward(representative=snap.representative,sales_month=month,sales_amount_irr=snap.net_sales_irr,rule=rule,discount_percent=rule.discount_percent,state='evaluated',evaluated_by=request.user))
            RepresentativeReward.objects.bulk_create(pending,ignore_conflicts=True)
            return Response({'evaluated':len(pending)})
        if action=='preview':
            try:month=date.fromisoformat(request.data.get('sales_month','')+'-01')
            except ValueError:return Response({'detail':'sales_month must be YYYY-MM.'},status=400)
            output=[]
            rules=list(DiscountRule.objects.filter(active=True).order_by('-min_sales_irr'))
            snapshots=list(SalesSnapshot.objects.filter(sales_month=month).select_related('representative'))
            existing=set(RepresentativeReward.objects.filter(sales_month=month,representative_id__in=[snap.representative_id for snap in snapshots]).values_list('representative_id',flat=True))
            for snap in snapshots:
                rule=next((item for item in rules if item.min_sales_irr<=snap.net_sales_irr and (item.max_sales_irr is None or snap.net_sales_irr<item.max_sales_irr)),None)
                if rule:output.append({'representative':snap.representative.contact_name,'code':snap.representative.code,'sales_amount_irr':str(snap.net_sales_irr),'rule':rule.name,'discount_percent':str(rule.discount_percent),'already_evaluated':snap.representative_id in existing})
            return Response({'count':len(output),'results':output})
        reward=RepresentativeReward.objects.filter(pk=pk).first()
        if not reward:return Response({'detail':'Reward not found.'},status=404)
        required={'assign':'sms_campaigns.manage_sms_campaigns','approve':'sms_campaigns.approve_sms_campaign','activate':'sms_campaigns.activate_sms_reward'}.get(action)
        if not required or not can(request.user,required):return Response({'detail':'Permission denied.'},status=403)
        transition={'assign':('evaluated','assigned'),'approve':('assigned','approved'),'activate':('approved','active')}.get(action)
        if reward.state!=transition[0]:return Response({'detail':'Invalid reward state transition.'},status=409)
        reward.state=transition[1]
        if action=='assign':reward.assigned_by=request.user;reward.assigned_at=timezone.now()
        if action=='approve':reward.approved_by=request.user
        if action=='activate':reward.activated_by=request.user
        reward.save();return Response({'id':reward.pk,'status':reward.state})


class SMSSettingsView(AccessView):
    required='sms_campaigns.manage_sms_campaigns'
    def get(self,request):
        from django.conf import settings
        from .models import SMSProviderConfig
        from .services import provider_configuration,encryption_key_ready,farazsms_accessible_lines,preferred_sender_line
        try:provider=provider_configuration()
        except RuntimeError as exc:provider={'mode':'mock','api_key':'','sender_line':''};provider_error=str(exc)
        else:provider_error=''
        config=SMSProviderConfig.objects.filter(pk=1).first()
        output={'mode':provider['mode'],'sender_configured':bool(provider['sender_line']),'sender_valid':False,'sender_line':provider['sender_line'],'available_lines':[],
            'api_key_configured':bool(provider['api_key']),'encryption_ready':encryption_key_ready(),'connection_error':provider_error,
            'managed_in_panel':bool(config),'batch_size':settings.SMS_BULK_BATCH_SIZE,'balance':None,'balance_error':'','sender_error':''}
        if provider['mode']=='live' and provider['api_key']:
            import requests
            try:
                response=requests.get(f'{settings.FARAZSMS_BASE_URL}/ws/v1/account/balance',headers={'Api-Key':provider['api_key']},timeout=(4,12))
                response.raise_for_status();payload=response.json()
                if not isinstance(payload,dict) or payload.get('status')!='success':raise ValueError('Invalid provider response')
                output['balance']=normalize_balance_response(payload.get('data'))
            except (requests.RequestException,ValueError):output['balance_error']='دریافت موجودی از سرویس پیامک ناموفق بود.'
            try:
                lines=farazsms_accessible_lines(provider['api_key'])
                selected=preferred_sender_line(lines,provider['sender_line'])
                output['available_lines']=lines
                output['sender_line']=selected
                output['sender_configured']=bool(selected)
                output['sender_valid']=bool(selected)
                if config and selected and config.sender_line!=selected:
                    SMSProviderConfig.objects.filter(pk=config.pk).update(sender_line=selected)
            except (requests.RequestException,ValueError):output['sender_error']='دریافت خطوط مجاز ارسال از سرویس پیامک ناموفق بود.'
        return Response(output)

    def patch(self,request):
        from django.conf import settings
        from .models import SMSProviderConfig
        from .services import encrypt_provider_key,encryption_key_ready,provider_configuration,farazsms_accessible_lines,preferred_sender_line
        if not can(request.user,'sms_campaigns.approve_sms_campaign'):
            return Response({'detail':'تغییر تنظیمات اتصال فقط برای مدیر پیامک مجاز است.'},status=403)
        current=SMSProviderConfig.objects.filter(pk=1).first()
        if request.data.get('enabled') is False:
            if not current:return Response({'detail':'تنظیمات ذخیره‌شده‌ای برای غیرفعال‌کردن وجود ندارد.'},status=409)
            current.enabled=False;current.updated_by=request.user;current.save(update_fields=['enabled','updated_by','updated_at'])
            return Response({'enabled':False,'mode':'mock'})
        if not encryption_key_ready():
            return Response({'detail':'کلید رمزگذاری SMS_CONFIG_ENCRYPTION_KEY در محیط Backend معتبر نیست.'},status=503)
        api_key=str(request.data.get('api_key','')).strip()
        if not api_key and current and current.enabled:
            try:api_key=provider_configuration()['api_key']
            except RuntimeError:return Response({'detail':'کلید ذخیره‌شده قابل رمزگشایی نیست؛ کلید API را دوباره وارد کنید.'},status=409)
        if not api_key or len(api_key)>512:return Response({'detail':'کلید API معتبر الزامی است.'},status=400)
        try:
            import requests
            response=requests.get(f'{settings.FARAZSMS_BASE_URL}/ws/v1/account/balance',headers={'Api-Key':api_key},timeout=(4,12))
            response.raise_for_status();payload=response.json()
            if not isinstance(payload,dict) or payload.get('status')!='success' or not isinstance(payload.get('data'),dict):
                return Response({'detail':'اطلاعات اتصال تأیید نشد؛ کلید API را بررسی کنید.'},status=400)
            lines=farazsms_accessible_lines(api_key)
            requested_line=str(request.data.get('sender_line',current.sender_line if current else '')).strip()
            sender_line=preferred_sender_line(lines,requested_line)
            if not sender_line:return Response({'detail':'برای این حساب هیچ خط مجاز ارسال پیدا نشد.'},status=422)
        except requests.Timeout:return Response({'detail':'مهلت بررسی اتصال تمام شد؛ دوباره تلاش کنید.'},status=504)
        except (requests.RequestException,ValueError):return Response({'detail':'بررسی API Key یا دریافت خطوط مجاز حساب ناموفق بود.'},status=502)
        try:encrypted=encrypt_provider_key(api_key)
        except RuntimeError as exc:return Response({'detail':str(exc)},status=503)
        config,_=SMSProviderConfig.objects.update_or_create(pk=1,defaults={
            'api_key_encrypted':encrypted,'sender_line':sender_line,'enabled':True,'updated_by':request.user,
        })
        return Response({'enabled':config.enabled,'sender_configured':True,'sender_line':sender_line,'api_key_configured':True})


class DiscountRuleDetailView(AccessView):
    required='sms_campaigns.manage_sms_campaigns'
    def patch(self,request,pk):
        if not can(request.user,'sms_campaigns.approve_sms_reward'):return Response({'detail':'Reward administrator permission required.'},status=403)
        rule=DiscountRule.objects.filter(pk=pk).first()
        if not rule:return Response({'detail':'Rule not found.'},status=404)
        try:
            minimum=Decimal(str(request.data.get('min_sales_irr',rule.min_sales_irr)));maximum=Decimal(str(request.data.get('max_sales_irr',rule.max_sales_irr))) if request.data.get('max_sales_irr',rule.max_sales_irr) not in (None,'') else None;percent=Decimal(str(request.data.get('discount_percent',rule.discount_percent)))
            if minimum<0 or (maximum is not None and maximum<=minimum) or percent<0 or percent>100:raise ValueError()
        except (InvalidOperation,ValueError):return Response({'detail':'حد فروش و درصد تخفیف معتبر نیست.'},status=400)
        proposed_active=bool(request.data.get('active',rule.active))
        active=list(DiscountRule.objects.filter(active=True).exclude(pk=rule.pk))
        if proposed_active:active.append(rule)
        active.sort(key=lambda x:(minimum if x.pk==rule.pk else x.min_sales_irr))
        for left,right in zip(active,active[1:]):
            left_max=maximum if left.pk==rule.pk else left.max_sales_irr
            right_min=minimum if right.pk==rule.pk else right.min_sales_irr
            if left_max is None or left_max>right_min:return Response({'detail':'قواعد فعال نباید هم‌پوشانی داشته باشند.'},status=400)
        rule.name=str(request.data.get('name',rule.name)).strip();rule.min_sales_irr=minimum;rule.max_sales_irr=maximum;rule.discount_percent=percent;rule.active=proposed_active;rule.save()
        return Response({'id':rule.pk,'status':'updated'})


class SMSUtilityView(AccessView):
    required='sms_campaigns.manage_sms_campaigns'
    def post(self,request,action):
        from django.conf import settings
        from .services import farazsms_send,provider_configuration,provider_is_ready
        if action=='estimate':
            message=str(request.data.get('message',''))
            count=int(request.data.get('recipient_count',0))
            if not message or count<0:return Response({'detail':'متن و تعداد معتبر الزامی است.'},status=400)
            provider=provider_configuration()
            if not provider_is_ready():return Response({'detail':'اتصال پیامک فعال نیست.'},status=409)
            import requests
            response=requests.post(f'{settings.FARAZSMS_BASE_URL}/ws/v1/sms/calculate-cost',json={'text':message,'receiver_count':count,'line_number':provider['sender_line'],'number_format':'english'},headers={'Api-Key':provider['api_key']},timeout=(4,12))
            response.raise_for_status();return Response(response.json())
        if action=='test':
            from .services import provider_configuration
            phone=str(request.data.get('phone','')).strip();message=str(request.data.get('message','')).strip()
            if not re.fullmatch(r'\+?[0-9]{10,15}',phone) or not message:return Response({'detail':'شماره معتبر و متن پیام الزامی است.'},status=400)
            if not provider_is_ready():return Response({'detail':'اتصال پیامک فعال نیست؛ ابتدا تنظیمات را تکمیل و بررسی کنید.'},status=409)
            try:return Response(farazsms_send(phone,message))
            except RuntimeError:return Response({'detail':'تنظیمات اتصال پیامک در Backend کامل نیست؛ اتصال را دوباره بررسی کنید.'},status=409)
            except Exception as exc:
                import requests
                if isinstance(exc,requests.Timeout):
                    return Response({'detail':'پاسخ سرویس پیامک دیر رسید؛ ممکن است درخواست ثبت شده باشد. پیش از تلاش دوباره گزارش ارسال را بررسی کنید.'},status=504)
                if isinstance(exc,requests.ConnectionError):
                    return Response({'detail':'ارتباط با سرویس پیامک برقرار نشد؛ اتصال اینترنت و وضعیت سرویس را بررسی کنید.'},status=502)
                if isinstance(exc,requests.HTTPError):
                    upstream=exc.response
                    if upstream is not None:
                        if upstream.status_code>=500:
                            return Response({'detail':'سرویس پیامک موقتاً خطا داد؛ برای جلوگیری از ارسال تکراری، ابتدا گزارش ارسال را بررسی کنید.'},status=502)
                        try:api_key=provider_configuration()['api_key']
                        except RuntimeError:api_key=''
                        return Response({'detail':provider_rejection_detail(upstream,api_key)},status=502)
                    return Response({'detail':'سرویس پیامک درخواست را نپذیرفت و پاسخ خطا نداد.'},status=502)
                return Response({'detail':'ارسال پیام آزمایشی ناموفق بود؛ تنظیمات خط فرستنده و وضعیت سرویس را بررسی کنید.'},status=502)
        return Response({'detail':'Unknown action.'},status=404)
