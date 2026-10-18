from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name='RepresentativeProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('representative_id', models.PositiveBigIntegerField(unique=True, db_index=True)),
                ('is_public', models.BooleanField(default=False, db_index=True)),
                ('last_month_sales', models.DecimalField(max_digits=15, decimal_places=0, blank=True, null=True)),
                ('performance_score', models.PositiveSmallIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('sms_consent', models.BooleanField(default=False)),
                ('sms_consent_at', models.DateTimeField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
