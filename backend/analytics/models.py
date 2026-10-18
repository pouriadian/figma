from django.db import models
from common.models import TimestampedModel


class TrafficEvent(models.Model):
    class Kind(models.TextChoices):
        PAGE = 'page_view', 'بازدید صفحه'
        PRODUCT = 'product_view', 'بازدید محصول'

    kind = models.CharField('نوع', max_length=16, choices=Kind.choices)
    path = models.CharField('مسیر صفحه', max_length=250)
    product = models.ForeignKey('catalog.Product', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='محصول')
    occurred_at = models.DateTimeField('ثبت در', auto_now_add=True, db_index=True)
    # No IP, email, or user-agent collected by design.

    class Meta:
        ordering = ['-occurred_at']
        verbose_name = 'رویداد بازدید'
        verbose_name_plural = 'آمار بازدید سایت'
        indexes = [models.Index(fields=['kind', 'occurred_at'])]
