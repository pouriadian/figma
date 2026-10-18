from django.contrib.admin import ModelAdmin

class BrandModelAdmin(ModelAdmin):
    list_per_page = 30
    save_on_top = True
    preserve_on_copy = ('created_at',)
