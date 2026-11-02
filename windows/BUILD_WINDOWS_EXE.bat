@echo off
chcp 65001 >nul
title بناء ملف تشغيل ويندوز المستقل (Build Windows Standalone EXE) - Python 3.11
color 0A

echo ===============================================================================
echo            بناء تطبيق ويندوز المستقل (Build Standalone Windows EXE)
echo               شارت - cchart ^| MetaTrader 5 Desktop Application
echo ===============================================================================
echo.

cd /d "%~dp0"
set "PYTHON_EXE=C:\Users\user\AppData\Local\Programs\Python\Python311\python.exe"

if not exist "%PYTHON_EXE%" (
    color 0C
    echo [خطأ] لم يتم العثور على مفسر Python 3.11 في المسار:
    echo "%PYTHON_EXE%"
    pause
    exit /b 1
)

:: 1. Build frontend React/Vite application
echo [*] الخطوة 1: بناء واجهة الشارت عبر Vite (Building frontend)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [خطأ] فشل بناء واجهة المستخدم!
    pause
    exit /b 1
)

:: 2. Ensure PyInstaller is installed in the selected Python environment
echo [*] الخطوة 2: التحقق من PyInstaller في بيئة Python 3.11...
"%PYTHON_EXE%" -c "import PyInstaller" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] جاري تثبيت PyInstaller في بيئة Python 3.11...
    "%PYTHON_EXE%" -m pip install pyinstaller
)

:: 3. Package application using PyInstaller
echo [*] الخطوة 3: تجميع التطبيق إلى ملف تنفيذي (Packaging with PyInstaller)...
set "MAIN_PATH=windows\backend\main.py"
if not exist "%MAIN_PATH%" set "MAIN_PATH=backend\main.py"

"%PYTHON_EXE%" -m PyInstaller --clean -y ^
    --name="cchart_mt5" ^
    --windowed ^
    --add-data "dist;dist" ^
    --add-data "backend;backend" ^
    --add-data "windows\backend;windows\backend" ^
    %MAIN_PATH%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [خطأ - ERROR] فشل تجميع ملف EXE!
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo [نجاح - SUCCESS] تم بناء تطبيق ويندوز المستقل بنجاح!
echo تجد البرنامج التنفيذي في المسار:
echo dist\cchart_mt5\cchart_mt5.exe
echo ===============================================================================
echo.
pause
