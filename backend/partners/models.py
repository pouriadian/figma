"""Optional profile for CRM representatives; no alterations to legacy accounts tables."""
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class RepresentativeProfile(models.Model):
    # An integer reference intentionally avoids a schema migration on the legacy
    # (unmigrated) accounts.Representative table during an in-place upgrade.
    representative_id = models.PositiveBigIntegerField(unique=True, db_index=True)
    is_public = models.BooleanField(default=False, db_index=True)
    last_month_sales = models.DecimalField(max_digits=15, decimal_places=0, blank=True, null=True)
    performance_score = models.PositiveSmallIntegerField(
        blank=True, null=True, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    sms_consent = models.BooleanField(default=False)
    sms_consent_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Representative #{self.representative_id}'
