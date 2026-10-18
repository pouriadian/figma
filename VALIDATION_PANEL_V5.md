# Faromid v5 — validation status

## Completed checks (2026-10-14)

- Compared all 83 images and SVGs with the user-uploaded v4 ZIP byte-for-byte using SHA256: identical.
- `python -m compileall -q backend`: passed Python syntax validation.
- TypeScript `transpileModule` over 96 TS/TSX files: zero syntactic diagnostics. This is NOT a TypeScript typecheck.
- `node frontend/scripts/verify-design-free.mjs`: passed.
- `node frontend/scripts/verify-assets.mjs`: passed.
- `node frontend/scripts/verify-source.mjs`: passed.
- `tinycss2.parse_stylesheet` on `frontend/src/app/panel/panel.css`: zero parser errors.
- `django-unfold` removed from requirements and installed Django apps.
- `/panel` URL and its same-origin API relay added to Next.js; authorization checks implemented server-side in Django.

## Not executed in the authoring environment

The sandbox could not resolve required PyPI and npm registry hosts. Therefore we could not install Django/DRF or Next.js/React to run:

- `python manage.py check`, `python manage.py test`, or migration checks;
- `npm run lint`, `npm run build`, or Playwright against the running full-stack app;
- An end-to-end upload/draft/publish test.

Do not treat the static `PANEL_UI_PREVIEW.html` as proof of a running Next.js UI: it is a layout preview with illustrative numbers. Dashboard and product charts in the actual app use database TrafficEvent records and return an empty state when no data exists.

## Required Windows smoke test

1. Back up existing SQLite database, uploaded media, private resumes and both `.env` files.
2. Run `setup-first-time.cmd` once on a clean extraction, or upgrade existing backend with `pip install -r requirements.txt`, `python manage.py check`, `python manage.py migrate`, `python manage.py seed_roles` and `python manage.py seed_site_pages`.
3. In `frontend`: `npm ci`, `npm run lint`, `npm run build`.
4. Run `start-dev.cmd`. Verify Django `/health/`, public Next.js `/`, and private Next.js `/panel/login`.
5. Sign in with an existing Django superuser EMAIL and password. Verify staff-only access and representatives blocked.
6. Check products CRUD and the `/panel/products` top-products chart; create a public product view to confirm the count changes.
7. Edit Home CMS title/image, save draft (public site unchanged), publish (public site changes), unpublish (public block disappears). Confirm original `/assets/` bytes are unchanged.
8. Test upload preview, library images, protected resume, announcements queue, mobile width, keyboard navigation and browser reload.

Production deployment requires separate HTTPS, host/proxy and security review.
