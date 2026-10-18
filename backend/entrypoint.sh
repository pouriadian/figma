#!/bin/sh
set -e
# Bootstrap only for a fresh MVP checkout. Generated migrations persist in the
# host-mounted backend directory. Commit them before deploying to production.
if [ "${BOOTSTRAP_MIGRATIONS:-0}" = '1' ]; then
  python manage.py makemigrations accounts catalog crm communications content analytics --noinput
fi
python manage.py migrate --noinput
python manage.py seed_roles
python manage.py collectstatic --noinput >/dev/null
if [ "${SEED_INITIAL_DATA:-0}" = '1' ]; then python manage.py seed_catalog; fi
exec "$@"
