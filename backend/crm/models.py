from uuid import uuid4
from django.conf import settings
from django.db import models
from common.models import TimestampedModel
from common.validators import validate_resume
from crm.storage import PrivateResumeStorage


def tracking_code():
    return 'FM-' + uuid4().hex[:18].upper()


class Inquiry(TimestampedModel):
    class Kind(models.TextChoices):
        CONTACT = 'contact', 'تماس با ما'
        COLLABORATION = 'collaboration', 'همکاری سازمانی'
        DEALERSHIP = 'dealership', 'درخواست نمایندگی'
        PRODUCT = 'product_info', 'اطلاعات محصول'
        QUOTE = 'quote', 'استعلام قیمت'

    class Status(models.TextChoices):
        NEW = 'new', 'جدید'
        IN_PROGRESS = 'in_progress', 'در حال بررسی'
        AWAITING = 'awaiting_reply', 'در انتظار پاسخ'
        CLOSED = 'closed', 'پاسخ داده‌شده/بسته'
        REJECTED = 'rejected', 'ردشده'

    tracking_code = models.CharField('کد پیگیری', max_length=25, unique=True, default=tracking_code, editable=False)
    kind = models.CharField('نوع درخواست', max_length=20, choices=Kind.choices, db_index=True)
    product = models.ForeignKey('catalog.Product', on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries', verbose_name='محصول')
    representative = models.ForeignKey('accounts.Representative', on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries', verbose_name='نماینده')
    full_name = models.CharField('نام', max_length=140)
    email = models.EmailField('ایمیل', blank=True)
    phone = models.CharField('تلفن', max_length=20, blank=True)
    city = models.CharField('شهر', max_length=100, blank=True)
    company = models.CharField('شرکت', max_length=140, blank=True)
    message = models.TextField('متن درخواست')
    status = models.CharField('وضعیت', max_length=24, choices=Status.choices, default=Status.NEW, db_index=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_inquiries', verbose_name='مسئول پیگیری')
    internal_note = models.TextField('یادداشت داخلی', blank=True)
    handled_at = models.DateTimeField('زمان رسیدگی', null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'درخواست'
        verbose_name_plural = 'درخواست‌ها و استعلام‌ها'
        indexes = [models.Index(fields=['kind', 'status', 'created_at'])]

    def __str__(self):
        return f'{self.get_kind_display()} / {self.tracking_code}'


class InquiryStatusHistory(models.Model):
    inquiry = models.ForeignKey(Inquiry, on_delete=models.CASCADE, related_name='history')
    status = models.CharField('وضعیت', max_length=24, choices=Inquiry.Status.choices)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    note = models.TextField('توضیح', blank=True)
    created_at = models.DateTimeField('ثبت در', auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'تاریخچه وضعیت'
        verbose_name_plural = 'تاریخچه وضعیت درخواست‌ها'


class JobApplication(TimestampedModel):
    class Status(models.TextChoices):
        NEW = 'new', 'دریافت‌شده'
        REVIEW = 'review', 'در حال بررسی'
        INTERVIEW = 'interview', 'دعوت به مصاحبه'
        OFFER = 'offer', 'پیشنهاد همکاری'
        HIRED = 'hired', 'استخدام‌شده'
        REJECTED = 'rejected', 'ردشده'

    tracking_code = models.CharField('کد پیگیری', max_length=25, unique=True, default=tracking_code, editable=False)
    full_name = models.CharField('نام و نام خانوادگی', max_length=150)
    email = models.EmailField('ایمیل')
    phone = models.CharField('تلفن', max_length=20)
    specialization = models.CharField('زمینه تخصصی', max_length=150)
    message = models.TextField('معرفی و توضیحات', blank=True)
    resume = models.FileField('فایل رزومه', upload_to='resumes/%Y/%m/', storage=PrivateResumeStorage(), validators=[validate_resume])
    status = models.CharField('مرحله جذب', max_length=20, choices=Status.choices, default=Status.NEW, db_index=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='job_applications', verbose_name='مسئول جذب')
    internal_note = models.TextField('یادداشت داخلی', blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'درخواست استخدام'
        verbose_name_plural = 'رزومه‌ها و استخدام'

    def __str__(self):
        return f'{self.full_name} — {self.specialization}'
