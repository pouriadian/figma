"""Legacy task-based Django admin views, retained only for technical maintenance."""
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.text import slugify
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.db import transaction
from bleach import clean
from .models import SitePage, SiteSection, SiteSectionImage, MediaAsset, PageSEO, _public_file_url
from .forms import SectionEditForm, SectionImageUploadForm, NewSectionForm, MediaAssetForm, SEOEditorForm


def _check(request, write=False):
    code = 'content.edit_site_pages' if write else 'content.view_sitepage'
    if not request.user.has_perm(code):
        raise PermissionDenied


def _ctx(request, **kwargs):
    result = admin.site.each_context(request)
    result.update(kwargs)
    return result


def _editor_url(key, section_pk=None):
    if section_pk:
        return reverse('cms-section-editor', kwargs={'key': key, 'pk': section_pk})
    return reverse('cms-page-editor', kwargs={'key': key})


def _html_preview(value):
    return clean(value, tags=['p', 'div', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'blockquote', 'h2', 'h3'],
                 attributes={'a': ['href', 'title', 'rel', 'target']}, protocols=['http', 'https', 'mailto'], strip=True)


@require_http_methods(['GET'])
def page_overview(request):
    _check(request)
    pages = SitePage.objects.filter(is_active=True).prefetch_related('sections')
    return render(request, 'admin/content/page_overview.html', _ctx(
        request, title='Website pages', pages=pages,
        can_edit=request.user.has_perm('content.edit_site_pages'),
        site_base=settings.FRONTEND_PUBLIC_URL.rstrip('/'),
    ))


@require_http_methods(['GET', 'POST'])
def page_editor(request, key):
    _check(request, request.method == 'POST')
    page = get_object_or_404(SitePage, key=key, is_active=True)
    path = '/' if page.key == 'home' else '/' + page.key
    seo = PageSEO.objects.filter(path=path).first()
    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'create-section':
            form = NewSectionForm(request.POST)
            if form.is_valid():
                name = form.cleaned_data['name']
                base = slugify(name, allow_unicode=False)[:60] or 'block'
                next_key = base
                suffix = 1
                while SiteSection.objects.filter(page=page, key=next_key).exists():
                    suffix += 1
                    next_key = f'{base}-{suffix}'
                section = SiteSection.objects.create(
                    page=page, name=name, key=next_key, kind=form.cleaned_data['kind'],
                    sort_order=(page.sections.count() + 1) * 10,
                )
                messages.success(request, 'بخش جدید ساخته شد. حالا محتوا را اضافه و سپس منتشر کنید.')
                return redirect(_editor_url(page.key, section.pk))
            messages.error(request, 'نام و نوع بخش را مشخص کنید.')
        elif action == 'reorder-sections':
            raw = request.POST.get('ordered_ids', '')
            try:
                ids = [int(part) for part in raw.split(',') if part]
            except ValueError:
                ids = []
            real_ids = list(page.sections.values_list('pk', flat=True))
            if len(ids) != len(real_ids) or len(set(ids)) != len(ids) or set(ids) != set(real_ids):
                messages.error(request, 'ترتیب بخش‌ها نامعتبر است.')
            else:
                with transaction.atomic():
                    for pos, section_pk in enumerate(ids):
                        item = SiteSection.objects.select_for_update().get(pk=section_pk, page=page)
                        item.sort_order = pos * 10
                        if item.is_published and isinstance(item.published_snapshot, dict):
                            item.published_snapshot = {**item.published_snapshot, 'sort_order': item.sort_order}
                        item.save(update_fields=['sort_order', 'published_snapshot', 'updated_at'])
                messages.success(request, 'ترتیب بخش‌ها ذخیره و در سایت اعمال شد.')
                return redirect(_editor_url(page.key))
        elif action == 'save-seo':
            form = SEOEditorForm(request.POST)
            if form.is_valid():
                PageSEO.objects.update_or_create(path=path, defaults={
                    **form.cleaned_data,
                })
                messages.success(request, 'تنظیمات سئو ذخیره شد.')
                return redirect(_editor_url(page.key))
            messages.error(request, 'فیلدهای سئو را اصلاح کنید.')
        else:
            messages.error(request, 'عملیات ناشناخته است.')
    seo_initial = {
        'title': seo.title if seo else page.name,
        'description': seo.description if seo else '',
        'seo_title': seo.seo_title if seo else '',
        'seo_description': seo.seo_description if seo else '',
        'indexable': seo.indexable if seo else True,
    }
    return render(request, 'admin/content/page_editor.html', _ctx(
        request, title=page.name, page=page, sections=page.sections.all(),
        seo_form=SEOEditorForm(initial=seo_initial), new_form=NewSectionForm(),
        can_edit=request.user.has_perm('content.edit_site_pages'),
        live_url=settings.FRONTEND_PUBLIC_URL.rstrip('/') + path,
    ))


