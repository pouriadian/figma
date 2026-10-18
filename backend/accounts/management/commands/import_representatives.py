import csv
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from accounts.models import Representative


class Command(BaseCommand):
    help = 'ورود انبوه نمایندگان از CSV با قالب company_name,contact_name,phone,email,province,city,address,status'

    def add_arguments(self, parser):
        parser.add_argument('csv_file')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        file = Path(options['csv_file'])
        if not file.is_file():
            raise CommandError('CSV file not found')
        required = {'company_name', 'contact_name', 'phone', 'province', 'city'}
        total = 0
        with file.open('r', encoding='utf-8-sig', newline='') as fd:
            reader = csv.DictReader(fd)
            if not reader.fieldnames or not required.issubset(reader.fieldnames):
                raise CommandError('Missing columns: ' + ', '.join(sorted(required - set(reader.fieldnames or []))))
            with transaction.atomic():
                for row in reader:
                    if not all((row.get(k) or '').strip() for k in required):
                        raise CommandError(f'Missing required field at row {reader.line_num}')
                    key = {'phone': row['phone'].strip(), 'company_name': row['company_name'].strip()}
                    defaults = {k: (row.get(k) or '').strip() for k in ['contact_name','email','province','city','address']}
                    defaults['status'] = (row.get('status') or 'pending').strip()
                    if defaults['status'] not in dict(Representative.Status.choices):
                        raise CommandError(f'Invalid status at row {reader.line_num}')
                    Representative.objects.update_or_create(**key, defaults=defaults)
                    total += 1
                if options['dry_run']:
                    transaction.set_rollback(True)
        self.stdout.write(self.style.SUCCESS(f'{total} representatives processed' + (' (DRY RUN)' if options['dry_run'] else '')))
