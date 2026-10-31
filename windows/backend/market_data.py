"""
Market Data Engine for MetaTrader 5.
Retrieves historical OHLCV candles, real-time ticks, symbol discovery,
broker suffix resolution, and market depth without requiring API keys.
Seamlessly integrates with NumPy and Pandas.
"""

import math
import sys
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

try:
    import numpy as np
except ImportError:
    np = None

try:
    import pandas as pd
except ImportError:
    pd = None

try:
    from backend.mt5_connector import mt5, MT5Connector, mt5_connector
    from backend.config import (
        STATE_DATA_RECEIVED,
        STATE_WAITING_DATA,
    )
except ImportError:
    from mt5_connector import mt5, MT5Connector, mt5_connector
    from config import (
        STATE_DATA_RECEIVED,
        STATE_WAITING_DATA,
    )


def get_mt5_timeframe(tf_str: str) -> Optional[int]:
    """Translates cchart timeframe string to official MetaTrader 5 timeframe constants."""
    if mt5 is None or not hasattr(mt5, "TIMEFRAME_M1"):
        return None

    mapping = {
        "1m": mt5.TIMEFRAME_M1,
        "2m": getattr(mt5, "TIMEFRAME_M2", mt5.TIMEFRAME_M1),
        "3m": getattr(mt5, "TIMEFRAME_M3", mt5.TIMEFRAME_M1),
        "5m": mt5.TIMEFRAME_M5,
        "10m": getattr(mt5, "TIMEFRAME_M10", mt5.TIMEFRAME_M5),
        "15m": mt5.TIMEFRAME_M15,
        "30m": mt5.TIMEFRAME_M30,
        "45m": getattr(mt5, "TIMEFRAME_M30", mt5.TIMEFRAME_M30),
        "1h": mt5.TIMEFRAME_H1,
        "2h": getattr(mt5, "TIMEFRAME_H2", mt5.TIMEFRAME_H1),
        "3h": getattr(mt5, "TIMEFRAME_H3", mt5.TIMEFRAME_H1),
        "4h": mt5.TIMEFRAME_H4,
        "6h": getattr(mt5, "TIMEFRAME_H6", mt5.TIMEFRAME_H4),
        "8h": getattr(mt5, "TIMEFRAME_H8", mt5.TIMEFRAME_H4),
        "12h": getattr(mt5, "TIMEFRAME_H12", mt5.TIMEFRAME_H4),
        "1D": mt5.TIMEFRAME_D1,
        "1d": mt5.TIMEFRAME_D1,
        "1W": mt5.TIMEFRAME_W1,
        "1w": mt5.TIMEFRAME_W1,
        "1M": mt5.TIMEFRAME_MN1,
        "1mn": mt5.TIMEFRAME_MN1,
    }
    return mapping.get(tf_str, mt5.TIMEFRAME_H1)


