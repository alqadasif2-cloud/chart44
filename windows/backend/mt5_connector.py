"""
MetaTrader 5 Connector.
Handles connection lifecycle, auto-detection, non-blocking auto-reconnection,
and thread-safe calls to the official MetaTrader 5 Python library.
Uses the active authenticated MT5 terminal session without asking for credentials.
"""

import sys
import os
import time
import logging
import threading
from typing import Dict, Any, Optional

# Ensure stdout/stderr handles UTF-8 or falls back to replace without UnicodeEncodeError on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Safe relative or package-level imports
try:
    from backend.config import (
        STATE_CONNECTING,
        STATE_CONNECTED,
        STATE_WAITING_DATA,
        STATE_DATA_RECEIVED,
        STATE_LOST,
        STATE_RECONNECTING,
        STATE_RESTORED,
        STATE_TRANSLATIONS_AR,
        RECONNECT_INTERVAL_SEC,
    )
except ImportError:
    from config import (
        STATE_CONNECTING,
        STATE_CONNECTED,
        STATE_WAITING_DATA,
        STATE_DATA_RECEIVED,
        STATE_LOST,
        STATE_RECONNECTING,
        STATE_RESTORED,
        STATE_TRANSLATIONS_AR,
        RECONNECT_INTERVAL_SEC,
    )

logger = logging.getLogger("cchart.mt5")

# Check if MetaTrader5 package is available (native to Windows 64-bit)
MT5_AVAILABLE = False
mt5: Any = None

try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    mt5 = None
    MT5_AVAILABLE = False