@require_http_methods(['GET', 'POST'])
def section_editor(request, key, pk):
    _check(request, request.method == 'POST')
    page = get_object_or_404(SitePage, key=key, is_active=True)
    section = get_object_or_404(SiteSection.objects.select_related('draft_asset'), pk=pk, page=page)
    errors = None
    gallery_errors = None
    if request.method == 'POST':
        action = request.POST.get('action', 'save')
        if action in ('save', 'publish'):
            form = SectionEditForm(request.POST, request.FILES, instance=section)
            if form.is_valid():
                with transaction.atomic():
                    section = form.save(commit=False)
                    section.last_editor = request.user
                    if form.cleaned_data.get('prefer_library') and section.draft_asset_id:
                        section.draft_image = ''
                    section.save()
                    form.save_m2m()
                    if action == 'publish':
                        section.publish(request.user)
                messages.success(request, 'تغییرات در سایت منتشر شد.' if action == 'publish' else 'پیش‌نویس ذخیره شد؛ سایت منتشرشده تغییری نکرد.')
                return redirect(_editor_url(page.key, section.pk))
            errors = form
            messages.error(request, 'اطلاعات بخش را بررسی و اصلاح کنید.')
        elif action == 'unpublish':
            section.is_published = False
            section.save(update_fields=['is_published', 'updated_at'])
            messages.success(request, 'انتشار بخش متوقف شد؛ محتوای اصلی سایت حفظ می‌شود.')
            return redirect(_editor_url(page.key, section.pk))
        elif action == 'add-image':
            gallery = SectionImageUploadForm(request.POST, request.FILES)
            if gallery.is_valid():
                image = gallery.save(commit=False)
                image.section = section
                image.save()
                messages.success(request, 'تصویر به پیش‌نویس اضافه شد. برای نمایش در سایت، بخش را منتشر کنید.')
                return redirect(_editor_url(page.key, section.pk))
            gallery_errors = gallery
        elif action == 'delete-image':
            obj = get_object_or_404(SiteSectionImage, pk=request.POST.get('image_id'), section=section)
            obj.delete()
            messages.success(request, 'تصویر از پیش‌نویس حذف شد؛ نسخه منتشرشده دست‌نخورده است.')
            return redirect(_editor_url(page.key, section.pk))
        elif action == 'order-images':
            for img in section.images.all():
                try:
                    order = int(request.POST.get('order-' + str(img.pk), img.sort_order))
                except ValueError:
                    order = img.sort_order
                img.sort_order = max(0, min(order, 10000))
                img.save(update_fields=['sort_order', 'updated_at'])
            messages.success(request, 'ترتیب پیش‌نویس ذخیره شد؛ برای نمایش در سایت منتشر کنید.')
            return redirect(_editor_url(page.key, section.pk))
        else:
            messages.error(request, 'عملیات ناشناخته است.')
    form = errors or SectionEditForm(instance=section)
    gallery = gallery_errors or SectionImageUploadForm()
    uploaded = _public_file_url(section.draft_image) or (section.draft_asset.url if section.draft_asset_id else '')
    return render(request, 'admin/content/section_editor.html', _ctx(
        request, title=section.name, page=page, section=section, form=form,
        upload_form=gallery, draft_image_url=uploaded,
        draft_preview=_html_preview(section.draft_body),
        can_edit=request.user.has_perm('content.edit_site_pages'),
        library_items=MediaAsset.objects.all()[:100],
        images=section.images.select_related('library_asset'),
        live_url=settings.FRONTEND_PUBLIC_URL.rstrip('/') + ('/' if key == 'home' else '/' + key),
    ))


@require_http_methods(['GET', 'POST'])
def media_library(request):
    _check(request, request.method == 'POST')
    form = MediaAssetForm(request.POST or None, request.FILES or None)
    if request.method == 'POST':
        if form.is_valid():
            form.save()
            messages.success(request, 'تصویر در کتابخانه ذخیره شد.')
            return redirect('cms-media-library')
        messages.error(request, 'آپلود انجام نشد؛ نوع فایل، حجم و فیلدها را بررسی کنید.')
    return render(request, 'admin/content/media_library.html', _ctx(
        request, title='Media library', form=form, items=MediaAsset.objects.all()[:120],
        can_edit=request.user.has_perm('content.edit_site_pages'),
    ))
