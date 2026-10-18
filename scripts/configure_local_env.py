"""Configure Faromid local development without Docker or external packages.

Creates the backend/frontend dotenv files if missing, generates distinct strong
secrets, and ensures the API proxy secret matches between the two applications.
Existing non-placeholder Django secret keys and DB configuration are preserved.
"""
from __future__ import annotations

import secrets
import shutil
import sys
from pathlib import Path


def read_values(path: Path) -> dict[str, str]:
    result = {}
    if not path.exists():
        return result
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip()
        if val.startswith(('"', "'")) and val.endswith(val[:1]):
            val = val[1:-1]
        result[key] = val
    return result


def update_key(path: Path, key: str, value: str) -> None:
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    done = False
    for i, line in enumerate(lines):
        if line.lstrip().startswith("#") or "=" not in line:
            continue
        candidate = line.split("=", 1)[0].strip()
        if candidate == key:
            lines[i] = f"{key}={value}"
            done = True
            break
    if not done:
        lines.append(f"{key}={value}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def placeholder(value: str | None) -> bool:
    if not value:
        return True
    upper = value.upper()
    return any(marker in upper for marker in (
        "CHANGE_ME", "LOCAL_DEV_ONLY", "INSECURE-LOCAL", "YOUR_", "REPLACE_ME"
    ))


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: configure_local_env.py PROJECT_ROOT", file=sys.stderr)
        return 2
    root = Path(sys.argv[1]).resolve()
    backend = root / "backend" / ".env"
    frontend = root / "frontend" / ".env.local"
    backend_template = root / "backend" / ".env.example"
    frontend_template = root / "frontend" / ".env.local.example"
    for template, dest in ((backend_template, backend), (frontend_template, frontend)):
        if not dest.is_file():
            if not template.is_file():
                print(f"[ERROR] Missing template: {template}", file=sys.stderr)
                return 1
            shutil.copyfile(template, dest)
            print(f"Created {dest.relative_to(root)}")
        else:
            print(f"Keeping existing {dest.relative_to(root)}")

    be = read_values(backend)
    secret = be.get("DJANGO_SECRET_KEY")
    if placeholder(secret):
        update_key(backend, "DJANGO_SECRET_KEY", secrets.token_urlsafe(48))
        print("Generated a new Django secret key.")

    proxy_secret = be.get("API_PROXY_SECRET")
    if placeholder(proxy_secret):
        proxy_secret = secrets.token_hex(32)
        update_key(backend, "API_PROXY_SECRET", proxy_secret)
        print("Generated a new shared API proxy secret.")

    fe = read_values(frontend)
    if fe.get("API_PROXY_SECRET") != proxy_secret:
        update_key(frontend, "API_PROXY_SECRET", proxy_secret)
        print("Synchronized frontend API_PROXY_SECRET with backend.")
    if not fe.get("API_INTERNAL_URL"):
        update_key(frontend, "API_INTERNAL_URL", "http://127.0.0.1:8000")
    if not fe.get("NEXT_PUBLIC_SITE_URL"):
        update_key(frontend, "NEXT_PUBLIC_SITE_URL", "http://localhost:3000")

    be = read_values(backend)
    db = "PostgreSQL" if be.get("DATABASE_URL") or be.get("POSTGRES_HOST") else "SQLite"
    print(f"Local configuration ready. Database mode: {db}.")
    if be.get("DJANGO_DEBUG") != "1":
        print("[WARNING] DJANGO_DEBUG is not 1. Verify that this is intended for development.")
    print("Keep backend/.env and frontend/.env.local private; never commit them.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
