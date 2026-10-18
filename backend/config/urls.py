from django.contrib import admin
from django.conf import settings

admin.site.site_header = "مدیریت فنی فرامید"
admin.site.site_title = "Faromid Django backend"
admin.site.index_title = "Backend maintenance"
admin.site.site_url = settings.FRONTEND_PUBLIC_URL + "/panel"
from django.http import FileResponse, Http404, JsonResponse
from django.core.exceptions import SuspiciousFileOperation
from django.conf import settings
from django.urls import path, include
from django.shortcuts import get_object_or_404
from django.contrib.admin.views.decorators import staff_member_required
from crm.models import JobApplication


def health(_request):
    return JsonResponse({'status': 'ok', 'service': 'faromid-api'})


def public_media(request, filename):
    # Only public uploads; never exposes private resumes.
    from pathlib import Path
    from django.utils._os import safe_join
    try:
        full_path = Path(safe_join(str(settings.MEDIA_ROOT / 'public'), filename))
    except (ValueError, SuspiciousFileOperation):
        raise Http404
    if not full_path.is_file():
        raise Http404
    from mimetypes import guess_type
    response = FileResponse(open(full_path, 'rb'), content_type=guess_type(full_path.name)[0] or 'application/octet-stream')
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cache-Control'] = 'public, max-age=86400'
    return response


@staff_member_required
def download_resume(request, pk):
    if not request.user.has_perm('crm.view_jobapplication'):
        from django.core.exceptions import PermissionDenied
        raise PermissionDenied
    application = get_object_or_404(JobApplication, pk=pk)
    if not application.resume:
        raise Http404
    response = FileResponse(application.resume.open('rb'), as_attachment=True, filename='resume-' + str(pk) + '.' + application.resume.name.rsplit('.', 1)[-1])
    response['Cache-Control'] = 'private, no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    return response


urlpatterns = [
    path('health/', health, name='health'),
    path('admin/resumes/<int:pk>/download/', download_resume, name='download-resume'),
    path('admin/', admin.site.urls),
    path('api/v1/', include('config.api_urls')),
    path('public-media/<path:filename>', public_media, name='public-media'),
    path('uploads/<path:filename>', public_media, name='cms-admin-uploads'),
]

# Custom CMS paths MUST precede the catch-all Django Admin resolver.
# urlpatterns are prepended rather than appended for that reason.
from content import cms_admin as cms_views
urlpatterns = [
    path('admin/site-pages/', admin.site.admin_view(cms_views.page_overview), name='cms-page-overview'),
    path('admin/site-pages/<slug:key>/', admin.site.admin_view(cms_views.page_editor), name='cms-page-editor'),
    path('admin/site-pages/<slug:key>/sections/<int:pk>/', admin.site.admin_view(cms_views.section_editor), name='cms-section-editor'),
    path('admin/site-media/', admin.site.admin_view(cms_views.media_library), name='cms-media-library'),
] + urlpatterns
