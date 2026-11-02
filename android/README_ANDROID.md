# cchart - تطبيق أندرويد المستقل (Android Edition)

تطبيق أندرويد مستقل وخفيف يعرض شارتات الأسواق المالية، الذهب والفضة والعملات الرقمية والفوركس مباشرة عبر واجهات API الحية.

---

## 🌟 مميزات إصدار أندرويد

1. **اعتماد كلي على واجهات API**:
   - يجلب البيانات مباشرة من واجهات برمجة التطبيقات (Binance Public WebSocket & REST للعملات الرقمية، و Twelve Data API للذهب والفضة والعملات).
2. **استقلالية تامة عن بايثون أو MetaTrader 5**:
   - **لا يستخدم إطلاقاً** حزمة MetaTrader5 ولا يتطلب أي خادم بايثون.
   - يعمل على أي جهاز أندرويد مستقل (الهواتف والأجهزة اللوحية).
3. **إعادة الاتصال التلقائي وإدارة الأخطاء**:
   - إعادة اتصال تلقائية بقنوات WebSocket عند انقطاع الإنترنت مع فترات انتظار متدرجة (Exponential Backoff).
   - عرض رسائل واضحة ومفهومة عند أخطاء الشبكة أو حدود الـ API.
4. **شارت كامل الميزات**:
   - شموع يابانية، خطوط، ومؤشرات فنية (SMA, RSI, MACD, Volume Profile, Supertrend, etc.)، وأدوات الرسم، وإعادة التشغيل (Replay).

---

## 📁 هيكلية مشروع أندرويد (`android/`)

```
android/
├── app/
│   ├── build.gradle.kts                   # إعدادات تطبيق أندرويد و Android 14 SDK 34
│   └── src/main/
│       ├── AndroidManifest.xml            # أذونات الإنترنت والشبكة ونقطة انطلاق التطبيق
│       ├── java/com/goldsilver/charts/
│       │   ├── MainActivity.kt            # واجهة Jetpack Compose الرئيسية مع RTL
│       │   ├── MainViewModel.kt           # إدارة حالة التطبيق وجلب البيانات والتخزين المؤقت
│       │   ├── Chart.kt                   # محرك رسم الشموع اليابانية التفاعلي باللمس
│       │   └── Api.kt                     # عميل Twelve Data REST API المباشر مع Coroutines
│       └── res/
│           ├── drawable/                  # أيقونات التطبيق المتجهة
│           └── values/                    # السمة الداكنة واسم التطبيق
├── build.gradle.kts                       # إعدادات Gradle الرئيسية
├── settings.gradle.kts                    # مستودعات التبعيات Google و MavenCentral
├── gradle.properties                      # إعدادات ذاكرة JVM و AndroidX
└── gradlew                                # سكربت Gradle Wrapper
```

---

## 🔨 طرق بناء تطبيق أندرويد (Build APK)

### الطريقة الأولى: عبر Android Studio
1. افتح برنامج **Android Studio**.
2. اختر **Open** ثم حدد مجلد `android/` داخل هذا المستودع.
3. انتظر انتهاء مزامنة Gradle Sync.
4. اضغط على **Build** ← **Build Bundle(s) / APK(s)** ← **Build APK(s)**.
5. ستجد ملف `app-debug.apk` داخل: `android/app/build/outputs/apk/debug/`.

### الطريقة الثانية: سطر الأوامر (Command Line)
```bash
cd android
./gradlew assembleDebug
```

### الطريقة الثالثة: عبر GitHub Actions
1. ادخل إلى مستودعك على GitHub.
2. اضغط على تبويب **Actions**.
3. اختر **Build Android App (APK)** واضغط **Run workflow**.
4. بعد اكتمال البناء، ستجد ملف **GoldSilver-android-debug-apk** جاهزاً للتحميل المباشر.
