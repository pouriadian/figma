from django.conf import settings
from django.core.files.storage import FileSystemStorage


class PrivateResumeStorage(FileSystemStorage):
    """Intentionally outside MEDIA_ROOT: resumes must never be public static files."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('location', settings.PRIVATE_MEDIA_ROOT)
        kwargs.setdefault('base_url', None)
        super().__init__(*args, **kwargs)
