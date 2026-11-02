# cchart - منصة الشارتات المالية (إصدار أندرويد + إصدار ويندوز)

مشروع مالي متكامل يحتوي على إصدارين مستقلين تماماً، كل إصدار له مصدر بياناته وبنيته الخاصة مع مشاركة محرك الشارت الفني والخصائص العامة:

---

## 🏗️ البنية العامة للمشروع (Project Structure)

```text
├── android/                         # إصدار أندرويد المستقل (Native Jetpack Compose & Gradle)
│   ├── app/
│   │   ├── src/main/java/com/goldsilver/charts/
│   │   │   ├── MainActivity.kt      # واجهة المستخدم الأصلية للهواتف
│   │   │   ├── MainViewModel.kt     # إدارة البيانات والتخزين المؤقت
│   │   │   ├── Chart.kt             # محرك رسم الشموع اليابانية باللمس
│   │   │   └── Api.kt               # عميل API المباشر (Zero MT5 / Zero Python)
│   │   ├── src/main/AndroidManifest.xml
│   │   └── build.gradle.kts
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── README_ANDROID.md
│
├── windows/                         # إصدار ويندوز المستقل (Desktop Edition with MetaTrader 5)
│   ├── backend/
│   │   ├── main.py                  # خادم FastAPI ونافذة PyWebView المستقلة
│   │   ├── mt5_connector.py         # الاتصال التلقائي المباشر ببرنامج MetaTrader 5
│   │   ├── market_data.py           # جلب الشموع والأسعار اللحظية من سيرفر الوسيط
│   │   ├── check_env.py             # الفحص التشخيصي لبيئة Python 3.11 64-bit
│   │   └── requirements.txt         # حزم بايثون المتوافقة
│   ├── START_WINDOWS.bat            # مشغل سطح المكتب للويندوز
│   ├── BUILD_WINDOWS_EXE.bat        # حزم التطبيق إلى ملف EXE مستقل
│   └── README_WINDOWS.md
│
├── src/                             # محرك الشارت المشترك (Shared Financial Canvas Engine)
│   ├── components/                  # عناصر الواجهة المشتركة (TopToolbar, LeftToolbar, Modals)
│   ├── data/
│   │   ├── apiDataSource.ts         # مصدر بيانات API لأندرويد والويب (Binance & Twelve Data)
│   │   ├── mt5DataSource.ts         # مصدر بيانات MetaTrader 5 لنظام ويندوز
│   │   └── marketData.ts            # المنسق الموحد القائم على فصل المصادر
│   ├── drawings/                    # محرك أدوات الرسم الفني
│   ├── indicators/                  # أكثر من 30 مؤشر فني (RSI, MACD, Moving Averages, etc.)
│   ├── pine/                        # محرك ومفسر Pine Script المخصص
│   └── types/                       # تعريفات الأنواع المشتركة
│
├── .github/workflows/               # خطوط البناء والتشغيل الآلي على GitHub Actions
│   ├── build-android.yml            # بناء ملف Android APK تلقائياً
│   ├── build-windows.yml            # بناء ملف Windows EXE تلقائياً
│   └── ci.yml                       # فحص جودة الكود و TypeScript
│
├── capacitor.config.json            # إعدادات حزم التطبيق المشترك للهواتف الذكية
├── START_WINDOWS.bat                # اختصار تشغيل ويندوز في المجلد الرئيسي
└── BUILD_WINDOWS_EXE.bat            # اختصار تجميع ويندوز في المجلد الرئيسي
```

---

## 📱 1. إصدار أندرويد (Android Edition)

- **مصدر البيانات**: يعتمد كلياً على واجهات برمجة التطبيقات (API) مثل Twelve Data و Binance.
- **الاستقلالية**: لا يتطلب Python ولا MetaTrader 5.
- **البناء**:
  - فتح مجلد `android/` في Android Studio والضغط على Build APK.
  - أو تشغيل `cd android && ./gradlew assembleDebug`.
  - أو عبر GitHub Actions عبر تشغيل سير العمل **Build Android App (APK)**.

---

## 💻 2. إصدار ويندوز (Windows Edition)

- **مصدر البيانات**: يتصل مباشرة بمنصة **MetaTrader 5** المفتوحة على جهازك عبر `MetaTrader5` في Python 3.11 64-bit دون الحاجة لمفاتيح API خارجية.
- **التشغيل السريع**: نقر مزدوج على `START_WINDOWS.bat`.
- **البناء**: نقر مزدوج على `BUILD_WINDOWS_EXE.bat` أو عبر GitHub Actions عبر سير العمل **Build Windows Desktop App**.
