# اصلاح خطاهای پنل و وب‌سایت Faromid — v5.2

## خطاهای مشخص‌شده از روی لاگ

- **کامپایل محصولات / خطای 500 کل Next.js**: متغیر `products` دوبار در `product-collection.tsx` تعریف شده بود. خروجی `useMemo` به `visibleProducts` تغییر کرد.
- **`GET /pages/home/seo 500`**: در DRF، فراخوانی `PageSEOSerializer(obj, data=None)` برای GET باعث AssertionError می‌شد. اکنون در GET، Serializer بدون آرگومان `data` ساخته می‌شود.
- **`GET /users 500`**: مدل User از `AbstractUser` ارث می‌برد و `date_joined` دارد، نه `created_at`. اکنون پاسخ API فیلد سازگار `created_at` را از `date_joined` می‌خواند.
- **`POST /api/public/analytics 403`**: تطابق Origin با `request.nextUrl.origin` در Next.js گاهی باعث رد اشتباه `localhost` می‌شد. اکنون Origin با HTTP Host بررسی می‌شود.
- **`GET /sections 404`**: مسیر در نسخه ارسالی Backend ثبت شده است؛ علت 404 روی دستگاه شما می‌تواند اجرای کد قدیمی Backend یا ناقص‌بودن جایگزینی فایل‌ها باشد. تست مسیر به ابزار تشخیصی اضافه شد.

## اعمال Patch در Windows

1. **از پوشه پروژه نسخه پشتیبان بگیرید**؛ به‌ویژه از `backend/db.sqlite3`، فایل‌های `.env` و پوشه `backend/media`.
2. محتوای **ZIP کوچک Patch** را در این آدرس Extract کنید؛ در پنجره پرسش، **Replace** را انتخاب کنید:

   `C:\Users\Fardiran\Desktop\faromid-nextjs`

   ساختار فایل ZIP از `frontend/...` و `backend/...` شروع می‌شود؛ نباید یک پوشه اضافی ساخته شود.
3. در پنجره Django، `Ctrl+C` را فشار دهید و سپس در CMD این دستورها را اجرا کنید:

   ```cmd
   cd /d C:\Users\Fardiran\Desktop\faromid-nextjs\backend
   .venv\Scripts\activate
   python manage.py check
   python manage.py check_panel_errors
   ```
4. **اگر خروجی `TABLE MISSING` دیدید**، پس از بررسی نسخه پشتیبان، migrations قبلی خود را حفظ کرده و دستورهای زیر را اجرا کنید:

   ```cmd
   python manage.py makemigrations accounts catalog crm communications content analytics
   python manage.py migrate
   python manage.py seed_site_pages
   python manage.py check_panel_errors
   ```

   تا زمانی که `TABLE MISSING` دیده نشده، نیازی به تغییر migrations نیست.
5. پنجره Next.js را نیز با `Ctrl+C` ببندید و `start-dev.cmd` را از ریشه پروژه اجرا کنید. کش مرورگر را با `Ctrl+Shift+R` بازخوانی کنید.

## بررسی بعد از اصلاح

- `http://localhost:3000/products` : خطای `Identifier 'products' has already been declared` نباید وجود داشته باشد.
- `http://localhost:3000/panel/pages/home` : API بخش‌ها و SEO باید `200` بدهد.
- `http://localhost:3000/panel/users` : API کاربران باید `200` بدهد.
- `POST /api/public/analytics` از سایت باید `204` بدهد، مگر آنکه محدودیت درخواست‌ها `429` یا اعتبارسنجی داده‌ها `400` را برگرداند.
- وضعیت `401` برای `/api/panel/session` **قبل از ورود** طبیعی است؛ در لاگ شما ورود با `POST /api/panel/auth/login 200` موفق شده است.

## موارد خارج از دسترس برای تست

تست Syntax پایتون و صحت هش ۸۳ تصویر اصلی موفق بوده است. اجرای تست‌های یکپارچه Django و Build کامل Next.js در محیط تهیه Patch امکان‌پذیر نبود، زیرا نصب وابستگی از اینترنت در دسترس نبود؛ برای تأیید نهایی روی Windows اجرا کنید:

```cmd
cd /d C:\Users\Fardiran\Desktop\faromid-nextjs\backend
.venv\Scripts\python.exe manage.py test tests.test_management_api

cd /d C:\Users\Fardiran\Desktop\faromid-nextjs\frontend
npm run check
npm run build
```

اگر فقط `sections` در ابزار تشخیصی `ROUTE 404` نشان داد، احتمالاً فایل `backend/management/api.py` از بسته اصلاحی جایگزین نشده یا Django قدیمی هنوز در حال اجراست. اگر `ROUTE OK` بود ولی `HTTP 404` می‌گرفتید، خروجی همان ابزار را ارسال کنید تا علت وابسته به محیط شناسایی شود.

**هیچ‌کدام از فایل‌های اصلی تصویر و SVG برای این اصلاح تغییر نکرده‌اند.**
