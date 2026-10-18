from django import template
from django.conf import settings

register = template.Library()


@register.filter
def admin_media(src):
    """Original frontend artwork lives on :3000; new uploads live on :8000."""
    if not isinstance(src, str):
        return ''
    if src.startswith('/assets/') and '..' not in src:
        return settings.FRONTEND_PUBLIC_URL.rstrip('/') + src
    if src.startswith('/uploads/'):
        return src
    return ''
