"""Scoped rate limits with a signed Next.js reverse-proxy client identity.

The API must not be exposed directly to the Internet when using the proxy setup.
Your ingress must strip untrusted forwarded-IP headers from clients.
"""
import hmac
import hashlib
import time
from django.conf import settings
from rest_framework.throttling import ScopedRateThrottle


class ProxyAwareScopedRateThrottle(ScopedRateThrottle):
    def get_ident(self, request):
        key = getattr(settings, 'API_PROXY_SECRET', '')
        value = request.META.get('HTTP_X_FAROMID_CLIENT', '')
        ts = request.META.get('HTTP_X_FAROMID_TIMESTAMP', '')
        signature = request.META.get('HTTP_X_FAROMID_SIGNATURE', '')
        if key and value and ts and signature and len(value) < 128 and ts.isdigit():
            if abs(time.time() - int(ts)) < 90:
                expected = hmac.new(key.encode(), f'{value}.{ts}'.encode(), hashlib.sha256).hexdigest()
                if hmac.compare_digest(expected, signature):
                    return value
        return super().get_ident(request)
