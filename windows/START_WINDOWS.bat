@echo off
chcp 65001 >nul
title شارت - cchart | MetaTrader 5 Desktop Edition (Python 3.11)
color 0B

echo ===============================================================================
echo                شارت - cchart ^| MetaTrader 5 Desktop Edition
echo               منصة الشارت الاحترافية المباشرة مع MetaTrader 5
echo ===============================================================================
echo.

:: -----------------------------------------------------------------------------
:: PART 1: Change to Application Root Directory & Set Exact Python 3.11 Path
:: -----------------------------------------------------------------------------
cd /d "%~dp0"
echo [*] مجلد التطبيق (Working Directory): %CD%

:: Explicit Python 3.11 64-bit Executable Path (No py, no PATH fallback)
set "PYTHON_EXE=C:\Users\user\AppData\Local\Programs\Python\Python311\python.exe"

echo [*] مسار مفسر بايثون المحدد (Target Python):
echo     "%PYTHON_EXE%"
echo.

:: -----------------------------------------------------------------------------
:: PART 2: Verify Python Executable Exists at Exact Path
:: -----------------------------------------------------------------------------
echo [*] التحقق من وجود مفسر بايثون 3.11 (Verifying Python executable)...
if not exist "%PYTHON_EXE%" (
    color 0C
    echo.
    echo ===============================================================================
    echo [خطأ فادح - FATAL ERROR] لم يتم العثور على مفسر بايثون 3.11 في المسار المحدد!
    echo ===============================================================================
    echo المسار المطلوب:
    echo "%PYTHON_EXE%"
    echo.
    echo الأسباب المحتملة:
    echo 1. بايثون 3.11 غير مثبت للمستخدم الحالي في هذا المسار.
    echo 2. اسم المستخدم (user) في مسار النظام يختلف عن اسم حسابك على ويندوز.
    echo.
    echo حلول مقترحة:
    echo - تأكد من تثبيت Python 3.11 64-bit من الموقع الرسمي:
    echo   https://www.python.org/downloads/release/python-3119/
    echo - إذا كان بايثون مثبتاً في مسار آخر، يرجى تعديل متغير PYTHON_EXE داخل START_WINDOWS.bat
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)
echo [✔ OK] تم العثور على ملف مفسر بايثون 3.11 بنجاح.
echo.

:: -----------------------------------------------------------------------------
:: PART 3: Verify Python Architecture is 64-Bit (Required by MetaTrader 5)
:: -----------------------------------------------------------------------------
echo [*] فحص معمارية بايثون (Checking 64-bit architecture)...
"%PYTHON_EXE%" -c "import struct, sys; sys.exit(0 if struct.calcsize('P') * 8 == 64 else 1)" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo ===============================================================================
    echo [خطأ معماري - ARCHITECTURE ERROR] إصدار بايثون المحدد ليس 64-bit!
    echo ===============================================================================
    echo حزمة MetaTrader 5 الرسمية لمنصة ويندوز تتطلب حصراً بيئة بايثون 64-bit.
    echo يرجى تحميل وتثبيت "Windows installer (64-bit)" لـ Python 3.11.
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)
echo [✔ OK] تم التحقق بنجاح: بايثون يعمل بمعمارية 64-bit.
echo.

:: -----------------------------------------------------------------------------
:: PART 4: Display Python Version & Executable Details
:: -----------------------------------------------------------------------------
echo [*] تفاصيل بيئة التشغيل الحالية:
"%PYTHON_EXE%" -c "import sys, struct, platform; print(f'  [>] إصدار بايثون : {sys.version.split()[0]} ({struct.calcsize(\"P\") * 8}-bit)'); print(f'  [>] ملف التشغيل  : {sys.executable}'); print(f'  [>] نظام التشغيل : {platform.system()} {platform.release()} 64-bit')"
echo.

:: -----------------------------------------------------------------------------
:: PART 5: Automatic Library Detection & Dependency Verification
:: -----------------------------------------------------------------------------
echo [*] جاري فحص الحزم المطلوبة في بيئة Python 3.11 (Checking required packages)...
echo -------------------------------------------------------------------------------

set "HAS_MISSING=0"

:: 5.1 Check MetaTrader5
"%PYTHON_EXE%" -c "import MetaTrader5" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [✔ مثبت] MetaTrader5
) else (
    echo   [❌ غير مثبت] MetaTrader5  ^<-- مطلوب للاتصال بمنصة التداول
    echo       أمر التثبيت: "%PYTHON_EXE%" -m pip install MetaTrader5
    set "HAS_MISSING=1"
)

:: 5.2 Check numpy
"%PYTHON_EXE%" -c "import numpy" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [✔ مثبت] numpy
) else (
    echo   [❌ غير مثبت] numpy  ^<-- مطلوب لمعالجة مصفوفات الأسعار والشموع
    echo       أمر التثبيت: "%PYTHON_EXE%" -m pip install "numpy<2.2.0"
    set "HAS_MISSING=1"
)

:: 5.3 Check pandas
"%PYTHON_EXE%" -c "import pandas" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [✔ مثبت] pandas
) else (
    echo   [❌ غير مثبت] pandas  ^<-- مطلوب لتحليل السلاسل الزمنية المالية
    echo       أمر التثبيت: "%PYTHON_EXE%" -m pip install pandas
    set "HAS_MISSING=1"
)

