from django.db import models
from django.db.models import Q
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
        ALL_PANEL = 'all_panel', 'همه کاربران فعال پنل'
        SELECTED_PANEL = 'selected_panel', 'کاربران منتخب پنل'

    class Channel(models.TextChoices):
        IN_APP = 'in_app', 'اعلان داخلی'
        EMAIL = 'email', 'ایمیل'
        SMS = 'sms', 'پیامک'
        ALL = 'all', 'هر سه کانال'

    title = models.CharField('عنوان اطلاعیه', max_length=180)
    body = models.TextField('متن پیام')
    audience = models.CharField('مخاطبان', max_length=16, choices=Audience.choices, default=Audience.ACTIVE)
    selected_representatives = models.ManyToManyField('accounts.Representative', blank=True, related_name='targeted_announcements', verbose_name='نمایندگان منتخب')
    selected_users = models.ManyToManyField('accounts.User', blank=True, related_name='targeted_announcements', verbose_name='کاربران منتخب پنل')
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
        from accounts.models import User
        channels = ['in_app', 'email', 'sms'] if self.channel == self.Channel.ALL else [self.channel]
        if self.audience in (self.Audience.ACTIVE, self.Audience.SELECTED):
            reps = (Representative.objects.filter(status='active') if self.audience == self.Audience.ACTIVE else self.selected_representatives.filter(status='active')).select_related('user')
            from partners.models import RepresentativeProfile
            consenting_ids = set(RepresentativeProfile.objects.filter(
                representative_id__in=reps.values_list('id', flat=True), sms_consent=True
            ).values_list('representative_id', flat=True))
            for rep in reps.iterator():
                for channel in channels:
                    has_target = channel == 'in_app' or (channel == 'email' and bool(rep.email or (rep.user and rep.user.email))) or (channel == 'sms' and bool(rep.phone) and rep.pk in consenting_ids)
                    reason = '' if has_target else ('رضایت پیامکی ثبت نشده است' if channel == 'sms' and rep.phone else 'اطلاعات تماس موجود نیست')
                    Delivery.objects.get_or_create(
                        announcement=self, representative=rep, channel=channel,
                        defaults={'recipient_phone': rep.phone if channel == 'sms' else '', 'status': Delivery.State.PENDING if has_target else Delivery.State.SKIPPED, 'last_error': reason},
                    )
        else:
            users = (User.objects.filter(is_staff=True, is_active=True) if self.audience == self.Audience.ALL_PANEL else self.selected_users.filter(is_staff=True, is_active=True))
            for user in users.iterator():
                for channel in channels:
                    has_target = channel == 'in_app' or (channel == 'sms' and bool(user.phone)) or (channel == 'email' and bool(user.email))
                    reason = '' if has_target else 'شماره تماس یا ایمیل ثبت نشده است'
                    Delivery.objects.get_or_create(
                        announcement=self, recipient_user=user, channel=channel,
                        defaults={'recipient_phone': user.phone if channel == 'sms' else '', 'status': Delivery.State.PENDING if has_target else Delivery.State.SKIPPED, 'last_error': reason},
                    )
        self.status = self.State.QUEUED
        self.save(update_fields=['status', 'updated_at'])


class Delivery(TimestampedModel):
    class State(models.TextChoices):
        PENDING = 'pending', 'در انتظار'
        PROCESSING = 'processing', 'در حال پردازش'
        SUBMITTED = 'submitted', 'پذیرفته‌شده برای ارسال'
        DELIVERED = 'delivered', 'تحویل‌شده'
        ACCEPTED = 'accepted', 'پذیرفته‌شده توسط سرویس'
        FAILED = 'failed', 'ناموفق'
        CANCELED = 'canceled', 'لغوشده'
        UNKNOWN = 'unknown', 'نیازمند تطبیق وضعیت'
        SKIPPED = 'skipped', 'ردشده/بدون آدرس'
        SIMULATED = 'simulated', 'شبیه‌سازی (توسعه)'

    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='deliveries')
    representative = models.ForeignKey('accounts.Representative', on_delete=models.CASCADE, related_name='deliveries', null=True, blank=True)
    recipient_user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='panel_deliveries', null=True, blank=True)
    recipient_phone = models.CharField('شماره مقصد ثبت‌شده هنگام صف', max_length=24, blank=True)
    channel = models.CharField('کانال', max_length=10, choices=Announcement.Channel.choices)
    status = models.CharField('وضعیت ارسال', max_length=12, choices=State.choices, default=State.PENDING, db_index=True)
    attempts = models.PositiveSmallIntegerField('تعداد تلاش', default=0)
    last_error = models.TextField('خطا', blank=True)
    provider_reference = models.CharField('شناسه سرویس', max_length=150, blank=True)
    processed_at = models.DateTimeField('پردازش در', blank=True, null=True)
    read_at = models.DateTimeField('مشاهده در پنل', blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['announcement', 'representative', 'channel'], condition=Q(representative__isnull=False), name='unique_rep_delivery_per_channel'),
            models.UniqueConstraint(fields=['announcement', 'recipient_user', 'channel'], condition=Q(recipient_user__isnull=False), name='unique_user_delivery_per_channel'),
            models.CheckConstraint(condition=(Q(representative__isnull=False, recipient_user__isnull=True) | Q(representative__isnull=True, recipient_user__isnull=False)), name='delivery_exactly_one_recipient'),
        ]
        ordering = ['-created_at']
        verbose_name = 'گزارش ارسال'
        verbose_name_plural = 'گزارش وضعیت ارسال'

    def __str__(self):
        recipient = self.representative.code if self.representative_id else (self.recipient_user.email if self.recipient_user_id else 'بدون گیرنده')
        return f'{self.announcement.title} / {recipient} / {self.channel}'
