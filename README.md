# گالری تصاویر (Photo Gallery)

وب‌سایت گالری عکس فارسی و راست‌چین با HTML، CSS و JavaScript خالص، مناسب GitHub Pages.

## ساختار
```
index.html      صفحه عمومی گالری (گالری، آلبوم‌ها، علاقه‌مندی‌ها، درباره)
admin.html      پنل مدیریت (آپلود، چیدمان، آلبوم، تنظیمات، انتشار)
404.html        صفحه ۴۰۴ اختصاصی
assets/css      base.css  gallery.css  admin.css
assets/js       util.js  zip.js  store.js  gallery.js  admin.js
assets/images   تصاویر (در ابتدا ۱۲ نمونه)
data            gallery.json (اطلاعات منتشرشده) و gallery.js (نسخه پشتیبان برای اجرای مستقیم فایل)
```

## انتشار روی GitHub Pages
1. همه فایل‌ها را در یک مخزن بگذارید و در Settings ‹ Pages شاخه main را انتخاب کنید.
2. برای مدیریت، `admin.html` را باز کنید؛ تصاویر و تغییرات در مرورگر شما (IndexedDB) ذخیره می‌شوند.
3. در بخش «انتشار و خروجی» بسته ZIP را دانلود کنید و پوشه‌های `data` و `assets/images` را در مخزن جایگزین کنید.

## اجرای محلی
بهتر است با یک وب‌سرور ساده اجرا کنید: `python -m http.server` و سپس باز کردن `http://localhost:8000`.
باز کردن مستقیم `index.html` هم کار می‌کند (از `data/gallery.js` استفاده می‌شود).
