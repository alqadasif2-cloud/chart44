/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bar, SymbolMeta, Timeframe } from '../types/chart';

export const SUPPORTED_SYMBOLS: SymbolMeta[] = [
  // Metals & Forex (Twelve Data)
  {
    symbol: 'XAU/USD',
    name: 'Gold / US Dollar',
    nameAr: 'XAUUSD ذهب',
    category: 'metal',
    provider: 'twelvedata',
    precision: 2,
    tickSize: 0.05,
  },
  {
    symbol: 'XAG/USD',
    name: 'Silver / US Dollar',
    nameAr: 'XAGUSD فضة',
    category: 'metal',
    provider: 'twelvedata',
    precision: 3,
    tickSize: 0.005,
  },
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    nameAr: 'EURUSD يورو/دولار',
    category: 'forex',
    provider: 'twelvedata',
    precision: 5,
    tickSize: 0.00001,
  },
  {
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    nameAr: 'GBPUSD جنيه إسترليني',
    category: 'forex',
    provider: 'twelvedata',
    precision: 5,
    tickSize: 0.00001,
  },
  {
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    nameAr: 'USDJPY دولار/ين',
    category: 'forex',
    provider: 'twelvedata',
    precision: 3,
    tickSize: 0.001,
  },

  // Cryptocurrencies (Binance Live Streams)
  {
    symbol: 'BTCUSDT',
    name: 'Bitcoin / TetherUS',
    nameAr: 'BTC بيتكوين',
    category: 'crypto',
    provider: 'binance',
    precision: 2,
    tickSize: 0.1,
  },
  {
    symbol: 'ETHUSDT',
    name: 'Ethereum / TetherUS',
    nameAr: 'ETH إيثيريوم',
    category: 'crypto',
    provider: 'binance',
    precision: 2,
    tickSize: 0.01,
  },
  {
    symbol: 'BNBUSDT',
    name: 'BNB / TetherUS',
    nameAr: 'BNB بينانس كوين',
    category: 'crypto',
    provider: 'binance',
    precision: 2,
    tickSize: 0.01,
  },
  {
    symbol: 'SOLUSDT',
    name: 'Solana / TetherUS',
    nameAr: 'SOL سولانا',
    category: 'crypto',
    provider: 'binance',
    precision: 2,
    tickSize: 0.01,
  },
  {
    symbol: 'XRPUSDT',
    name: 'Ripple / TetherUS',
    nameAr: 'XRP ريبل',
    category: 'crypto',
    provider: 'binance',
    precision: 4,
    tickSize: 0.0001,
  },
  {
    symbol: 'DOGEUSDT',
    name: 'Dogecoin / TetherUS',
    nameAr: 'DOGE دوجكوين',
    category: 'crypto',
    provider: 'binance',
    precision: 5,
    tickSize: 0.00001,
  },
];

export const TIMEFRAMES: { tf: Timeframe; label: string; seconds: number }[] = [
  { tf: '1m', label: '1m', seconds: 60 },
  { tf: '3m', label: '3m', seconds: 180 },
  { tf: '5m', label: '5m', seconds: 300 },
  { tf: '15m', label: '15m', seconds: 900 },
  { tf: '30m', label: '30m', seconds: 1800 },
  { tf: '45m', label: '45m', seconds: 2700 },
  { tf: '1h', label: '1h', seconds: 3600 },
  { tf: '2h', label: '2h', seconds: 7200 },
  { tf: '4h', label: '4h', seconds: 14400 },
  { tf: '6h', label: '6h', seconds: 21600 },
  { tf: '8h', label: '8h', seconds: 28800 },
  { tf: '12h', label: '12h', seconds: 43200 },
  { tf: '1D', label: '1D', seconds: 86400 },
  { tf: '1W', label: '1W', seconds: 604800 },
  { tf: '1M', label: '1M', seconds: 2592000 },
];

export const TF_SECONDS: Record<string, number> = Object.fromEntries(
  TIMEFRAMES.map((t) => [t.tf, t.seconds])
);

