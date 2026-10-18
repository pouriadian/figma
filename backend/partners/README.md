# Representative profile extension

Keeps optional CRM performance and public directory authorization in a new table,
without destructive migrations to the legacy unmigrated accounts models.

Migrate: `python manage.py migrate`

Only active representatives whose profile `is_public=True` appear in the public API;
no private contact info is returned. SMS requires explicit consent and a provider.
