import catalog.models
import common.validators
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('catalog', '0001_initial')]

    operations = [
        migrations.CreateModel(
            name='Texture',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(db_index=True, default=django.utils.timezone.now, editable=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('seo_title', models.CharField(blank=True, max_length=180, verbose_name='عنوان SEO')),
                ('seo_description', models.CharField(blank=True, max_length=320, verbose_name='توضیحات SEO')),
                ('canonical_url', models.URLField(blank=True, verbose_name='آدرس canonical')),
                ('name', models.CharField(max_length=160, verbose_name='نام بافت')),
                ('slug', models.SlugField(allow_unicode=True, max_length=180, unique=True, verbose_name='نشانی')),
                ('code', models.CharField(max_length=60, unique=True, verbose_name='کد بافت')),
                ('category', models.CharField(blank=True, max_length=100, verbose_name='دسته‌بندی')),
                ('description', models.TextField(blank=True, verbose_name='توضیحات')),
                ('technical_specs', models.JSONField(blank=True, default=dict, verbose_name='مشخصات فنی')),
                ('image', models.ImageField(blank=True, upload_to=catalog.models._texture_photo_path, validators=[common.validators.validate_image], verbose_name='تصویر بافت')),
                ('is_published', models.BooleanField(db_index=True, default=False, verbose_name='نمایش در سایت')),
                ('products', models.ManyToManyField(blank=True, related_name='textures', to='catalog.product', verbose_name='محصولات سازگار')),
            ],
            options={'verbose_name': 'بافت', 'verbose_name_plural': 'بافت‌ها', 'ordering': ['name', 'code']},
        ),
    ]
