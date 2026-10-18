from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from accounts.import_helpers import import_representative_workbook


class Command(BaseCommand):
    help = 'Preview Excel contacts; --apply creates unpublished pending representatives.'

    def add_arguments(self, parser):
        parser.add_argument('xlsx_file')
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        file = Path(options['xlsx_file'])
        if not file.is_file() or file.suffix.lower() != '.xlsx':
            raise CommandError('Provide a valid XLSX file.')
        with file.open('rb') as stream:
            try: result = import_representative_workbook(stream, apply=options['apply'])
            except Exception as exc: raise CommandError(str(exc)) from exc
        self.stdout.write('IMPORTED (pending review)' if options['apply'] else 'PREVIEW ONLY')
        for key, count in result.items(): self.stdout.write(f'{key}: {count}')
        self.stdout.write('No imported contact is made public automatically.')
