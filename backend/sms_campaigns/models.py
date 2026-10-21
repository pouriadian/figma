from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Q
from common.models import TimestampedModel


class SalesSnapshot(TimestampedModel):
    representative = models.ForeignKey('accounts.Representative', on_delete=models.PROTECT, related_name='sales_snapshots')
    sales_month = models.DateField(help_text='First day of Gregorian month')
    net_sales_irr = models.DecimalField(max_digits=18, decimal_places=0, validators=[MinValueValidator(0)])
    completed_orders = models.PositiveIntegerField(null=True, blank=True)
    import_batch = models.ForeignKey('SalesImportBatch', on_delete=models.PROTECT, related_name='snapshots')
    class Meta:
        constraints = [models.UniqueConstraint(fields=['representative', 'sales_month'], name='sms_unique_rep_sales_month'), models.CheckConstraint(condition=Q(sales_month__day=1), name='sms_sales_month_is_first_day')]
        indexes = [models.Index(fields=['sales_month', 'net_sales_irr'])]
        permissions = [('approve_sales_import', 'Can approve monthly sales imports')]


class SalesImportBatch(TimestampedModel):
    class State(models.TextChoices):
        PREVIEW = 'preview', 'Preview'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
    sales_month = models.DateField()
    replace_existing = models.BooleanField(default=False)
    state = models.CharField(max_length=12, choices=State.choices, default=State.PREVIEW, db_index=True)
    preview_rows = models.JSONField(default=list)
    validation_errors = models.JSONField(default=list)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='sales_imports')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='approved_sales_imports')
    approved_at = models.DateTimeField(null=True, blank=True)


class DiscountRule(TimestampedModel):
    name = models.CharField(max_length=120)
    min_sales_irr = models.DecimalField(max_digits=18, decimal_places=0, validators=[MinValueValidator(0)])
    max_sales_irr = models.DecimalField(max_digits=18, decimal_places=0, null=True, blank=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])
    active = models.BooleanField(default=True, db_index=True)
    class Meta:
        ordering = ['min_sales_irr']


class RepresentativeReward(TimestampedModel):
    class State(models.TextChoices):
        EVALUATED = 'evaluated', 'Evaluated'
        ASSIGNED = 'assigned', 'Assigned'
        APPROVED = 'approved', 'Approved'
        ACTIVE = 'active', 'Active'
        REJECTED = 'rejected', 'Rejected'
    representative = models.ForeignKey('accounts.Representative', on_delete=models.PROTECT, related_name='sms_rewards')
    sales_month = models.DateField()
    sales_amount_irr = models.DecimalField(max_digits=18, decimal_places=0)
    rule = models.ForeignKey(DiscountRule, on_delete=models.PROTECT)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2)
    state = models.CharField(max_length=12, choices=State.choices, default=State.EVALUATED, db_index=True)
    evaluated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='evaluated_rewards')
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='assigned_rewards')
    assigned_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='approved_rewards')
    activated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='activated_rewards')
    class Meta:
        constraints = [models.UniqueConstraint(fields=['representative', 'sales_month'], name='sms_unique_reward_rep_month'), models.CheckConstraint(condition=Q(sales_month__day=1), name='sms_reward_month_is_first_day')]


class SMSCampaign(TimestampedModel):
    class State(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        APPROVED = 'approved', 'Approved'
        QUEUED = 'queued', 'Queued'
        PROCESSING = 'processing', 'Processing'
        FINISHED = 'finished', 'Finished'
        CANCELED = 'canceled', 'Canceled'
    name = models.CharField(max_length=180)
    message_template = models.TextField()
    filters = models.JSONField(default=dict)
    preview_snapshot = models.JSONField(default=list, blank=True)
    previewed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=State.choices, default=State.DRAFT, db_index=True)
    audience_frozen_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='sms_campaigns')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='approved_sms_campaigns')
    approved_at = models.DateTimeField(null=True, blank=True)
    queued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='queued_sms_campaigns')
    queued_at = models.DateTimeField(null=True, blank=True)
    canceled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='canceled_sms_campaigns')
    canceled_at = models.DateTimeField(null=True, blank=True)


class SMSCampaignRecipient(TimestampedModel):
    class State(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        SUBMITTED = 'submitted', 'Submitted'
        DELIVERED = 'delivered', 'Delivered'
        FAILED = 'failed', 'Failed'
        CANCELED = 'canceled', 'Canceled'
        UNKNOWN = 'unknown', 'Unknown'
    campaign = models.ForeignKey(SMSCampaign, on_delete=models.CASCADE, related_name='recipients')
    representative = models.ForeignKey('accounts.Representative', on_delete=models.PROTECT, related_name='sms_campaign_recipients')
    phone_number = models.CharField(max_length=24)
    rendered_message = models.TextField()
    status = models.CharField(max_length=12, choices=State.choices, default=State.PENDING, db_index=True)
    provider_request_id = models.CharField(max_length=120, blank=True, db_index=True)
    provider_status = models.CharField(max_length=48, blank=True)
    error_message = models.CharField(max_length=500, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    submitted_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['campaign', 'representative'], name='sms_campaign_unique_recipient')]
        permissions = [('approve_sms_campaign', 'Can approve SMS campaigns'), ('manage_sms_campaigns', 'Can manage SMS campaigns'), ('send_sms_campaign', 'Can send approved SMS campaigns'), ('view_sms_results', 'Can view SMS campaign results'), ('approve_sms_reward', 'Can approve rewards'), ('activate_sms_reward', 'Can activate approved rewards')]
