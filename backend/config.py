"""
Configuration and settings for cchart MetaTrader 5 Windows Desktop Backend.
Supports running from both /backend and /windows/backend seamlessly.
"""

import os
from typing import Dict

# Local host and port configuration
HOST = "127.0.0.1"
PORT = 8000

# App window metadata
WINDOW_TITLE = "شارت - cchart | MetaTrader 5 Desktop Edition"
WINDOW_WIDTH = 1400
WINDOW_HEIGHT = 860

# Base paths calculation (handles both /backend and /windows/backend)
CURRENT_FILE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_FILE_DIR)
if os.path.basename(PARENT_DIR).lower() == "windows":
    BASE_DIR = os.path.dirname(PARENT_DIR)
else:
    BASE_DIR = PARENT_DIR

FRONTEND_DIST_DIR = os.path.join(BASE_DIR, "dist")

# Reconnection and polling intervals
RECONNECT_INTERVAL_SEC = 3
TICK_STREAM_INTERVAL_SEC = 0.15
DEFAULT_HISTORY_BARS = 1000

# Connection state constants
STATE_CONNECTING = "CONNECTING TO MT5"
STATE_CONNECTED = "MT5 CONNECTED"
STATE_WAITING_DATA = "WAITING FOR MARKET DATA"
STATE_DATA_RECEIVED = "MARKET DATA RECEIVED"
STATE_LOST = "MT5 CONNECTION LOST"
STATE_RECONNECTING = "RECONNECTING"
STATE_RESTORED = "CONNECTION RESTORED"

# Arabic status translations
STATE_TRANSLATIONS_AR: Dict[str, str] = {
    STATE_CONNECTING: "جاري الاتصال بـ MetaTrader 5...",
    STATE_CONNECTED: "تم الاتصال بـ MT5 بنجاح",
    STATE_WAITING_DATA: "في انتظار بيانات السوق...",
    STATE_DATA_RECEIVED: "تم استلام البيانات المباشرة",
    STATE_LOST: "انقطع الاتصال بـ MetaTrader 5",
    STATE_RECONNECTING: "جاري إعادة الاتصال تلقائياً...",
    STATE_RESTORED: "تمت استعادة الاتصال بـ MT5",
}

# Standard timeframes supported by cchart
SUPPORTED_TIMEFRAMES = [
    "1m", "3m", "5m", "15m", "30m", "45m",
    "1h", "2h", "4h", "6h", "8h", "12h",
    "1D", "1W", "1M"
]