class MT5MarketDataManager:
    """
    Acquires market data directly from the MT5 terminal.
    Handles broker symbol suffix variations (e.g. XAUUSD.raw, XAUUSDm, GOLD).
    """

    def __init__(self, connector: MT5Connector):
        self.connector = connector
        self._resolved_symbols: Dict[str, str] = {}
        self._symbols_cache: List[Dict[str, Any]] = []
        self._last_symbols_fetch = 0.0

    def get_all_symbols(self) -> List[Dict[str, Any]]:
        """Discovers all tradable symbols available directly in the user's broker terminal."""
        if not self.connector.is_connected or mt5 is None:
            return []

        now = datetime.now().timestamp()
        if self._symbols_cache and (now - self._last_symbols_fetch < 60.0):
            return self._symbols_cache

        with self.connector._lock:
            try:
                symbols = mt5.symbols_get()
                if symbols is None:
                    return []

                result = []
                for s in symbols:
                    path = getattr(s, "path", "")
                    category = "forex"
                    path_lower = path.lower()
                    name_upper = s.name.upper()

                    if any(m in name_upper for m in ["XAU", "GOLD", "XAG", "SILVER", "PLATINUM"]):
                        category = "metal"
                    elif any(c in path_lower for c in ["crypto", "btc", "eth"]):
                        category = "crypto"
                    elif any(i in path_lower for i in ["index", "indices", "nasdaq", "us30", "spx"]):
                        category = "index"
                    elif any(c in path_lower for c in ["commodity", "oil", "brent", "gas"]):
                        category = "commodity"
                    elif "stock" in path_lower or "share" in path_lower:
                        category = "stock"

                    name_ar = s.description if getattr(s, "description", "") else s.name
                    if "XAU" in name_upper or "GOLD" in name_upper:
                        name_ar = f"الذهب ({s.name})"
                    elif "XAG" in name_upper or "SILVER" in name_upper:
                        name_ar = f"الفضة ({s.name})"

                    result.append({
                        "symbol": s.name,
                        "name": s.description or s.name,
                        "nameAr": name_ar,
                        "category": category,
                        "path": path,
                        "digits": s.digits,
                        "point": s.point,
                        "spread": s.spread,
                        "trade_mode": s.trade_mode,
                        "visible": s.visible,
                    })

                self._symbols_cache = result
                self._last_symbols_fetch = now
                return result
            except Exception as e:
                print(f"[MT5 SYMBOLS ERROR] {e}")
                return []

    def resolve_symbol(self, requested_symbol: str) -> str:
        """
        Smart resolution of symbol names:
        Handles broker suffixes (e.g. XAUUSD -> XAUUSDm, XAUUSD.raw, GOLD, etc.)
        """
        clean_req = requested_symbol.strip().upper().replace("/", "")
        if clean_req in self._resolved_symbols:
            return self._resolved_symbols[clean_req]

        if not self.connector.is_connected or mt5 is None:
            return requested_symbol

        with self.connector._lock:
            try:
                all_symbols = mt5.symbols_get()
                if not all_symbols:
                    return requested_symbol

                # 1. Exact match
                for s in all_symbols:
                    if s.name.upper() == clean_req:
                        self._ensure_symbol_selected(s.name)
                        self._resolved_symbols[clean_req] = s.name
                        return s.name

                # 2. Match with standard broker suffixes (e.g. XAUUSDm, XAUUSD., XAUUSD_pro)
                for s in all_symbols:
                    s_clean = s.name.upper().split(".")[0].split("_")[0]
                    if s_clean.endswith(('M', 'C', 'I', 'P', 'R')) and len(s_clean) == len(clean_req) + 1:
                        s_clean = s_clean[:-1]
                    if s_clean == clean_req:
                        self._ensure_symbol_selected(s.name)
                        self._resolved_symbols[clean_req] = s.name
                        return s.name

                # 3. Known commodity/metal aliases
                aliases = {
                    "XAUUSD": ("GOLD", "XAUUSD"),
                    "XAGUSD": ("SILVER", "XAGUSD"),
                    "BTCUSD": ("BTCUSD", "BTCUSDT"),
                    "ETHUSD": ("ETHUSD", "ETHUSDT"),
                }
                if clean_req in aliases:
                    for alias in aliases[clean_req]:
                        for s in all_symbols:
                            if alias in s.name.upper():
                                self._ensure_symbol_selected(s.name)
                                self._resolved_symbols[clean_req] = s.name
                                return s.name

                # 4. Partial substring match
                for s in all_symbols:
                    if clean_req in s.name.upper():
                        self._ensure_symbol_selected(s.name)
                        self._resolved_symbols[clean_req] = s.name
                        return s.name
            except Exception as e:
                print(f"[MT5 RESOLVE ERROR] {e}")

        self._ensure_symbol_selected(requested_symbol)
        self._resolved_symbols[clean_req] = requested_symbol
        return requested_symbol

    def _ensure_symbol_selected(self, symbol_name: str):
        """Ensures the symbol is active in the MT5 Market Watch window."""
        if mt5 is None:
            return
        try:
            mt5.symbol_select(symbol_name, True)
        except Exception:
            pass

    def get_symbol_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Returns detailed symbol specifications."""
        if not self.connector.is_connected or mt5 is None:
            return None

        resolved = self.resolve_symbol(symbol)
        with self.connector._lock:
            try:
                info = mt5.symbol_info(resolved)
                if info is None:
                    return None
                return info._asdict()
            except Exception:
                return None

    def get_historical_candles(
        self,
        symbol: str,
        timeframe: str,
        count: int = 800,
        before_ts: Optional[int] = None,
    ) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Retrieves real historical OHLCV rates from MT5 terminal.
        Formats data into the exact Bar schema expected by cchart.
        Uses NumPy structured array indexing for peak performance.
        """
        if not self.connector.is_connected or mt5 is None:
            return [], "MetaTrader 5 غير متصل. يرجى التأكد من تشغيل MT5 وتسجيل الدخول."

        resolved = self.resolve_symbol(symbol)
        mt5_tf = get_mt5_timeframe(timeframe)
        if mt5_tf is None:
            return [], f"الفريم الزمني {timeframe} غير مدعوم في MT5"

        with self.connector._lock:
            try:
                self._ensure_symbol_selected(resolved)

                if before_ts is not None and before_ts > 0:
                    dt_from = datetime.fromtimestamp(before_ts, tz=timezone.utc)
                    rates = mt5.copy_rates_from(resolved, mt5_tf, dt_from, count)
                else:
                    rates = mt5.copy_rates_from_pos(resolved, mt5_tf, 0, count)

                if rates is None or len(rates) == 0:
                    err = mt5.last_error()
                    return [], f"لم يتم استلام شموع لـ {resolved} (كود MT5: {err})"

                bars: List[Dict[str, Any]] = []
                for r in rates:
                    t = int(r["time"])
                    o = float(r["open"])
                    h = float(r["high"])
                    l = float(r["low"])
                    c = float(r["close"])
                    tick_vol = float(r["tick_volume"])
                    real_vol = float(r["real_volume"]) if "real_volume" in r.dtype.names else 0.0
                    spread = int(r["spread"]) if "spread" in r.dtype.names else 0

                    vol = real_vol if real_vol > 0 else (tick_vol if tick_vol > 0 else 1.0)
                    is_bullish = c >= o
                    buy_ratio = 0.6 if is_bullish else 0.4
                    buy_vol = vol * buy_ratio
                    sell_vol = max(0.0, vol - buy_vol)

                    bars.append({
                        "t": t,
                        "o": o,
                        "h": h,
                        "l": l,
                        "c": c,
                        "v": vol,
                        "tickVol": tick_vol,
                        "realVol": real_vol,
                        "spread": spread,
                        "buyVol": buy_vol,
                        "sellVol": sell_vol,
                        "trades": int(tick_vol),
                    })

                self.connector.set_state(STATE_DATA_RECEIVED, f"{len(bars)} شمعة لـ {resolved} ({timeframe})")
                return bars, None
            except Exception as e:
                return [], f"خطأ في قراءة بيانات MT5: {str(e)}"

    def get_latest_tick(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Retrieves real-time tick from MT5."""
        if not self.connector.is_connected or mt5 is None:
            return None

        resolved = self.resolve_symbol(symbol)
        with self.connector._lock:
            try:
                self._ensure_symbol_selected(resolved)
                t = mt5.symbol_info_tick(resolved)
                if t is None:
                    return None
                return {
                    "symbol": resolved,
                    "time": int(t.time),
                    "bid": float(t.bid),
                    "ask": float(t.ask),
                    "last": float(t.last or t.bid),
                    "volume": float(t.volume),
                    "volume_real": float(getattr(t, "volume_real", 0.0)),
                    "spread": float(getattr(t, "spread", 0.0)),
                }
            except Exception:
                return None

    def get_market_depth(self, symbol: str) -> List[Dict[str, Any]]:
        """Retrieves Level 2 DOM (Depth of Market) if provided by the broker."""
        if not self.connector.is_connected or mt5 is None:
            return []

        resolved = self.resolve_symbol(symbol)
        with self.connector._lock:
            try:
                self._ensure_symbol_selected(resolved)
                mt5.market_book_add(resolved)
                book = mt5.market_book_get(resolved)
                if not book:
                    return []
                return [
                    {
                        "type": "buy" if item.type == mt5.BOOK_TYPE_BUY else "sell",
                        "price": float(item.price),
                        "volume": float(item.volume),
                        "volume_real": float(getattr(item, "volume_real", 0.0)),
                    }
                    for item in book
                ]
            except Exception:
                return []


# Global singleton instance
market_data_manager = MT5MarketDataManager(mt5_connector)
