"""
Main FastAPI server and PyWebView Desktop Application entry point for cchart MT5.
Provides local REST & WebSocket endpoints and launches the Windows desktop window.
Configured for Python 3.11 64-bit environment.
"""

import os
import sys
import json
import time
import struct
import asyncio
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

# Ensure directories are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
ROOT_DIR = os.path.dirname(PARENT_DIR) if os.path.basename(PARENT_DIR).lower() == "windows" else PARENT_DIR

for p in [CURRENT_DIR, PARENT_DIR, ROOT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse

try:
    from backend.config import (
        HOST,
        PORT,
        WINDOW_TITLE,
        WINDOW_WIDTH,
        WINDOW_HEIGHT,
        FRONTEND_DIST_DIR,
        TICK_STREAM_INTERVAL_SEC,
    )
    from backend.mt5_connector import mt5_connector
    from backend.market_data import market_data_manager
except ImportError:
    from config import (
        HOST,
        PORT,
        WINDOW_TITLE,
        WINDOW_WIDTH,
        WINDOW_HEIGHT,
        FRONTEND_DIST_DIR,
        TICK_STREAM_INTERVAL_SEC,
    )
    from mt5_connector import mt5_connector
    from market_data import market_data_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("cchart")

# Initialize FastAPI application
app = FastAPI(
    title="cchart MetaTrader 5 Bridge",
    description="Direct high-performance market data bridge between MetaTrader 5 and cchart frontend.",
    version="2.1.0",
)

# Enable CORS for localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Starts MT5 connector and background health watchdog."""
    bits = struct.calcsize("P") * 8
    print("=" * 76, flush=True)
    print("  [LAUNCH] cchart | MetaTrader 5 Windows Desktop Bridge", flush=True)
    print(f"  [PYTHON] Interpreter : {sys.executable}", flush=True)
    print(f"  [VERSION] Version    : {sys.version.split()[0]} ({bits}-bit)", flush=True)
    print("=" * 76, flush=True)
    mt5_connector.start_background_monitor()
    mt5_connector.initialize_and_connect()


@app.on_event("shutdown")
def on_shutdown():
    """Safely shuts down MT5 session without killing terminal."""
    mt5_connector.shutdown()


# ----------------------------------------------------
# REST API ENDPOINTS
# ----------------------------------------------------

@app.get("/api/status")
def get_status():
    """Returns MT5 connection status, terminal info, and account summary."""
    return mt5_connector.get_status_summary()


@app.get("/api/symbols")
def get_symbols():
    """Returns all available symbols discovered directly from the MT5 terminal."""
    symbols = market_data_manager.get_all_symbols()
    return {"symbols": symbols, "count": len(symbols)}


@app.get("/api/symbol_info")
def get_symbol_info(symbol: str = Query(..., description="Symbol name e.g. XAUUSD")):
    """Returns detailed specifications for a specific symbol."""
    info = market_data_manager.get_symbol_info(symbol)
    if info is None:
        return JSONResponse(status_code=404, content={"error": f"Symbol {symbol} not found in MT5"})
    return info


@app.get("/api/candles")
def get_candles(
    symbol: str = Query("XAUUSD", description="Symbol name e.g. XAUUSD"),
    tf: str = Query("15m", description="Timeframe e.g. 1m, 5m, 15m, 1h, 1D"),
    count: int = Query(800, ge=10, le=5000, description="Number of candles"),
    before_ts: Optional[int] = Query(None, description="Load history prior to timestamp"),
):
    """
    Retrieves real historical OHLCV bars directly from MT5.
    Returns bars in the exact format required by the chart canvas.
    """
    bars, error = market_data_manager.get_historical_candles(
        symbol=symbol,
        timeframe=tf,
        count=count,
        before_ts=before_ts,
    )
    if error:
        return JSONResponse(status_code=400, content={"error": error, "bars": []})

    return {
        "symbol": symbol,
        "resolved_symbol": market_data_manager.resolve_symbol(symbol),
        "tf": tf,
        "count": len(bars),
        "bars": bars,
    }


@app.get("/api/tick")
def get_tick(symbol: str = Query("XAUUSD")):
    """Returns current real-time tick for a symbol."""
    tick = market_data_manager.get_latest_tick(symbol)
    if tick is None:
        return JSONResponse(status_code=404, content={"error": "Tick not available"})
    return tick


@app.get("/api/depth")
def get_depth(symbol: str = Query("XAUUSD")):
    """Returns real Level 2 Market Depth (DOM) if supported by the broker."""
    depth = market_data_manager.get_market_depth(symbol)
    return {"symbol": symbol, "levels": depth, "supported": len(depth) > 0}


# ----------------------------------------------------
# WEBSOCKET REAL-TIME STREAMING
# ----------------------------------------------------

@app.websocket("/ws/live")
async def websocket_live_stream(websocket: WebSocket):
    """
    Streams live real-time price updates and forming candles to the chart frontend.
    Allows dynamic subscription to any symbol and timeframe.
    """
    await websocket.accept()
    active_symbol = "XAUUSD"
    active_tf = "15m"
    is_streaming = True
    last_tick_time = 0
    last_tick_price = 0.0

    async def reader_task():
        nonlocal active_symbol, active_tf, is_streaming
        try:
            while is_streaming:
                data = await websocket.receive_text()
                msg = json.loads(data)
                action = msg.get("action")
                if action == "subscribe":
                    if "symbol" in msg:
                        active_symbol = msg["symbol"]
                    if "tf" in msg:
                        active_tf = msg["tf"]
                    logger.info(f"WebSocket subscribed to {active_symbol} ({active_tf})")
                    await websocket.send_json({
                        "type": "subscribed",
                        "symbol": active_symbol,
                        "tf": active_tf,
                    })
                elif action == "ping":
                    await websocket.send_json({"type": "pong"})
        except WebSocketDisconnect:
            is_streaming = False
        except Exception:
            is_streaming = False

    reader = asyncio.create_task(reader_task())

    try:
        while is_streaming:
            if mt5_connector.is_connected:
                tick = market_data_manager.get_latest_tick(active_symbol)
                if tick:
                    tick_time = tick["time"]
                    tick_price = tick["last"]

                    if tick_time != last_tick_time or tick_price != last_tick_price:
                        last_tick_time = tick_time
                        last_tick_price = tick_price

                        latest_bars, _ = market_data_manager.get_historical_candles(
                            symbol=active_symbol,
                            timeframe=active_tf,
                            count=2,
                        )
                        forming_bar = latest_bars[-1] if latest_bars else None

                        await websocket.send_json({
                            "type": "tick",
                            "symbol": active_symbol,
                            "tick": tick,
                            "bar": forming_bar,
                        })

            await asyncio.sleep(TICK_STREAM_INTERVAL_SEC)
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except Exception as e:
        logger.error(f"WebSocket streaming error: {e}")
    finally:
        is_streaming = False
        reader.cancel()


# ----------------------------------------------------
# STATIC FRONTEND SERVING
# ----------------------------------------------------

if os.path.isdir(FRONTEND_DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST_DIR, "index.html"))


