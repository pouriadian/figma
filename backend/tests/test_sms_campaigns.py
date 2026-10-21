import io
from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import Group, Permission
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from accounts.models import Representative, User
from partners.models import RepresentativeProfile
from sms_campaigns.models import SalesImportBatch, SalesSnapshot, DiscountRule, RepresentativeReward, SMSCampaign, SMSCampaignRecipient
from sms_campaigns.services import process_pending, farazsms_send, render_message


@override_settings(SMS_MODE='mock')
class SMSCampaignWorkflowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user=User.objects.create_user(username='smsadmin',email='smsadmin@example.test',password='long-password-123',is_staff=True)
        cls.rep=Representative.objects.create(company_name='نمونه',contact_name='فروشگاه نمونه',phone='09120000000',email='rep@example.test',province='تهران',city='تهران',status='active')
        cls.profile=RepresentativeProfile.objects.create(representative_id=cls.rep.pk,sms_consent=True,performance_score=88)

    def setUp(self):
        self.client=APIClient();self.client.force_authenticate(self.user)

    def grant(self,*codenames):
        group,_=Group.objects.get_or_create(name='sms_campaign_administrators')
        group.permissions.set(Permission.objects.filter(content_type__app_label='sms_campaigns',codename__in=codenames))
        self.user.groups.add(group)
        self.user.__dict__.pop('_perm_cache',None)
        self.user.__dict__.pop('_group_perm_cache',None)

    def test_import_preview_does_not_write_until_approval(self):
        self.grant('manage_sms_campaigns','approve_sales_import','view_sms_results')
        file=SimpleUploadedFile('sales.csv',b'representative_code,net_sales_irr,completed_orders\n'+self.rep.code.encode()+b',1250000,4\n',content_type='text/csv')
        response=self.client.post('/api/v1/manage/sales/import-preview/',{'sales_month':'2026-09','file':file},format='multipart')
        self.assertEqual(response.status_code,201)
        batch=SalesImportBatch.objects.get(pk=response.data['batch_id'])
        self.assertEqual(batch.state,'preview');self.assertFalse(SalesSnapshot.objects.exists())
        approved=self.client.post(f'/api/v1/manage/sales/imports/{batch.pk}/approve/',{},format='json')
        self.assertEqual(approved.status_code,200)
        snapshot=SalesSnapshot.objects.get(representative=self.rep)
        self.assertEqual(snapshot.net_sales_irr,Decimal('1250000'));self.assertEqual(snapshot.completed_orders,4)

    def test_snapshot_uniqueness_and_replacement_requires_explicit_preview(self):
        self.grant('manage_sms_campaigns','approve_sales_import','view_sms_results')
        batch=SalesImportBatch.objects.create(sales_month=date(2026,9,1),created_by=self.user,preview_rows=[{'code':self.rep.code,'net_sales_irr':'100','completed_orders':None}])
        SalesSnapshot.objects.create(representative=self.rep,sales_month=date(2026,9,1),net_sales_irr=100,import_batch=batch)
        duplicate=SalesSnapshot(representative=self.rep,sales_month=date(2026,9,1),net_sales_irr=200,import_batch=batch)
        with self.assertRaises(IntegrityError), transaction.atomic():duplicate.save()
        file=SimpleUploadedFile('sales.csv',b'representative_code,net_sales_irr\n'+self.rep.code.encode()+b',200\n',content_type='text/csv')
        rejected=self.client.post('/api/v1/manage/sales/import-preview/',{'sales_month':'2026-09','file':file},format='multipart')
        self.assertFalse(rejected.data['valid'])
        replace=SimpleUploadedFile('sales.csv',b'representative_code,net_sales_irr\n'+self.rep.code.encode()+b',200\n',content_type='text/csv')
        preview=self.client.post('/api/v1/manage/sales/import-preview/',{'sales_month':'2026-09','file':replace,'replace_existing':'true'},format='multipart')
        self.assertTrue(preview.data['valid'])
        self.client.post(f"/api/v1/manage/sales/imports/{preview.data['batch_id']}/approve/",{},format='json')
        self.assertEqual(SalesSnapshot.objects.get(representative=self.rep).net_sales_irr,Decimal(200))

    def test_reward_assignment_does_not_activate_and_each_transition_is_explicit(self):
        self.grant('manage_sms_campaigns','approve_sms_reward','activate_sms_reward','view_sms_results')
        batch=SalesImportBatch.objects.create(sales_month=date(2026,9,1),created_by=self.user,state='approved')
        SalesSnapshot.objects.create(representative=self.rep,sales_month=date(2026,9,1),net_sales_irr=700,import_batch=batch)
        DiscountRule.objects.create(name='Bronze',min_sales_irr=500,discount_percent=5)
        self.assertEqual(self.client.post('/api/v1/manage/rewards/evaluate/',{'sales_month':'2026-09'},format='json').status_code,200)
        reward=RepresentativeReward.objects.get(representative=self.rep)
        self.client.post(f'/api/v1/manage/rewards/{reward.pk}/assign/',{},format='json')
        reward.refresh_from_db();self.assertEqual(reward.state,'assigned')
        approved=self.client.post(f'/api/v1/manage/rewards/{reward.pk}/approve/',{},format='json');self.assertEqual(approved.status_code,200,approved.data);reward.refresh_from_db();self.assertEqual(reward.state,'approved')
        self.client.post(f'/api/v1/manage/rewards/{reward.pk}/activate/',{},format='json');reward.refresh_from_db();self.assertEqual(reward.state,'active')

    def test_campaign_approval_freezes_rendered_message_and_worker_rechecks_consent(self):
        self.grant('manage_sms_campaigns','approve_sms_campaign','send_sms_campaign','view_sms_results')
        campaign=SMSCampaign.objects.create(name='Reward',message_template='Hello {representative_name}',created_by=self.user)
        self.client.post(f'/api/v1/manage/sms/campaigns/{campaign.pk}/preview/',{},format='json')
        self.rep.contact_name='Renamed after preview';self.rep.save(update_fields=['contact_name'])
        approved=self.client.post(f'/api/v1/manage/sms/campaigns/{campaign.pk}/approve/',{},format='json')
        self.assertEqual(approved.status_code,200)
        recipient=SMSCampaignRecipient.objects.get(campaign=campaign)
        self.assertEqual(recipient.rendered_message,'Hello فروشگاه نمونه')
        self.client.post(f'/api/v1/manage/sms/campaigns/{campaign.pk}/send/',{},format='json')
        self.profile.sms_consent=False;self.profile.save()
        self.assertEqual(process_pending(1),1)
        recipient.refresh_from_db();self.assertEqual(recipient.status,'canceled')

    def test_worker_commits_processing_claim_before_provider_call(self):
        campaign=SMSCampaign.objects.create(name='Claim',message_template='Hello',status='queued',created_by=self.user)
        recipient=SMSCampaignRecipient.objects.create(campaign=campaign,representative=self.rep,phone_number=self.rep.phone,rendered_message='Hello')
        def provider(_phone,_message):
            recipient.refresh_from_db()
            self.assertEqual(recipient.status,'processing')
            return {'state':'submitted','request_id':'mock-claim'}
        with patch('sms_campaigns.services.farazsms_send',side_effect=provider):process_pending(1)
        recipient.refresh_from_db();self.assertEqual(recipient.status,'submitted')

    def test_provider_server_error_is_unknown_but_client_rejection_is_failed(self):
        import requests
        campaign=SMSCampaign.objects.create(name='Error',message_template='Hello',status='queued',created_by=self.user)
        recipient=SMSCampaignRecipient.objects.create(campaign=campaign,representative=self.rep,phone_number=self.rep.phone,rendered_message='Hello')
        response=type('Response',(),{'status_code':503})()
        with override_settings(SMS_MODE='live',FARAZSMS_API_KEY='key',FARAZSMS_SENDER_LINE='1000'):
            with patch('sms_campaigns.services.requests.post',return_value=response):process_pending(1)
        recipient.refresh_from_db();self.assertEqual(recipient.status,'unknown')
        rejected_campaign=SMSCampaign.objects.create(name='Rejected',message_template='Hello',status='queued',created_by=self.user)
        rejected_recipient=SMSCampaignRecipient.objects.create(campaign=rejected_campaign,representative=self.rep,phone_number=self.rep.phone,rendered_message='Hello')
        error_response=type('ErrorResponse',(),{'status_code':400,'raise_for_status':lambda self:(_ for _ in ()).throw(requests.HTTPError('rejected'))})()
        with override_settings(SMS_MODE='live',FARAZSMS_API_KEY='key',FARAZSMS_SENDER_LINE='1000'):
            with patch('sms_campaigns.services.requests.post',return_value=error_response):process_pending(1)
        rejected_recipient.refresh_from_db();self.assertEqual(rejected_recipient.status,'failed')

    def test_timeout_becomes_unknown_and_is_not_retried(self):
        self.grant('manage_sms_campaigns','approve_sms_campaign','send_sms_campaign','view_sms_results')
        campaign=SMSCampaign.objects.create(name='Timeout',message_template='Hello',status='queued',created_by=self.user)
        recipient=SMSCampaignRecipient.objects.create(campaign=campaign,representative=self.rep,phone_number=self.rep.phone,rendered_message='Hello')
        with override_settings(SMS_MODE='live',FARAZSMS_API_KEY='test',FARAZSMS_SENDER_LINE='1000'):
            with patch('sms_campaigns.services.requests.post',side_effect=__import__('requests').Timeout()):process_pending(1)
        recipient.refresh_from_db();self.assertEqual(recipient.status,'unknown')
        with patch('sms_campaigns.services.requests.post') as post:process_pending(1)
        post.assert_not_called();recipient.refresh_from_db();self.assertEqual(recipient.attempts,1)

    def test_provider_request_uses_verified_contract_and_201_is_submitted(self):
        response=type('Response',(),{'status_code':201,'content':b'{"status":"success","data":12345}','json':lambda self:{'status':'success','data':12345},'raise_for_status':lambda self:None})()
        with override_settings(SMS_MODE='live',FARAZSMS_API_KEY='secret-key',FARAZSMS_SENDER_LINE='1000'):
            with patch('sms_campaigns.services.requests.post',return_value=response) as post:
                result=farazsms_send('09120000000','پیام آزمایشی')
        self.assertEqual(result,{'state':'submitted','request_id':'12345'})
        args,kwargs=post.call_args
        self.assertEqual(args[0],'https://api.iranpayamak.com/ws/v1/sms/simple')
        self.assertEqual(kwargs['headers']['Api-Key'],'secret-key')
        self.assertEqual(kwargs['json']['recipients'],['+989120000000'])
        self.assertEqual(kwargs['json']['number_format'],'english')

    def test_unknown_message_variables_are_rejected(self):
        with self.assertRaises(ValueError):render_message('Hi {discount_code}',self.rep)

    def test_viewer_only_sees_aggregate_delivery_results(self):
        viewer=User.objects.create_user(username='smsviewer',email='smsviewer@example.test',password='long-password-123',is_staff=True)
        group,_=Group.objects.get_or_create(name='sms_campaign_viewers');viewer.groups.add(group)
        client=APIClient();client.force_authenticate(viewer)
        campaign=SMSCampaign.objects.create(name='Private',message_template='Private copy',created_by=self.user)
        SMSCampaignRecipient.objects.create(campaign=campaign,representative=self.rep,phone_number=self.rep.phone,rendered_message='Private personalized message')
        response=client.get(f'/api/v1/manage/sms/campaigns/{campaign.pk}/recipients/')
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data['results'],[{'status':'pending','count':1}])

    def test_provider_status_schema_is_not_guessed(self):
        self.grant('manage_sms_campaigns','view_sms_results')
        campaign=SMSCampaign.objects.create(name='Status',message_template='Text',created_by=self.user)
        recipient=SMSCampaignRecipient.objects.create(campaign=campaign,representative=self.rep,phone_number=self.rep.phone,rendered_message='Text',status='submitted',provider_request_id='req-123')
        response=type('Response',(),{'content':b'{"data":[{"status":"delivered"}]}','json':lambda self:{'data':[{'status':'delivered'}]},'raise_for_status':lambda self:None})()
        with override_settings(SMS_MODE='live',FARAZSMS_API_KEY='key'):
            with patch('sms_campaigns.services.requests.get',return_value=response):
                result=self.client.get(f'/api/v1/manage/sms/campaigns/{campaign.pk}/delivery-status/')
        self.assertEqual(result.status_code,200)
        recipient.refresh_from_db();self.assertEqual(recipient.status,'submitted')
        self.assertEqual(result.data['provider_checks'][0]['status'],'unconfirmed')