const TD_INTERVAL_MAP: Record<string, string> = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '30m': '30min',
  '45m': '45min',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '1D': '1day',
  '1W': '1week',
  '1M': '1month',
};

// In-memory historical cache by symbol and timeframe
const dataCache: Record<string, Bar[]> = {};

export interface MT5StatusInfo {
  is_connected: boolean;
  state: string;
  state_ar: string;
  version?: string;
  account?: {
    login: number;
    server: string;
    name: string;
    company: string;
    currency: string;
    balance: number;
    equity: number;
    leverage: number;
  };
}

export class MarketDataManager {
  private activeWs: WebSocket | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private currentSeq = 0;

  // MT5 state
  public isMT5Active: boolean = false;
  public mt5Status: MT5StatusInfo | null = null;
  public mt5Symbols: SymbolMeta[] = [];
  private mt5CheckTimer: ReturnType<typeof setInterval> | null = null;
  public onMT5StatusChange?: (status: MT5StatusInfo | null) => void;

  constructor() {
    // Probe local MT5 bridge immediately on startup
    this.checkMT5Status();
    // Periodically re-check MT5 status every 5 seconds
    this.mt5CheckTimer = setInterval(() => this.checkMT5Status(), 5000);
  }

  /**
   * Probes the local MetaTrader 5 FastAPI bridge at 127.0.0.1:8000
   */
  public async checkMT5Status(): Promise<boolean> {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      // In HTTPS web environment, skip local HTTP bridge to avoid browser mixed-content blocking
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch('http://127.0.0.1:8000/api/status', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json: MT5StatusInfo = await res.json();
        const wasConnected = this.isMT5Active;
        this.isMT5Active = json.is_connected;
        this.mt5Status = json;

        if (json.is_connected && (!wasConnected || this.mt5Symbols.length === 0)) {
          await this.loadMT5Symbols();
        }

        if (this.onMT5StatusChange) {
          this.onMT5StatusChange(json);
        }
        return json.is_connected;
      }
    } catch {
      // Local server not running or not in desktop mode
      if (this.isMT5Active) {
        this.isMT5Active = false;
        this.mt5Status = null;
        if (this.onMT5StatusChange) {
          this.onMT5StatusChange(null);
        }
      }
    }
    return false;
  }

  /**
   * Discovers and populates available symbols from the connected MT5 terminal
   */
  public async loadMT5Symbols(): Promise<SymbolMeta[]> {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/symbols');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.symbols)) {
          this.mt5Symbols = data.symbols.map((s: any) => ({
            symbol: s.symbol,
            name: s.name,
            nameAr: s.nameAr || s.name,
            category: s.category || 'forex',
            provider: 'mt5',
            precision: s.digits || s.precision || 2,
            tickSize: s.point || s.tickSize || 0.01,
          }));
          return this.mt5Symbols;
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  /**
   * Returns symbols list (prioritizing MT5 symbols if MT5 is connected)
   */
  public getAvailableSymbols(): SymbolMeta[] {
    if (this.isMT5Active && this.mt5Symbols.length > 0) {
      // Place popular benchmark symbols at top
      const popular = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'US30', 'NAS100'];
      const topList: SymbolMeta[] = [];
      const otherList: SymbolMeta[] = [];

      this.mt5Symbols.forEach((s) => {
        const clean = s.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (popular.some((p) => clean.startsWith(p))) {
          topList.push(s);
        } else {
          otherList.push(s);
        }
      });

      return [...topList, ...otherList];
    }
    return SUPPORTED_SYMBOLS;
  }

  public getCacheKey(symbol: string, tf: Timeframe): string {
    return `${symbol}_${tf}`;
  }

  public getCachedData(symbol: string, tf: Timeframe): Bar[] {
    return dataCache[this.getCacheKey(symbol, tf)] || [];
  }

  public setCachedData(symbol: string, tf: Timeframe, bars: Bar[]): void {
    dataCache[this.getCacheKey(symbol, tf)] = bars;
  }

  /**
   * Fetch initial batch of historical bars directly from MT5 (or fallback)
   */
  public async fetchHistoricalData(
    symbol: string,
    tf: Timeframe,
    apiKey?: string,
    limit = 800
  ): Promise<{ bars: Bar[]; error?: string }> {
    const symInfo = this.getAvailableSymbols().find((s) => s.symbol === symbol);
    const isMT5 = this.isMT5Active || symInfo?.provider === 'mt5';

    // 1. Direct MetaTrader 5 Local Bridge
    if (isMT5) {
      try {
        const url = `http://127.0.0.1:8000/api/candles?symbol=${encodeURIComponent(
          symbol
        )}&tf=${tf}&count=${limit}`;
        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || json.error) {
          return { bars: [], error: json.error || 'خطأ في جلب بيانات MetaTrader 5' };
        }

        const bars: Bar[] = (json.bars || []).map((b: any) => ({
          t: b.t,
          o: b.o,
          h: b.h,
          l: b.l,
          c: b.c,
          v: b.v,
          tickVol: b.tickVol,
          realVol: b.realVol,
          spread: b.spread,
          buyVol: b.buyVol,
          sellVol: b.sellVol,
          trades: b.trades,
        }));

        this.setCachedData(symbol, tf, bars);
        return { bars };
      } catch (err: any) {
        return {
          bars: [],
          error: `تعذر الاتصال بخادم MT5 المحلي (127.0.0.1:8000): ${err.message || 'تأكد من تشغيل START_WINDOWS.bat'}`,
        };
      }
    }

    const provider = symInfo?.provider || (symbol.includes('/') ? 'twelvedata' : 'binance');

    if (provider === 'binance') {
      try {
        const binanceTf = tf.toLowerCase();
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceTf}&limit=${limit}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Binance HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!Array.isArray(json)) {
          return { bars: [], error: 'تنسيق بيانات بينانس غير متوقع' };
        }
        const bars: Bar[] = json.map((k: any) => ({
          t: Math.floor(k[0] / 1000),
          o: parseFloat(k[1]),
          h: parseFloat(k[2]),
          l: parseFloat(k[3]),
          c: parseFloat(k[4]),
          v: parseFloat(k[5]),
          trades: parseInt(k[8], 10) || 0,
          buyVol: parseFloat(k[9]) || parseFloat(k[5]) * 0.5,
          sellVol: Math.max(0, parseFloat(k[5]) - (parseFloat(k[9]) || 0)),
        }));

        this.setCachedData(symbol, tf, bars);
        return { bars };
      } catch (err: any) {
        return { bars: [], error: err.message || 'فشل الاتصال بخوادم بينانس' };
      }
    } else {
      // Twelve Data
      const key = apiKey || this.getStoredApiKey();
      if (!key) {
        return {
          bars: [],
          error: 'يرجى إدخال مفتاح Twelve Data API عبر زر المفتاح (🔑) لاستعراض هذا الرمز.',
        };
      }
      const tdInterval = TD_INTERVAL_MAP[tf] || '15min';
      try {
        const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${tdInterval}&outputsize=${limit}&timezone=UTC&apikey=${key}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === 'error' || !json.values) {
          return {
            bars: [],
            error: json.message || 'خطأ في جلب بيانات Twelve Data',
          };
        }
        const bars: Bar[] = json.values
          .reverse()
          .map((item: any) => ({
            t: Math.floor(Date.parse(item.datetime.replace(' ', 'T') + 'Z') / 1000),
            o: parseFloat(item.open),
            h: parseFloat(item.high),
            l: parseFloat(item.low),
            c: parseFloat(item.close),
            v: parseFloat(item.volume) || 1,
            buyVol: (parseFloat(item.volume) || 1) * (parseFloat(item.close) >= parseFloat(item.open) ? 0.6 : 0.4),
            sellVol: (parseFloat(item.volume) || 1) * (parseFloat(item.close) >= parseFloat(item.open) ? 0.4 : 0.6),
          }));

        this.setCachedData(symbol, tf, bars);
        return { bars };
      } catch (err: any) {
        return { bars: [], error: err.message || 'تعذر الاتصال بـ Twelve Data' };
      }
    }
  }

  /**
   * Paginates backwards to load older historical data prior to a given timestamp
   */
  public async loadHistoricalBefore(
    symbol: string,
    tf: Timeframe,
    beforeTimestamp: number,
    limit = 1000,
    apiKey?: string
  ): Promise<{ newBars: Bar[]; totalBars: Bar[]; hasMore: boolean }> {
    const symInfo = this.getAvailableSymbols().find((s) => s.symbol === symbol);
    const isMT5 = this.isMT5Active || symInfo?.provider === 'mt5';
    const existing = this.getCachedData(symbol, tf);

    // 1. Direct MT5 Historical Pagination
    if (isMT5) {
      try {
        const url = `http://127.0.0.1:8000/api/candles?symbol=${encodeURIComponent(
          symbol
        )}&tf=${tf}&count=${limit}&before_ts=${beforeTimestamp}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || json.error || !Array.isArray(json.bars) || json.bars.length === 0) {
          return { newBars: [], totalBars: existing, hasMore: false };
        }
        const incoming: Bar[] = json.bars.map((b: any) => ({
          t: b.t,
          o: b.o,
          h: b.h,
          l: b.l,
          c: b.c,
          v: b.v,
          tickVol: b.tickVol,
          realVol: b.realVol,
          spread: b.spread,
          buyVol: b.buyVol,
          sellVol: b.sellVol,
          trades: b.trades,
        }));

        const existingTimestamps = new Set(existing.map((b) => b.t));
        const filtered = incoming.filter((b) => !existingTimestamps.has(b.t));
        const merged = [...filtered, ...existing].sort((a, b) => a.t - b.t);

        this.setCachedData(symbol, tf, merged);
        return { newBars: filtered, totalBars: merged, hasMore: incoming.length >= limit };
      } catch {
        return { newBars: [], totalBars: existing, hasMore: false };
      }
    }

    const provider = symInfo?.provider || (symbol.includes('/') ? 'twelvedata' : 'binance');

    if (provider === 'binance') {
      try {
        const binanceTf = tf.toLowerCase();
        const endTimeMs = beforeTimestamp * 1000 - 1;
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceTf}&endTime=${endTimeMs}&limit=${limit}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!Array.isArray(json) || json.length === 0) {
          return { newBars: [], totalBars: existing, hasMore: false };
        }
        const incoming: Bar[] = json.map((k: any) => ({
          t: Math.floor(k[0] / 1000),
          o: parseFloat(k[1]),
          h: parseFloat(k[2]),
          l: parseFloat(k[3]),
          c: parseFloat(k[4]),
          v: parseFloat(k[5]),
          trades: parseInt(k[8], 10) || 0,
          buyVol: parseFloat(k[9]) || parseFloat(k[5]) * 0.5,
          sellVol: Math.max(0, parseFloat(k[5]) - (parseFloat(k[9]) || 0)),
        }));

        // Deduplicate and merge chronologically
        const existingTimestamps = new Set(existing.map((b) => b.t));
        const filtered = incoming.filter((b) => !existingTimestamps.has(b.t));
        const merged = [...filtered, ...existing].sort((a, b) => a.t - b.t);

        this.setCachedData(symbol, tf, merged);
        return { newBars: filtered, totalBars: merged, hasMore: incoming.length >= limit };
      } catch {
        return { newBars: [], totalBars: existing, hasMore: false };
      }
    } else {
      // Twelve Data end_date pagination
      const key = apiKey || this.getStoredApiKey();
      if (!key) return { newBars: [], totalBars: existing, hasMore: false };
      try {
        const tdInterval = TD_INTERVAL_MAP[tf] || '15min';
        const d = new Date(beforeTimestamp * 1000);
        const iso = d.toISOString().replace('T', ' ').split('.')[0];
        const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${tdInterval}&end_date=${encodeURIComponent(
          iso
        )}&outputsize=${limit}&timezone=UTC&apikey=${key}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!json.values || !Array.isArray(json.values)) {
          return { newBars: [], totalBars: existing, hasMore: false };
        }
        const incoming: Bar[] = json.values
          .reverse()
          .map((item: any) => ({
            t: Math.floor(Date.parse(item.datetime.replace(' ', 'T') + 'Z') / 1000),
            o: parseFloat(item.open),
            h: parseFloat(item.high),
            l: parseFloat(item.low),
            c: parseFloat(item.close),
            v: parseFloat(item.volume) || 1,
            buyVol: (parseFloat(item.volume) || 1) * (parseFloat(item.close) >= parseFloat(item.open) ? 0.6 : 0.4),
            sellVol: (parseFloat(item.volume) || 1) * (parseFloat(item.close) >= parseFloat(item.open) ? 0.4 : 0.6),
          }));

        const existingTimestamps = new Set(existing.map((b) => b.t));
        const filtered = incoming.filter((b) => !existingTimestamps.has(b.t));
        const merged = [...filtered, ...existing].sort((a, b) => a.t - b.t);

        this.setCachedData(symbol, tf, merged);
        return { newBars: filtered, totalBars: merged, hasMore: incoming.length >= limit };
      } catch {
        return { newBars: [], totalBars: existing, hasMore: false };
      }
    }
  }

  /**
   * Connect to real-time feeds (Binance WebSocket or Twelve Data stream)
   */
  public subscribeRealtime(
    symbol: string,
    tf: Timeframe,
    onTick: (bar: Bar, isClosed: boolean) => void,
    onStatusChange: (status: string) => void,
    apiKey?: string
  ): () => void {
    this.unsubscribeRealtime();
    const mySeq = ++this.currentSeq;
    const symInfo = this.getAvailableSymbols().find((s) => s.symbol === symbol);
    const isMT5 = this.isMT5Active || symInfo?.provider === 'mt5';

    // 1. MetaTrader 5 Real-Time WebSocket Streaming
    if (isMT5) {
      onStatusChange('● جاري الاتصال بخادم MT5...');
      try {
        const ws = new WebSocket('ws://127.0.0.1:8000/ws/live');
        this.activeWs = ws;

        ws.onopen = () => {
          if (mySeq === this.currentSeq) {
            ws.send(JSON.stringify({ action: 'subscribe', symbol, tf }));
            const accDesc = this.mt5Status?.account ? ` (#${this.mt5Status.account.login})` : '';
            onStatusChange(`● مباشر MT5${accDesc}`);
          }
        };

        ws.onmessage = (event) => {
          if (mySeq !== this.currentSeq) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'tick' && data.bar) {
              const b = data.bar;
              const bar: Bar = {
                t: b.t,
                o: b.o,
                h: b.h,
                l: b.l,
                c: b.c,
                v: b.v,
                tickVol: b.tickVol,
                realVol: b.realVol,
                spread: b.spread,
                buyVol: b.buyVol,
                sellVol: b.sellVol,
                trades: b.trades,
              };
              onTick(bar, false);
            }
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          if (mySeq === this.currentSeq) {
            onStatusChange('انقطع اتصال بث MT5');
          }
        };

        ws.onerror = () => {
          if (mySeq === this.currentSeq) {
            onStatusChange('تعذر الاتصال ببث MT5');
          }
        };
      } catch (err: any) {
        onStatusChange(err.message || 'خطأ في WebSocket مع MT5');
      }

      return () => this.unsubscribeRealtime();
    }

    const provider = symInfo?.provider || (symbol.includes('/') ? 'twelvedata' : 'binance');

    if (provider === 'binance') {
      const streamUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${tf.toLowerCase()}`;
      onStatusChange('● جاري الاتصال بالبث المباشر...');

      try {
        const ws = new WebSocket(streamUrl);
        this.activeWs = ws;

        ws.onopen = () => {
          if (mySeq === this.currentSeq) {
            onStatusChange('● مباشر');
          }
        };

        ws.onmessage = (event) => {
          if (mySeq !== this.currentSeq) return;
          try {
            const data = JSON.parse(event.data);
            const k = data.k;
            if (!k) return;
            const bar: Bar = {
              t: Math.floor(k.t / 1000),
              o: parseFloat(k.o),
              h: parseFloat(k.h),
              l: parseFloat(k.l),
              c: parseFloat(k.c),
              v: parseFloat(k.v),
              trades: parseInt(k.n, 10) || 0,
              buyVol: parseFloat(k.V) || parseFloat(k.v) * 0.5,
              sellVol: Math.max(0, parseFloat(k.v) - (parseFloat(k.V) || 0)),
            };
            onTick(bar, k.x);
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          if (mySeq === this.currentSeq) {
            onStatusChange('انقطع البث المباشر');
          }
        };

        ws.onerror = () => {
          if (mySeq === this.currentSeq) {
            onStatusChange('تعذر الاتصال بالبث المباشر');
          }
        };
      } catch (err: any) {
        onStatusChange(err.message || 'خطأ في WebSocket');
      }
    } else {
      // Twelve Data Live / Polling
      const key = apiKey || this.getStoredApiKey();
      if (!key) {
        onStatusChange('مطلوب مفتاح API');
        return () => {};
      }

      onStatusChange('● جاري الاتصال بـ Twelve Data...');
      let connectedWs = false;

      try {
        const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${key}`);
        this.activeWs = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({ action: 'subscribe', params: { symbols: symbol } }));
          connectedWs = true;
          onStatusChange('● مباشر (Twelve Data)');
        };

        ws.onmessage = (event) => {
          if (mySeq !== this.currentSeq) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'price' && msg.price) {
              const price = parseFloat(msg.price);
              const ts = msg.timestamp || Math.floor(Date.now() / 1000);
              const bar: Bar = {
                t: ts,
                o: price,
                h: price,
                l: price,
                c: price,
                v: 1,
              };
              onTick(bar, false);
            }
          } catch {
            // ignore
          }
        };

        ws.onerror = () => {
          if (!connectedWs && mySeq === this.currentSeq) {
            this.startPollingTwelveData(symbol, tf, key, onTick, onStatusChange);
          }
        };

        ws.onclose = () => {
          if (mySeq === this.currentSeq) {
            this.startPollingTwelveData(symbol, tf, key, onTick, onStatusChange);
          }
        };
      } catch {
        this.startPollingTwelveData(symbol, tf, key, onTick, onStatusChange);
      }
    }

    return () => this.unsubscribeRealtime();
  }

  private startPollingTwelveData(
    symbol: string,
    tf: Timeframe,
    key: string,
    onTick: (bar: Bar, isClosed: boolean) => void,
    onStatusChange: (status: string) => void
  ) {
    if (this.pollTimer) clearInterval(this.pollTimer);
    onStatusChange('● مباشر (تحديث دوري كل 15ث)');

    this.pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=${key}`);
        const data = await res.json();
        if (data.price) {
          const price = parseFloat(data.price);
          const bar: Bar = {
            t: Math.floor(Date.now() / 1000),
            o: price,
            h: price,
            l: price,
            c: price,
            v: 1,
          };
          onTick(bar, false);
        }
      } catch {
        // ignore
      }
    }, 15000);
  }

  public unsubscribeRealtime(): void {
    if (this.activeWs) {
      this.activeWs.close();
      this.activeWs = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public getStoredApiKey(): string {
    try {
      return localStorage.getItem('tdkey') || '';
    } catch {
      return '';
    }
  }

  public setStoredApiKey(key: string): void {
    try {
      localStorage.setItem('tdkey', key.trim());
    } catch {
      // ignore
    }
  }
}

export const marketDataService = new MarketDataManager();
