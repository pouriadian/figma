> **Update 5.3:** For the new right-hand collapsible admin navigation, modern product/section modals, simplified product specifications, and consistent view analytics, see [PANEL_V53_FA.md](PANEL_V53_FA.md).

# FAROMID — Full Stack Website + Standalone Next.js Admin Panel

**Version: 5.1 — Next.js `/panel`, Django REST API, no Django Unfold; staff login fix**

The Faromid public website remains on Next.js (port 3000). The employee-facing admin application is a separate, unlinked route in the **same Next.js project**, at **`http://localhost:3000/panel`**. Django (port 8000) supplies the API, authorization, storage and database. No admin link is placed in the public website header or footer. The 83 original frontend raster/SVG assets are left byte-for-byte unchanged.

## Windows: first time, without Docker

Prerequisites: Python 3.12+ and Node.js 20+.

1. Extract the ZIP. Run `setup-first-time.cmd` in the project root. It creates `backend/.venv`, installs requirements, writes local `.env`, migrates SQLite, seeds staff roles, catalog and CMS pages, installs frontend dependencies and offers to create a superuser. No Docker required.
2. Later, run `start-dev.cmd`. It starts Django and Next.js in two separate CMD windows.
3. Open `http://localhost:3000/panel/login` and log in with the **superuser email and password**. Open the admin at `http://localhost:3000/panel`. Public site: `http://localhost:3000/`.

If `npm ci` fails with `EPERM: unlink next-swc...`, close all running Next.js/Node processes before reinstalling. Never delete the existing SQLite/media files to fix an npm error.

## Upgrade an existing Faromid v4 installation

Before replacing code, BACK UP:
- `backend/db.sqlite3` (SQLite data)
- `backend/media/` and `backend/private_media/` (files and private resumes)
- `backend/.env` and `frontend/.env.local` (server secrets)

Extract in a separate location or replace source without overwriting these files. It is safe to keep `backend/.venv` and `frontend/node_modules` when using compatible package versions. From backend, run:

```cmd
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py check
python manage.py migrate
python manage.py seed_roles
python manage.py seed_site_pages
```

**No new database models were introduced in v5**; the panel calls existing model tables with new, permission-controlled API endpoints. Do not run `flush`, remove migration files or reinitialize the database. `django-unfold` is no longer a requirement; if installed in an existing venv it is no longer imported.

## Main architecture

```text
faromid-fullstack/
  frontend/                    Next.js 15 + React + Tailwind v4
    src/app/panel/             private admin application (same project, no public nav link)
    src/app/api/panel/         same-origin BFF, secure HttpOnly admin token cookies
    src/components/panel/      sidebar, login, dashboard, CMS, charts, tables, editors
    src/app/                   original public Faromid website
    public/assets/            original 83 assets (unchanged)
  backend/                     Django 5.2 + Django REST Framework + JWT
    management/api.py         per-role admin API and DB aggregation
    content/                  CMS, draft snapshots and uploads
    catalog/                  products, images and PDFs
    accounts/                 users, roles, representatives
    crm/                      inquiries, jobs and private resumes
    communications/           announcements and delivery tracking
    analytics/                real page/product view events
    config/                   API router and settings
  setup-first-time.cmd
  start-dev.cmd
  PANEL_IMPLEMENTATION_FA.md
```

### Admin routes (all at localhost:3000)

| Route | Function |
|---|---|
| `/panel/login` | Employee login using Django staff account |
| `/panel` | KPI cards, traffic chart, top-products history/chart, inquiries, pages |
| `/panel/pages` | Select a website page |
| `/panel/pages/home` | Manage Home section list and SEO |
| `/panel/pages/home/sections/ID` | Edit title, image, rich-text markup, draft, publish, gallery, featured products |
| `/panel/media` | Upload/choose public images from asset library |
| `/panel/products` | Products list + actual top-products chart |
| `/panel/products/new` and `/panel/products/ID` | Catalog, images, PDF, specs and SEO |
| `/panel/representatives` | Company reps list and records |
| `/panel/inquiries` | Track requests and status history |
| `/panel/applications` | HR review + secure resume download |
| `/panel/content` | News, gallery, exhibitions and projects |
| `/panel/announcements` | Notification drafts and dispatch queue |
| `/panel/deliveries` | Actual per-recipient delivery reports |
| `/panel/users` | Manage staff roles (permission-gated) |
| `/panel/reports` | Analytics dashboard |

### Django API and authentication

- `POST /api/v1/auth/staff-token/` exchanges staff email/password for Django JWT (Next BFF validates staff access before setting **HttpOnly** cookies). The existing `/api/v1/auth/token/` remains for representatives. The staff route has a separate rate limit and Next.js preserves Django 400/401/403/429 status codes.
- `GET /api/v1/manage/me/` gives account profile and module permissions.
- `GET /api/v1/manage/dashboard/?days=7|30|90` returns **real** DB-aggregated series, request statuses, most visited pages, top product daily series.
- `GET/PATCH/POST /api/v1/manage/{resource}/` covers products, images, categories, pages, sections, section-images, media, content, reps, inquiries, applications, announcements, deliveries and users; permissions are enforced on Django on every request.
- `POST /api/v1/manage/sections/{id}/publish/` publishes a sanitized snapshot; drafts remain private.
- `GET /api/v1/manage/applications/{id}/resume/` requires HR permissions; private resumes never become public files.
- `GET /api/v1/site-pages/home/` remains the **published-only** source for the public Next.js Home page.
- `http://127.0.0.1:8000/admin/` is now only Django's **native technical maintenance admin**, not the employee-facing console. Django Unfold is not used.

### Security notes

All admin operations use permission checks on Django, and all browser admin data goes through Next.js same-origin API handlers. Tokens are stored in HttpOnly, SameSite cookies and never accessible to client JavaScript. Mutating admin routes require same-origin requests. Uploads pass through Django's MIME/content validators. There is no production default password; a superuser must be created locally. The release must be integration-tested with real Django/Next.js installs and production HTTPS/proxy settings before deployment.

For a Persian editor guide and migration notes read [PANEL_IMPLEMENTATION_FA.md](PANEL_IMPLEMENTATION_FA.md).

## Panel login repair (v5.1)

See `LOGIN_FIX_FA.md`. If `/panel/login` returns an HTTP error, run `CHECK_PANEL_LOGIN.cmd` while Django is running. The diagnostic does not print passwords or tokens. Replace source files without deleting `backend/db.sqlite3`, media directories or `.env` files; restart both servers afterwards.

---

## Faromid v5.5: Homepage, navbar, CMS preview and catalog filters

See [FAROMID_V55_GUIDE_FA.md](FAROMID_V55_GUIDE_FA.md) for the full Persian Windows upgrade instructions.
Run `UPGRADE_FAROMID_V55.cmd` to add the Home `marquee` section without overwriting current content, then `CHECK_FAROMID_V55.cmd` to execute the Django/Next.js tests on Windows. Existing `.env` files and `backend/db.sqlite3` are intentionally not included in this source distribution.
