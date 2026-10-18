import {NextRequest, NextResponse} from 'next/server';
import {DJANGO, djangoRequest, isSameOrigin, jsonError, setAdminCookies, type AdminTokens} from '@/lib/panel-auth';
import {signedProxyHeaders} from '@/lib/proxy-headers';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError('درخواست از مبدأ نامعتبر ارسال شده است.', 403);

  let fields: unknown;
  try {fields = await request.json();}
  catch {return jsonError('فرمت اطلاعات ورود معتبر نیست.', 400);}

  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return jsonError('فرمت اطلاعات ورود معتبر نیست.', 400);
  }
  const form = fields as Record<string, unknown>;
  const email = typeof form.email === 'string' ? form.email.trim() : '';
  const password = typeof form.password === 'string' ? form.password : '';
  if (!email || !password) return jsonError('ایمیل و رمز عبور لازم است.', 400);

  try {
    // Independent Django staff-only endpoint. Do not use the dealer login endpoint.
    const login = await fetch(`${DJANGO}/api/v1/auth/staff-token/`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...signedProxyHeaders(request),
      },
      body: JSON.stringify({email, password}),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    if (!login.ok) {
      // Previously every Django error, including 429, was incorrectly changed
      // into 401. Preserve the real status and give a useful user-facing error.
      console.warn('[Faromid panel login] Django staff-token status:', login.status);
      if (login.status === 429) {
        const retryAfter = login.headers.get('retry-after');
        const numericRetry = retryAfter && /^\d{1,4}$/.test(retryAfter)
          ? Math.min(300, Number(retryAfter)) : null;
        return jsonError(
          numericRetry !== null
            ? `تعداد تلاش‌های ورود زیاد است. ${numericRetry} ثانیه دیگر دوباره امتحان کنید.`
            : 'تعداد تلاش‌های ورود زیاد است. کمی صبر کنید و دوباره امتحان کنید.',
          429,
        );
      }
      if (login.status === 401) return jsonError('ایمیل یا رمز عبور صحیح نیست.', 401);
      if (login.status === 403) return jsonError('این حساب مجوز ورود به پنل مدیریت را ندارد.', 403);
      if (login.status === 400) return jsonError('ایمیل یا اطلاعات درخواست معتبر نیست.', 400);
      if (login.status === 404) return jsonError('مسیر ورود در Django پیدا نشد. Backend جدید را اجرا کنید.', 502);
      return jsonError(`خطای سرویس ورود Django (${login.status}).`, 502);
    }

    const tokens = await login.json() as AdminTokens;
    if (!tokens || typeof tokens.access !== 'string' || !tokens.access) {
      return jsonError('پاسخ سرویس ورود Django ناقص است.', 502);
    }

    // Verify staff access with an authenticated management endpoint before
    // setting cookies. Never expose JWTs to client-side JavaScript.
    const verified = await djangoRequest('manage/me/', tokens.access);
    if (!verified.ok) {
      console.warn('[Faromid panel login] Django manage/me status:', verified.status);
      if (verified.status === 401) {
        return jsonError('توکن صادرشده توسط Django پذیرفته نشد. سرور Backend را بررسی کنید.', 502);
      }
      if (verified.status === 403) {
        return jsonError('این حساب مجوز ورود به پنل مدیریت را ندارد.', 403);
      }
      return jsonError('تأیید دسترسی پنل توسط Django با خطا مواجه شد.', 502);
    }

    const user = await verified.json();
    const result = NextResponse.json({user}, {headers: {'cache-control': 'no-store'}});
    setAdminCookies(result, tokens);
    return result;
  } catch (error) {
    console.error('[Faromid panel login] Connection or parsing error:',
      error instanceof Error ? error.message : 'Unknown error');
    return jsonError('ارتباط با Django برقرار نشد یا پاسخ آن نامعتبر است.', 503);
  }
}
