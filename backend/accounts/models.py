from uuid import uuid4
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from common.models import TimestampedModel


def dealer_code():
    return 'FR-' + uuid4().hex[:10].upper()


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'مدیر ارشد'
        MANAGER = 'manager', 'مدیر سازمان'
        SALES = 'sales', 'کارشناس فروش'
        CONTENT = 'content', 'مدیر محتوا'
        HR = 'hr', 'منابع انسانی'
        REPRESENTATIVE = 'representative', 'نماینده'

    email = models.EmailField('ایمیل', unique=True)
    phone = models.CharField('تلفن', max_length=20, blank=True)
    role = models.CharField('نقش', max_length=24, choices=Role.choices, default=Role.REPRESENTATIVE, db_index=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'کاربر'
        verbose_name_plural = 'کاربران'

    def __str__(self):
        return self.get_full_name() or self.email


class Representative(TimestampedModel):
    class Status(models.TextChoices):
        PENDING = 'pending', 'در انتظار تأیید'
        ACTIVE = 'active', 'فعال'
        SUSPENDED = 'suspended', 'تعلیق'
        CLOSED = 'closed', 'خاتمه همکاری'

    code = models.CharField('کد نماینده', max_length=16, unique=True, default=dealer_code, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='representative', verbose_name='حساب کاربری')
    company_name = models.CharField('نام شرکت/فروشگاه', max_length=200)
    contact_name = models.CharField('نام مسئول', max_length=120)
    phone = models.CharField('شماره تماس', max_length=20)
    email = models.EmailField('ایمیل', blank=True)
    province = models.CharField('استان', max_length=80, db_index=True)
    city = models.CharField('شهر', max_length=80, db_index=True)
    address = models.TextField('آدرس', blank=True)
    latitude = models.DecimalField('عرض جغرافیایی', max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField('طول جغرافیایی', max_digits=9, decimal_places=6, null=True, blank=True)
    status = models.CharField('وضعیت همکاری', max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    contract_started_at = models.DateField('شروع همکاری', null=True, blank=True)
    internal_notes = models.TextField('یادداشت داخلی', blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'نماینده'
        verbose_name_plural = 'نمایندگان'

    def __str__(self):
        return f'{self.company_name} | {self.code}'
