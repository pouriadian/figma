# Faromid Panel Login v5.1 — Validation

## Fix scope
- Django staff-only JWT endpoint checks email/password with `authenticate()` and `is_staff`.
- Scoped rate limit for staff login prevents earlier portal attempts from exhausting a shared throttle.
- Next.js BFF preserves meaningful backend statuses rather than converting everything to 401.
- Next.js origin guard uses incoming Host; the localhost/127.0.0.1 false mismatch is removed.
- Signed client forwarding is reused from the existing BFF implementation.
- Added `CHECK_PANEL_LOGIN.cmd` diagnostic and Django regression tests.
- Existing Django databases and original public website assets are not modified.

## Validation actually performed
- Python `compileall`: successful.
- TypeScript syntax parse: 96 TS/TSX source files, 0 parse errors.
- Node mocked login route tests: 200, 400, 401, 403, 429, 502, 503 (9 scenarios), all passed.
- Frontend asset validation: 83 original files unchanged (SHA256).
- Next.js source integrity checks: 96 files and imports validated.
- Both Windows launcher CMD files taken from the CRLF-fixed v4 release.

## Tests NOT performed
- Actual Django `manage.py test` (Django dependencies unavailable in this environment).
- Full Next.js `next build` (node_modules unavailable in this environment).
- Live browser login to user's Windows instance (no access to localhost or their database).

Run on Windows after replacing files and restarting servers:

    cd backend
    .venv\Scripts\activate
    python manage.py check
    python manage.py test tests.test_management_api

If the Browser still fails, run `CHECK_PANEL_LOGIN.cmd` and share the HTTP statuses only.
