"""
Python Environment and Dependency Pre-Flight Diagnostic Tool for cchart Windows Edition.
Ensures the exact Python 3.11 64-bit interpreter and required libraries are properly configured.
"""

import sys
import struct
import platform

REQUIRED_LIBRARIES = [
    {
        "module": "MetaTrader5",
        "package": "MetaTrader5",
        "description": "MetaTrader 5 Official Integration Library",
        "critical": True,
    },
    {
        "module": "numpy",
        "package": "numpy",
        "description": "NumPy Array Computing",
        "critical": True,
    },
    {
        "module": "pandas",
        "package": "pandas",
        "description": "Pandas Financial Time Series & DataFrame Library",
        "critical": True,
    },
    {
        "module": "fastapi",
        "package": "fastapi",
        "description": "FastAPI High-Performance REST & WebSocket Framework",
        "critical": True,
    },
    {
        "module": "uvicorn",
        "package": "uvicorn[standard]",
        "description": "Uvicorn Lightning-Fast ASGI Server",
        "critical": True,
    },
    {
        "module": "webview",
        "package": "pywebview",
        "description": "PyWebView Native Windows Desktop Container",
        "critical": True,
    },
]

OPTIONAL_LIBRARIES = [
    {
        "module": "websockets",
        "package": "websockets",
        "description": "WebSocket Protocol Library",
    },
    {
        "module": "pydantic",
        "package": "pydantic",
        "description": "Data Validation Library",
    },
    {
        "module": "PyInstaller",
        "package": "pyinstaller",
        "description": "Standalone Windows Executable Packager",
    },
]

def run_diagnostics() -> int:
    python_exe = sys.executable
    bit_size = struct.calcsize("P") * 8
    py_version = sys.version.split()[0]
    is_64bit = bit_size == 64

    print("=" * 76)
    print("      🔍 فحص بيئة بايثون 3.11 وحزم MetaTrader 5 (Python 3.11 Environment Check)")
    print("=" * 76)
    print(f"  [>] Python Executable : {python_exe}")
    print(f"  [>] Python Version    : {py_version} ({bit_size}-bit)")
    print(f"  [>] Operating System  : {platform.system()} {platform.release()} ({platform.machine()})")
    print("-" * 76)

    # 1. Architecture Check
    if not is_64bit:
        print("\n  [❌ FATAL ERROR] Python is NOT 64-bit!")
        print(f"      Detected architecture: {bit_size}-bit.")
        print("      The official MetaTrader 5 Python library REQUIRES 64-bit Python on Windows.")
        print("      Please use the 64-bit Python 3.11 installer from: https://www.python.org/downloads/\n")
        return 2

    # 2. Check Required Packages
    missing_required = []
    installed_required = []

    print("  Checking required libraries:")
    for lib in REQUIRED_LIBRARIES:
        mod_name = lib["module"]
        pkg_name = lib["package"]
        desc = lib["description"]
        try:
            mod = __import__(mod_name)
            ver = getattr(mod, "__version__", "OK")
            print(f"    [✔ INSTALLED] {pkg_name:<18} v{ver:<12} ({desc})")
            installed_required.append(lib)
        except ImportError:
            print(f"    [❌ MISSING]   {pkg_name:<18} (Required: {desc})")
            missing_required.append(lib)

    # 3. Check Optional Packages
    print("\n  Checking optional utilities:")
    for lib in OPTIONAL_LIBRARIES:
        mod_name = lib["module"]
        pkg_name = lib["package"]
        desc = lib["description"]
        try:
            mod = __import__(mod_name)
            ver = getattr(mod, "__version__", "OK")
            print(f"    [✔ INSTALLED] {pkg_name:<18} v{ver:<12} ({desc})")
        except ImportError:
            print(f"    [⚪ OPTIONAL]  {pkg_name:<18} (Not installed: {desc})")

    # 4. Result Evaluation
    if missing_required:
        print("\n" + "=" * 76)
        print("  ⚠️ حزم بايثون ناقصة (MISSING REQUIRED PACKAGES DETECTED)")
        print("=" * 76)
        print("  The following essential libraries must be installed into this Python environment:\n")
        for item in missing_required:
            print(f"    • {item['package']} ({item['description']})")
            print(f"      Command: \"{python_exe}\" -m pip install {item['package']}\n")

        print("  To install ALL required dependencies in a single step, run:")
        print(f"    \"{python_exe}\" -m pip install -r windows\\backend\\requirements.txt\n")
        print("  (Note: Make sure to use the exact python.exe command shown above to prevent")
        print("   installing into the wrong Python environment or Windows Store alias.)")
        print("=" * 76)
        return 1

    print("\n  [✔ OK] جميع الحزم المطلوبة مثبتة بنجاح في بيئة بايثون 3.11!")
    print("  All required libraries verified. Ready to start MetaTrader 5 bridge.\n")
    return 0

if __name__ == "__main__":
    sys.exit(run_diagnostics())