class MT5Connector:
    """
    Manages direct connection to the locally running MetaTrader 5 terminal.
    Thread-safe and implements non-blocking automatic reconnection.
    """

    def __init__(self):
        self._lock = threading.RLock()
        self._state: str = STATE_CONNECTING
        self._terminal_info: Dict[str, Any] = {}
        self._account_info: Dict[str, Any] = {}
        self._version_info: str = ""
        self._running: bool = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._last_state_logged: Optional[str] = None
        self._was_connected_before: bool = False

    @property
    def is_connected(self) -> bool:
        with self._lock:
            return self._state in (STATE_CONNECTED, STATE_WAITING_DATA, STATE_DATA_RECEIVED, STATE_RESTORED)

    @property
    def state(self) -> str:
        with self._lock:
            return self._state

    @property
    def state_ar(self) -> str:
        with self._lock:
            return STATE_TRANSLATIONS_AR.get(self._state, self._state)

    def set_state(self, new_state: str, details: str = ""):
        with self._lock:
            if self._state != new_state or (details and details != self._last_state_logged):
                self._state = new_state
                self._last_state_logged = details
                ar = STATE_TRANSLATIONS_AR.get(new_state, new_state)
                prefix = f"[{new_state}]"
                msg = f"{prefix:25} {ar} {('- ' + details) if details else ''}"
                print(msg, flush=True)
                logger.info(msg)

    def initialize_and_connect(self) -> bool:
        """
        Attempts automatic connection to the currently running MT5 terminal.
        Does NOT require any user login credentials or API keys.
        Uses the active, already-authenticated MT5 terminal session.
        """
        if not MT5_AVAILABLE:
            msg = "[MT5 NOT AVAILABLE] حزمة MetaTrader5 غير مثبتة في بيئة Python 3.11 الحالية."
            print(msg, flush=True)
            self.set_state(STATE_LOST, "حزمة MetaTrader5 غير مثبتة أو النظام ليس Windows 64-bit")
            return False

        with self._lock:
            try:
                self.set_state(STATE_CONNECTING, "جاري فحص اتصال منصة MT5 المفتوحة...")

                # Initialize using the active, already-authenticated MT5 session
                initialized = mt5.initialize()
                if not initialized:
                    err = mt5.last_error()
                    err_code = err[0] if isinstance(err, (tuple, list)) and len(err) > 0 else err
                    err_desc = err[1] if isinstance(err, (tuple, list)) and len(err) > 1 else str(err)
                    
                    hint = "تأكد من فتح برنامج MetaTrader 5 وتسجيل الدخول لحسابك"
                    if err_code in (-10004, -10003, 1):
                        hint = "منصة MT5 غير مفتوحة حالياً، في انتظار تشغيل البرنامج..."

                    self.set_state(STATE_CONNECTING, f"{hint} (كود MT5: {err_code} - {err_desc})")
                    return False

                # Query terminal details
                t_info = mt5.terminal_info()
                v_info = mt5.version()
                a_info = mt5.account_info()

                if t_info is not None:
                    self._terminal_info = t_info._asdict()
                if v_info is not None:
                    self._version_info = f"v{v_info[0]} build {v_info[1]} ({v_info[2]})"
                if a_info is not None:
                    # STRICT READ-ONLY: Only store read-only display summary
                    self._account_info = {
                        "login": a_info.login,
                        "server": a_info.server,
                        "name": a_info.name,
                        "company": a_info.company,
                        "currency": a_info.currency,
                        "balance": a_info.balance,
                        "equity": a_info.equity,
                        "leverage": a_info.leverage,
                        "trade_mode": a_info.trade_mode,
                    }

                new_state = STATE_RESTORED if self._was_connected_before else STATE_CONNECTED
                self._was_connected_before = True

                acc_desc = ""
                if self._account_info:
                    acc_desc = f"حساب #{self._account_info.get('login')} ({self._account_info.get('company', '')}) - الرصيد: {self._account_info.get('balance', 0):,.2f} {self._account_info.get('currency', 'USD')}"

                self.set_state(new_state, acc_desc)
                return True
            except Exception as ex:
                self.set_state(STATE_LOST, f"خطأ غير متوقع: {str(ex)}")
                return False

    def start_background_monitor(self):
        """Starts background watchdog thread for automatic reconnect without crashing."""
        if self._running:
            return
        self._running = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True, name="MT5Watchdog")
        self._monitor_thread.start()

    def _monitor_loop(self):
        """Continuously verifies MT5 connection health and reconnects automatically."""
        while self._running:
            try:
                if not MT5_AVAILABLE:
                    time.sleep(RECONNECT_INTERVAL_SEC)
                    continue

                with self._lock:
                    connected = False
                    if mt5 is not None:
                        try:
                            t_info = mt5.terminal_info()
                            connected = t_info is not None and getattr(t_info, "connected", False)
                        except Exception:
                            connected = False

                if not connected:
                    if self._state not in (STATE_LOST, STATE_RECONNECTING, STATE_CONNECTING):
                        self.set_state(STATE_LOST, "انقطع الاتصال بـ MT5... جاري المحاولة...")

                    self.set_state(STATE_RECONNECTING, "جاري محاولة إعادة الاتصال بـ MT5 تلقائياً...")
                    success = self.initialize_and_connect()
                    if not success:
                        time.sleep(RECONNECT_INTERVAL_SEC)
                        continue
            except Exception as e:
                logger.error(f"Error in MT5 monitor loop: {e}")

            time.sleep(RECONNECT_INTERVAL_SEC)

    def get_status_summary(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "mt5_available": MT5_AVAILABLE,
                "is_connected": self.is_connected,
                "state": self._state,
                "state_ar": self.state_ar,
                "version": self._version_info,
                "terminal": {
                    "path": self._terminal_info.get("path", ""),
                    "data_path": self._terminal_info.get("data_path", ""),
                    "connected": self._terminal_info.get("connected", False),
                    "trade_allowed": self._terminal_info.get("trade_allowed", False),
                    "name": self._terminal_info.get("name", "MetaTrader 5"),
                },
                "account": self._account_info,
            }

    def shutdown(self):
        """
        Gracefully releases resources and calls mt5.shutdown().
        Does NOT close the user's running MetaTrader 5 terminal.
        """
        self._running = False
        with self._lock:
            if MT5_AVAILABLE and mt5 is not None:
                try:
                    mt5.shutdown()
                    print("[MT5 DISCONNECTED] تم فصل الاتصال البرمجي مع MT5 بنجاح دون إغلاق المنصة.", flush=True)
                except Exception as e:
                    logger.warning(f"Error during mt5.shutdown(): {e}")
            self._state = STATE_LOST


# Global singleton instance
mt5_connector = MT5Connector()
