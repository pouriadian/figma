from django.db import models
from django.utils import timezone


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(default=timezone.now, editable=False, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SEOFields(models.Model):
    seo_title = models.CharField(max_length=180, blank=True, verbose_name='عنوان SEO')
    seo_description = models.CharField(max_length=320, blank=True, verbose_name='توضیحات SEO')
    canonical_url = models.URLField(blank=True, verbose_name='آدرس canonical')

    class Meta:
        abstract = True