:: 5.4 Check fastapi
"%PYTHON_EXE%" -c "import fastapi" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [✔ مثبت] fastapi
) else (
    echo   [❌ غير مثبت] fastapi  ^<-- مطلوب لإنشاء خادم REST و WebSocket المحلي
    echo       أمر التثبيت: "%PYTHON_EXE%" -m pip install fastapi
    set "HAS_MISSING=1"
)

:: 5.5 Check uvicorn
"%PYTHON_EXE%" -c "import uvicorn" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [✔ مثبت] uvicorn
) else (
    echo   [❌ غير مثبت] uvicorn  ^<-- مطلوب لتشغيل خادم البث الفائق السرعة
    echo       أمر التثبيت: "%PYTHON_EXE%" -m pip install "uvicorn[standard]"
    set "HAS_MISSING=1"
)

:: 5.6 Check pywebview (webview)
"%PYTHON_EXE%" -c "import webview" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [✔ مثبت] pywebview (webview)
) else (
    echo   [❌ غير مثبت] pywebview  ^<-- مطلوب لفتح نافذة سطح المكتب المستقلة
    echo       أمر التثبيت: "%PYTHON_EXE%" -m pip install pywebview
    set "HAS_MISSING=1"
)
echo -------------------------------------------------------------------------------
echo.

:: -----------------------------------------------------------------------------
:: PART 6: Handle Missing Packages Gracefully (No silent failure, no wrong Python)
:: -----------------------------------------------------------------------------
if "%HAS_MISSING%"=="1" (
    color 0E
    echo ===============================================================================
    echo [تنبيه] هناك حزم بايثون مفقودة في بيئة Python 3.11 المحددة!
    echo ===============================================================================
    echo لتثبيت جميع الحزم الناقصة دفعة واحدة في البيئة الصحيحة، يمكنك تنفيذ:
    if exist "windows\backend\requirements.txt" (
        echo "%PYTHON_EXE%" -m pip install -r windows\backend\requirements.txt
    ) else (
        echo "%PYTHON_EXE%" -m pip install -r backend\requirements.txt
    )
    echo.
    set /p INSTALL_CHOICE="هل ترغب في تثبيت الحزم الناقصة الآن تلقائياً؟ (Y/N): "
    if /i "%INSTALL_CHOICE%"=="Y" (
        echo.
        echo [*] جاري ترقية pip وتثبيت الحزم المطلوبة...
        "%PYTHON_EXE%" -m pip install --upgrade pip
        if exist "windows\backend\requirements.txt" (
            "%PYTHON_EXE%" -m pip install -r windows\backend\requirements.txt
        ) else (
            "%PYTHON_EXE%" -m pip install -r backend\requirements.txt
        )
        if %ERRORLEVEL% NEQ 0 (
            color 0C
            echo.
            echo [خطأ] تعذر إكمال تثبيت الحزم. يرجى التحقق من اتصال الإنترنت وتنفيذ الأمر يدوياً.
            pause
            exit /b 1
        )
        color 0B
        echo [✔ OK] تم تثبيت الحزم بنجاح!
        echo.
    ) else (
        echo.
        echo [توقف] يرجى تثبيت الحزم الموضحة أعلاه ثم إعادة تشغيل START_WINDOWS.bat
        pause
        exit /b 1
    )
)

:: -----------------------------------------------------------------------------
:: PART 7: Frontend Build Check
:: -----------------------------------------------------------------------------
if not exist "dist\index.html" (
    echo [*] ملفات واجهة الشارت (dist) غير مبنية مسبقاً.
    echo [*] جاري فحص وجود Node.js وبناء الواجهة عبر Vite...
    call npm --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        call npm run build
    ) else (
        echo [تحذير] لم يتم العثور على npm، سيتم تشغيل الخادم في وضع البريدج.
    )
    echo.
)

:: -----------------------------------------------------------------------------
:: PART 8: Operational Guidance & Instructions
:: -----------------------------------------------------------------------------
echo ===============================================================================
echo  تعليمات تشغيل MetaTrader 5:
echo  1. تأكد من تشغيل برنامج MetaTrader 5 وتسجيل الدخول لحساب التداول الخاص بك.
echo  2. سيتصل البرنامج تلقائياً بالمنصة النشطة عبر mt5.initialize()
echo  3. لا يتطلب التطبيق إدخال كلمات مرور أو مفاتيح سرية (وضع قراءة فقط READ-ONLY).
echo ===============================================================================
echo.

:: -----------------------------------------------------------------------------
:: PART 9: Launch Application with Selected Python 3.11 Interpreter
:: -----------------------------------------------------------------------------
echo [*] جاري تشغيل خادم الربط ونافذة سطح المكتب عبر Python 3.11...
echo.

if exist "windows\backend\main.py" (
    "%PYTHON_EXE%" windows\backend\main.py
) else (
    "%PYTHON_EXE%" backend\main.py
)

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo ===============================================================================
    echo [تنبيه] تم إغلاق أو إنهاء تشغيل التطبيق (رمز الخروج: %ERRORLEVEL%).
    echo ===============================================================================
)

echo.
echo نافذة الأوامر ستبقى مفتوحة للاطلاع على السجلات التشخيصية (Diagnostics).
pause