# ----------------------------------------------------
# APPLICATION RUNNER & PYWEBVIEW WINDOW
# ----------------------------------------------------

def run_uvicorn_server():
    """Runs Uvicorn server in a dedicated thread."""
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning", access_log=False)


def launch_application():
    """Launches the backend server and pywebview Windows desktop window."""
    server_thread = threading.Thread(target=run_uvicorn_server, daemon=True, name="UvicornServer")
    server_thread.start()
    time.sleep(1.0)

    app_url = f"http://{HOST}:{PORT}"

    # Check for headless/server-only argument
    if "--server-only" in sys.argv or "--headless" in sys.argv:
        print(f"\n[SERVER RUNNING] MetaTrader 5 Bridge is running on {app_url}", flush=True)
        print("Press Ctrl+C to exit...", flush=True)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            mt5_connector.shutdown()
            sys.exit(0)

    # Launch native desktop window using pywebview
    try:
        import webview
        print(f"[DESKTOP WINDOW] جاري فتح نافذة التطبيق لسطح المكتب ({app_url})...", flush=True)
        window = webview.create_window(
            title=WINDOW_TITLE,
            url=app_url,
            width=WINDOW_WIDTH,
            height=WINDOW_HEIGHT,
            min_size=(1024, 600),
            background_color="#10151c",
            text_select=False,
        )

        def on_closed():
            print("[SHUTDOWN] تم إغلاق نافذة التطبيق... جاري إنهاء العمليات بأمان.", flush=True)
            mt5_connector.shutdown()

        window.events.closed += on_closed
        webview.start(gui="edgechromium", debug=False)
    except ImportError:
        print("\n[INFO] pywebview is not installed. Running in server mode.", flush=True)
        print(f"Open your browser and navigate to: {app_url}", flush=True)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            mt5_connector.shutdown()
            sys.exit(0)


if __name__ == "__main__":
    launch_application()
