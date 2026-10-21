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
from .models import SalesSnapshot, SalesImportBatch, DiscountRule, RepresentativeReward, SMSCampaign, SMSCampaignRecipient
from .services import render_message, normalize_phone


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


def validate_audience_filters(raw):
    if not isinstance(raw,dict):raise ValueError('فیلترها باید یک شیء معتبر باشند.')
    allowed={'province','city','status','sales_month','min_sales','max_sales','min_orders','max_orders','min_score','max_score','representative_ids'}
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


class CampaignListView(AccessView):
    required='sms_campaigns.view_sms_results'
    def get(self,request):
        return Response([{'id':c.pk,'name':c.name,'status':c.status,'created_at':c.created_at,'recipient_count':c.recipients.count(),'has_preview':bool(c.preview_snapshot),
            'counts':list(c.recipients.values('status').annotate(count=Count('id')))} for c in SMSCampaign.objects.order_by('-created_at')[:100]])
    def post(self,request):
        if not can(request.user,'sms_campaigns.manage_sms_campaigns'):return Response({'detail':'Manager permission required.'},status=403)
        name=str(request.data.get('name','')).strip(); template=str(request.data.get('message_template','')).strip()
        if not name or not template:return Response({'detail':'نام و متن پیام الزامی است.'},status=400)
        try: render_message(template, Representative(contact_name='نمونه',code='FR-DEMO'))
        except ValueError as exc:return Response({'message_template':str(exc)},status=400)
        try:filters=validate_audience_filters(request.data.get('filters') or {})
        except ValueError as exc:return Response({'filters':str(exc)},status=400)
        campaign=SMSCampaign.objects.create(name=name,message_template=template,filters=filters,created_by=request.user)
        return Response({'id':campaign.pk,'name':campaign.name,'status':campaign.status},status=201)


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


