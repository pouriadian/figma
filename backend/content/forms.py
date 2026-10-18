from django import forms
from django.core.exceptions import ValidationError
from .models import SiteSection, SiteSectionImage, MediaAsset, _safe_asset_path


class SectionEditForm(forms.ModelForm):
    prefer_library = forms.BooleanField(required=False, widget=forms.HiddenInput())

    class Meta:
        model = SiteSection
        fields = [
            'name', 'kind', 'sort_order', 'draft_title', 'draft_subtitle',
            'draft_body', 'draft_image', 'draft_asset', 'draft_image_alt',
            'draft_link_label', 'draft_link_url', 'draft_products', 'draft_enabled',
        ]
        widgets = {
            'draft_body': forms.HiddenInput(attrs={'id': 'id_draft_body'}),
            'draft_products': forms.SelectMultiple(attrs={'size': 6}),
            'draft_image': forms.ClearableFileInput(attrs={'accept': 'image/png,image/jpeg,image/webp'}),
        }

    def clean_draft_body(self):
        from bleach import clean
        return clean(
            self.cleaned_data.get('draft_body', ''),
            tags=['p', 'div', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'blockquote', 'h2', 'h3'],
            attributes={'a': ['href', 'title', 'rel', 'target']},
            protocols=['http', 'https', 'mailto'], strip=True,
        )


class SectionImageUploadForm(forms.ModelForm):
    class Meta:
        model = SiteSectionImage
        fields = ['image', 'library_asset', 'caption', 'alt_text', 'sort_order']
        widgets = {'image': forms.ClearableFileInput(attrs={'accept': 'image/png,image/jpeg,image/webp'})}

    def clean(self):
        data = super().clean()
        if not data.get('image') and not data.get('library_asset'):
            self.add_error('image', 'Choose a file or an image from the library.')
        return data


class MediaAssetForm(forms.ModelForm):
    class Meta:
        model = MediaAsset
        fields = ['title', 'image', 'original_path', 'alt_text', 'category']
        widgets = {'image': forms.ClearableFileInput(attrs={'accept': 'image/png,image/jpeg,image/webp'})}


class NewSectionForm(forms.Form):
    name = forms.CharField(max_length=150)
    kind = forms.ChoiceField(choices=SiteSection.Kind.choices)


class SEOEditorForm(forms.Form):
    title = forms.CharField(max_length=180)
    description = forms.CharField(max_length=320, required=False, widget=forms.Textarea(attrs={'rows': 2}))
    seo_title = forms.CharField(max_length=180, required=False)
    seo_description = forms.CharField(max_length=320, required=False, widget=forms.Textarea(attrs={'rows': 2}))
    indexable = forms.BooleanField(required=False, initial=True)
