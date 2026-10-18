"""Safe Excel import: preview first, idempotent, never publicly visible by default."""
import re
from django.db import transaction
from accounts.models import Representative
from openpyxl import load_workbook


def import_representative_workbook(file, apply=False):
    book = load_workbook(file, data_only=True, read_only=True)
    result = {'valid': 0, 'duplicated': 0, 'invalid': 0, 'existing': 0, 'created': 0}
    try:
        rows = iter(book.active.iter_rows(values_only=True))
        for row in rows:
            if len(row) >= 3 and str(row[1] or '').strip() == 'نام مشتری' and str(row[2] or '').strip() == 'تلفن':
                break
        else:
            raise ValueError('فایل اکسل باید ستون‌های نام مشتری و تلفن داشته باشد.')
        seen = set()
        with transaction.atomic():
            for index, row in enumerate(rows):
                if index > 5000:
                    raise ValueError('حداکثر تعداد ردیف فایل ۵۰۰۰ است.')
                if len(row) < 3 or not (row[1] or row[2]):
                    continue
                name = str(row[1] or '').strip()[:120]
                phone = str(row[2] or '').strip().replace(' ', '').replace('-', '')
                phone = re.sub(r'[\u200c\u200e\u200f]', '', phone)
                # Use one canonical Iranian mobile format for duplicate detection.
                if phone.startswith('+989') and len(phone) == 13:
                    phone = '0' + phone[3:]
                if not name or not re.fullmatch(r'09\d{9}', phone):
                    result['invalid'] += 1
                    continue
                if phone in seen:
                    result['duplicated'] += 1
                    continue
                seen.add(phone)
                result['valid'] += 1
                if Representative.objects.filter(phone=phone).exists():
                    result['existing'] += 1
                    continue
                if apply:
                    Representative.objects.create(
                        company_name=name, contact_name=name, phone=phone,
                        province='', city='', status=Representative.Status.PENDING,
                        internal_notes='اطلاعات واردشده از فهرست مشتریان؛ پیش از تأیید نمایندگی، بررسی شود.',
                    )
                    result['created'] += 1
            return result
    finally:
        book.close()
