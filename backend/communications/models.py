from django.db import models
from django.utils import timezone
from common.models import TimestampedModel


class Announcement(TimestampedModel):
    class State(models.TextChoices):
        DRAFT = 'draft', 'پیش‌نویس'
        QUEUED = 'queued', 'در صف ارسال'
        FINISHED = 'finished', 'پردازش پایان یافت'

    class Audience(models.TextChoices):
        ACTIVE = 'all_active', 'همه نمایندگان فعال'
        SELECTED = 'selected', 'نمایندگان انتخاب‌شده'

    class Channel(models.TextChoices):
        IN_APP = 'in_app', 'اعلان داخلی'
        EMAIL = 'email', 'ایمیل'
        SMS = 'sms', 'پیامک'
        ALL = 'all', 'هر سه کانال'

    title = models.CharField('عنوان اطلاعیه', max_length=180)
    body = models.TextField('متن پیام')
    audience = models.CharField('مخاطبان', max_length=16, choices=Audience.choices, default=Audience.ACTIVE)
    selected_representatives = models.ManyToManyField('accounts.Representative', blank=True, related_name='targeted_announcements', verbose_name='نمایندگان منتخب')
    channel = models.CharField('روش ارسال', max_length=10, choices=Channel.choices, default=Channel.IN_APP)
    status = models.CharField('وضعیت', max_length=16, choices=State.choices, default=State.DRAFT, db_index=True)
    scheduled_at = models.DateTimeField('زمان برنامه‌ریزی', null=True, blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='ایجادکننده')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'اطلاعیه گروهی'
        verbose_name_plural = 'اطلاع‌رسانی گروهی'

    def __str__(self):
        return self.title

    def queue_deliveries(self):
        from accounts.models import Representative
        if self.audience == self.Audience.ACTIVE:
            reps = Representative.objects.filter(status='active').select_related('user')
        else:
            reps = self.selected_representatives.filter(status='active').select_related('user')
        channels = ['in_app', 'email', 'sms'] if self.channel == self.Channel.ALL else [self.channel]
        from partners.models import RepresentativeProfile
        consenting_ids = set(RepresentativeProfile.objects.filter(
            representative_id__in=reps.values_list('id', flat=True), sms_consent=True
        ).values_list('representative_id', flat=True))
        for rep in reps.iterator():
            for channel in channels:
                # Missing external addresses are explicitly skipped in the report.
                has_target = channel == 'in_app' or (channel == 'email' and bool(rep.email or (rep.user and rep.user.email))) or (channel == 'sms' and bool(rep.phone) and rep.pk in consenting_ids)
                Delivery.objects.get_or_create(
                    announcement=self, representative=rep, channel=channel,
                    defaults={'status': Delivery.State.PENDING if has_target else Delivery.State.SKIPPED, 'last_error': '' if has_target else 'اطلاعات تماس یا رضایت ارتباط موجود نیست'},
                )
        self.status = self.State.QUEUED
        self.save(update_fields=['status', 'updated_at'])


class Delivery(TimestampedModel):
    class State(models.TextChoices):
        PENDING = 'pending', 'در انتظار'
        ACCEPTED = 'accepted', 'پذیرفته‌شده توسط سرویس'
        FAILED = 'failed', 'ناموفق'
        SKIPPED = 'skipped', 'ردشده/بدون آدرس'
        SIMULATED = 'simulated', 'شبیه‌سازی (توسعه)'

    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='deliveries')
    representative = models.ForeignKey('accounts.Representative', on_delete=models.CASCADE, related_name='deliveries')
    channel = models.CharField('کانال', max_length=10, choices=Announcement.Channel.choices)
    status = models.CharField('وضعیت ارسال', max_length=12, choices=State.choices, default=State.PENDING, db_index=True)
    attempts = models.PositiveSmallIntegerField('تعداد تلاش', default=0)
    last_error = models.TextField('خطا', blank=True)
    provider_reference = models.CharField('شناسه سرویس', max_length=150, blank=True)
    processed_at = models.DateTimeField('پردازش در', blank=True, null=True)
    read_at = models.DateTimeField('مشاهده در پنل', blank=True, null=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['announcement', 'representative', 'channel'], name='unique_delivery_per_channel')]
        ordering = ['-created_at']
        verbose_name = 'گزارش ارسال'
        verbose_name_plural = 'گزارش وضعیت ارسال'

    def __str__(self):
        return f'{self.announcement.title} / {self.representative.code} / {self.channel}'
