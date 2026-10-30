from django.db import migrations


CATEGORIES = [
    ('طرح چوب', 'wood'),
    ('طرح سنگ', 'stone'),
    ('طرح کتان', 'linen'),
    ('طرح بتن', 'concrete'),
    ('طرح چرم', 'leather'),
    ('یونی کالر', 'uni-color'),
    ('مات و آنتی فینگر', 'matte-anti-finger'),
    ('فانتزی', 'fantasy'),
    ('طرح متال', 'metal'),
]


def restore_categories(apps, schema_editor):
    Category = apps.get_model('catalog', 'ProductCategory')
    database = schema_editor.connection.alias
    for order, (name, slug) in enumerate(CATEGORIES, start=1):
        Category.objects.using(database).get_or_create(
            slug=slug,
            defaults={'name': name, 'order': order},
        )


class Migration(migrations.Migration):
    dependencies = [('catalog', '0002_texture')]
    operations = [migrations.RunPython(restore_categories, migrations.RunPython.noop)]
