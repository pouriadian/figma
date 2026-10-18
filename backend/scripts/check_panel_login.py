"""Safe local diagnostic: never prints or persists email/password tokens."""
import getpass
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

project = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

try:
    import django
    django.setup()
    from django.contrib.auth import authenticate, get_user_model
except Exception as error:
    print('[FAIL] Django setup:', type(error).__name__, str(error))
    sys.exit(1)

print('FAROMID Panel Login Check (no passwords or JWTs are printed)')
email = input('Admin email: ').strip()
password = getpass.getpass('Password (hidden): ')
User = get_user_model()
user = authenticate(**{User.USERNAME_FIELD: email}, password=password)
print('Local Django authenticate:', 'OK' if user else 'FAILED')
if user:
    print('User active:', user.is_active, '| Staff:', user.is_staff, '| Superuser:', user.is_superuser)

base = os.getenv('API_INTERNAL_URL', 'http://127.0.0.1:8000').rstrip('/')
url = base + '/api/v1/auth/staff-token/'
req = Request(url, data=json.dumps({'email': email, 'password': password}).encode(),
              headers={'Content-Type': 'application/json', 'Accept': 'application/json'}, method='POST')
try:
    with urlopen(req, timeout=8) as response:
        status = response.status
        data = json.load(response)
except HTTPError as error:
    status = error.code
    try:
        data = json.load(error)
    except Exception:
        data = {}
except URLError as error:
    print('[FAIL] Cannot connect to Django on port 8000:', error.reason)
    sys.exit(2)
except Exception as error:
    print('[FAIL] HTTP check:', type(error).__name__, str(error))
    sys.exit(2)

print('HTTP staff-token endpoint:', status)
if status == 200:
    print('API token generation: OK')
    access = data.get('access', '')
    request = Request(base + '/api/v1/manage/me/', headers={'Authorization': 'Bearer ' + access})
    try:
        with urlopen(request, timeout=8) as response:
            print('API staff profile status:', response.status)
    except HTTPError as error:
        print('API staff profile status:', error.code)
    except URLError as error:
        print('API profile unreachable:', error.reason)
else:
    message = data.get('detail', '')
    if isinstance(message, str) and message:
        print('Safe server message:', message[:200])
    if status == 404:
        print('ACTION: Restart the Django server. It may still be running the old code.')
    elif status == 429:
        print('ACTION: Wait for the rate limit to expire, then try again.')
    elif status == 401 and user:
        print('ACTION: Django CLI and HTTP server may use DIFFERENT databases or configurations.')
    elif status == 403 and user and user.is_staff:
        print('ACTION: Restart Django to load the updated permission code.')

# Clear the in-memory plaintext password reference as soon as possible.
password = ''