class CampaignActionView(AccessView):
    required='sms_campaigns.view_sms_results'
    def post(self,request,pk,action):
        if not can(request.user,'sms_campaigns.manage_sms_campaigns'):return Response({'detail':'Manager permission required.'},status=403)
        campaign=SMSCampaign.objects.get(pk=pk)
        if action=='estimate-cost':
            from django.conf import settings
            if not campaign.preview_snapshot:return Response({'detail':'Preview audience before estimating.'},status=409)
            texts=[x['message'] for x in campaign.preview_snapshot]
            if settings.SMS_MODE!='live':return Response({'mode':'mock','recipient_count':len(texts),'estimated_segments':sum(max(1,(len(text)+69)//70) for text in texts)})
            import requests
            peers=[]
            for text in texts:
                for peer in peers:
                    if peer['text']==text:peer['receiver_count']+=1;break
                else:peers.append({'text':text,'receiver_count':1})
            response=requests.post(f'{settings.FARAZSMS_BASE_URL}/ws/v1/sms/calculate-cost/peer-to-peer',json={'line_number':settings.FARAZSMS_SENDER_LINE,'number_format':'persian','peers':peers},headers={'Api-Key':settings.FARAZSMS_API_KEY},timeout=(4,12))
            response.raise_for_status();return Response(response.json())
        if action=='send-test':
            from .services import farazsms_send
            phone=str(request.data.get('phone','')).strip()
            if not re.fullmatch(r'\+?[0-9]{10,15}',phone):return Response({'detail':'شماره مقصد معتبر نیست.'},status=400)
            sample=campaign.preview_snapshot[0]['message'] if campaign.preview_snapshot else campaign.message_template
            try:return Response(farazsms_send(phone,str(request.data.get('message',sample))))
            except Exception as exc:return Response({'detail':str(exc)[:300]},status=502)
        if action in ('preview','approve'):
            if campaign.status!='draft': return Response({'detail':'Campaign is no longer a draft.'},status=409)
            if action=='approve':
                if not can(request.user,'sms_campaigns.approve_sms_campaign'):return Response({'detail':'Approval permission required.'},status=403)
                if not campaign.preview_snapshot:return Response({'detail':'Create a valid audience preview before approval.'},status=409)
                with transaction.atomic():
                    campaign=SMSCampaign.objects.select_for_update().get(pk=pk)
                    if campaign.status!='draft':return Response({'detail':'Campaign is no longer a draft.'},status=409)
                    ids=[item['representative_id'] for item in campaign.preview_snapshot]
                    reps={rep.pk:rep for rep in Representative.objects.filter(pk__in=ids)}
                    if len(reps)!=len(ids):return Response({'detail':'A representative in the preview no longer exists.'},status=409)
                    for row in campaign.preview_snapshot:
                        SMSCampaignRecipient.objects.create(campaign=campaign,representative=reps[row['representative_id']],phone_number=row['phone_number'],rendered_message=row['message'])
                    campaign.status='approved';campaign.audience_frozen_at=timezone.now();campaign.approved_by=request.user;campaign.approved_at=timezone.now();campaign.save()
                return Response({'status':'approved','recipient_count':len(ids)})
            filters=campaign.filters or {}
            qs=Representative.objects.filter(status=filters.get('status','active'))
            for key in ('province','city'):
                if filters.get(key):qs=qs.filter(**{key:filters[key]})
            if filters.get('representative_ids'):qs=qs.filter(pk__in=filters['representative_ids'])
            month=filters.get('sales_month')
            m=None
            if month:
                try:m=date.fromisoformat(month+'-01')
                except ValueError:return Response({'detail':'Invalid sales month.'},status=400)
                snaps=SalesSnapshot.objects.filter(sales_month=m)
                if filters.get('min_sales') is not None:snaps=snaps.filter(net_sales_irr__gte=filters['min_sales'])
                if filters.get('max_sales') is not None:snaps=snaps.filter(net_sales_irr__lte=filters['max_sales'])
                if filters.get('min_orders') is not None:snaps=snaps.filter(completed_orders__gte=filters['min_orders'])
                if filters.get('max_orders') is not None:snaps=snaps.filter(completed_orders__lte=filters['max_orders'])
                qs=qs.filter(pk__in=snaps.values('representative_id'))
            profiles={x.representative_id:x for x in RepresentativeProfile.objects.filter(representative_id__in=qs.values('id'),sms_consent=True)}
            sales_by_rep={row.representative_id:row for row in SalesSnapshot.objects.filter(sales_month=m,representative_id__in=qs.values('id'))} if m else {}
            rewards_by_rep={row.representative_id:row.discount_percent for row in RepresentativeReward.objects.filter(sales_month=m,representative_id__in=qs.values('id'),state='active')} if m else {}
            min_score=filters.get('min_score');max_score=filters.get('max_score')
            if min_score is not None or max_score is not None:
                qs=qs.filter(pk__in=[rid for rid,profile in profiles.items() if profile.performance_score is not None and (min_score is None or profile.performance_score>=int(min_score)) and (max_score is None or profile.performance_score<=int(max_score))])
            preview=[]
            for rep in qs.order_by('pk'):
                profile=profiles.get(rep.pk)
                if not profile or not rep.phone:continue
                snap=sales_by_rep.get(rep.pk)
                try: message=render_message(campaign.message_template,rep,snap.net_sales_irr if snap else 0,rewards_by_rep.get(rep.pk,''))
                except ValueError as exc:return Response({'detail':str(exc)},status=400)
                try:phone=normalize_phone(rep.phone)
                except ValueError:continue
                preview.append((rep,message,phone))
            with transaction.atomic():
                campaign=SMSCampaign.objects.select_for_update().get(pk=pk)
                if campaign.status!='draft':return Response({'detail':'Campaign is no longer a draft.'},status=409)
                campaign.preview_snapshot=[{'representative_id':r.pk,'phone_number':phone,'message':m} for r,m,phone in preview]
                campaign.previewed_at=timezone.now();campaign.save(update_fields=['preview_snapshot','previewed_at','updated_at'])
            if action=='preview':return Response({'count':len(preview),'preview':[{'code':r.code,'name':r.contact_name,'message':m} for r,m,_phone in preview[:10]]})
            if not preview:return Response({'detail':'No eligible recipients.'},status=400)
            return Response({'detail':'Create and review the preview before campaign approval.'},status=409)
        if action=='send':
            if campaign.status!='approved':return Response({'detail':'Campaign must be approved before sending.'},status=409)
            if not can(request.user,'sms_campaigns.send_sms_campaign'):return Response({'detail':'Send permission required.'},status=403)
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
            if settings.SMS_MODE=='live':
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
        qs=SMSCampaignRecipient.objects.filter(campaign_id=pk).select_related('representative').order_by('pk')
        return Response({'results':[{'id':x.pk,'representative':x.representative.contact_name,'code':x.representative.code,'phone':x.phone_number,'message':x.rendered_message,'status':x.status,'provider_request_id':x.provider_request_id,'error':x.error_message} for x in qs]})


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
        output={'mode':settings.SMS_MODE,'sender_configured':bool(settings.FARAZSMS_SENDER_LINE),'api_key_configured':bool(settings.FARAZSMS_API_KEY),'batch_size':settings.SMS_BULK_BATCH_SIZE,'balance':None}
        if settings.SMS_MODE=='live' and settings.FARAZSMS_API_KEY:
            import requests
            try:
                response=requests.get(f'{settings.FARAZSMS_BASE_URL}/ws/v1/account/balance',headers={'Api-Key':settings.FARAZSMS_API_KEY},timeout=(4,12))
                response.raise_for_status();output['balance']=response.json().get('data')
            except requests.RequestException:return Response({'detail':'دریافت موجودی از سرویس پیامک ناموفق بود.'},status=502)
        return Response(output)


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
        from .services import farazsms_send
        if action=='estimate':
            message=str(request.data.get('message',''))
            count=int(request.data.get('recipient_count',0))
            if not message or count<0:return Response({'detail':'متن و تعداد معتبر الزامی است.'},status=400)
            if settings.SMS_MODE!='live':return Response({'mode':'mock','recipient_count':count,'segments_per_message':max(1,(len(message)+69)//70),'estimated_segments':max(1,(len(message)+69)//70)*count})
            import requests
            response=requests.post(f'{settings.FARAZSMS_BASE_URL}/ws/v1/sms/calculate-cost',json={'text':message,'receiver_count':count,'line_number':settings.FARAZSMS_SENDER_LINE,'number_format':'english'},headers={'Api-Key':settings.FARAZSMS_API_KEY},timeout=(4,12))
            response.raise_for_status();return Response(response.json())
        if action=='test':
            phone=str(request.data.get('phone','')).strip();message=str(request.data.get('message','')).strip()
            if not re.fullmatch(r'\+?[0-9]{10,15}',phone) or not message:return Response({'detail':'شماره معتبر و متن پیام الزامی است.'},status=400)
            try:return Response(farazsms_send(phone,message))
            except Exception as exc:return Response({'detail':str(exc)[:300]},status=502)
        return Response({'detail':'Unknown action.'},status=404)
