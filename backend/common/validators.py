from pathlib import Path
from zipfile import is_zipfile
from django.core.exceptions import ValidationError


def validate_resume(file):
    if not file:
        return
    if file.size > 5 * 1024 * 1024:
        raise ValidationError('حجم فایل رزومه باید حداکثر ۵ مگابایت باشد.')
    suffix = Path(file.name).suffix.lower()
    if suffix not in {'.pdf', '.docx'}:
        raise ValidationError('فقط PDF یا DOCX مجاز است.')
    pos = file.tell()
    file.seek(0)
    header = file.read(8)
    file.seek(0)
    valid = header.startswith(b'%PDF-') if suffix == '.pdf' else (header.startswith(b'PK') and is_zipfile(file))
    file.seek(pos)
    if not valid:
        raise ValidationError('محتوای فایل با پسوند آن مطابقت ندارد.')


def validate_public_document(file):
    if not file:
        return
    if file.size > 15 * 1024 * 1024:
        raise ValidationError('حداکثر حجم کاتالوگ ۱۵ مگابایت است.')
    if Path(file.name).suffix.lower() != '.pdf':
        raise ValidationError('فقط فایل PDF مجاز است.')
    pos = file.tell()
    file.seek(0)
    header = file.read(5)
    file.seek(pos)
    if header != b'%PDF-':
        raise ValidationError('کاتالوگ باید PDF معتبر باشد.')


def validate_image(file):
    if not file:
        return
    if file.size > 8 * 1024 * 1024:
        raise ValidationError('حداکثر حجم تصویر ۸ مگابایت است.')
    from PIL import Image
    try:
        pos = file.tell()
        file.seek(0)
        image = Image.open(file)
        if image.format not in ('JPEG', 'PNG', 'WEBP'):
            raise ValueError('unsupported format')
        image.verify()
        file.seek(pos)
    except Exception as exc:
        raise ValidationError('فایل تصویر معتبر JPEG/PNG/WebP نیست.') from exc
