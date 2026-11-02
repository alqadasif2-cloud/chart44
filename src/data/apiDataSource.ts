/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bar, SymbolMeta, Timeframe } from '../types/chart';

/**
 * Standard Symbols available for Android & API Mode.
 * Includes Metals & Forex via Twelve Data, and Crypto via Binance.
 */
export const API_SYMBOLS: SymbolMeta[] = [
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

  // Cryptocurrencies (Binance Live Streams & Public REST)
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

export const TD_INTERVAL_MAP: Record<string, string> = {
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

// In-memory cache by symbol and timeframe
const apiDataCache: Record<string, Bar[]> = {};

/**
 * Android & Web API Data Source.
 * Retrieves real-time prices, historical candles, and live updates directly
 * through public Binance APIs (WebSocket & REST) and Twelve Data API.
 * Completely independent of MetaTrader 5 and Python.
 */
export class ApiDataSource {
  private activeWs: WebSocket | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentSeq = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  public getAvailableSymbols(): SymbolMeta[] {
    return API_SYMBOLS;
  }

  public getCacheKey(symbol: string, tf: Timeframe): string {
    return `${symbol}_${tf}`;
  }

  public getCachedData(symbol: string, tf: Timeframe): Bar[] {
    return apiDataCache[this.getCacheKey(symbol, tf)] || [];
  }

  public setCachedData(symbol: string, tf: Timeframe, bars: Bar[]): void {
    apiDataCache[this.getCacheKey(symbol, tf)] = bars;
  }

  /**
   * Fetch initial batch of historical bars directly from Binance or Twelve Data API.
   */
  public async fetchHistoricalData(
    symbol: string,
    tf: Timeframe,
    apiKey?: string,
    limit = 800
  ): Promise<{ bars: Bar[]; error?: string }> {
    const symInfo = this.getAvailableSymbols().find((s) => s.symbol === symbol);
    const provider = symInfo?.provider || (symbol.includes('/') ? 'twelvedata' : 'binance');

    // 1. Binance Public REST API (No API key needed)
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
      // 2. Twelve Data API (Gold, Silver, Forex)
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
   * Paginates backwards to load older historical data prior to a given timestamp.
   */
  public async loadHistoricalBefore(
    symbol: string,
    tf: Timeframe,
    beforeTimestamp: number,
    limit = 1000,
    apiKey?: string
  ): Promise<{ newBars: Bar[]; totalBars: Bar[]; hasMore: boolean }> {
    const symInfo = this.getAvailableSymbols().find((s) => s.symbol === symbol);
    const provider = symInfo?.provider || (symbol.includes('/') ? 'twelvedata' : 'binance');
    const existing = this.getCachedData(symbol, tf);

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

        const existingTimestamps = new Set(existing.map((b) => b.t));
        const filtered = incoming.filter((b) => !existingTimestamps.has(b.t));
        const merged = [...filtered, ...existing].sort((a, b) => a.t - b.t);

        this.setCachedData(symbol, tf, merged);
        return { newBars: filtered, totalBars: merged, hasMore: incoming.length >= limit };
      } catch {
        return { newBars: [], totalBars: existing, hasMore: false };
      }
    } else {
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
   * Connect to real-time feeds with automatic reconnection and error handling.
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
    const provider = symInfo?.provider || (symbol.includes('/') ? 'twelvedata' : 'binance');

    if (provider === 'binance') {
      this.connectBinanceWebSocket(symbol, tf, onTick, onStatusChange, mySeq);
    } else {
      const key = apiKey || this.getStoredApiKey();
      if (!key) {
        onStatusChange('مطلوب مفتاح API');
        return () => {};
      }
      this.connectTwelveDataFeed(symbol, tf, key, onTick, onStatusChange, mySeq);
    }

    return () => this.unsubscribeRealtime();
  }

  private connectBinanceWebSocket(
    symbol: string,
    tf: Timeframe,
    onTick: (bar: Bar, isClosed: boolean) => void,
    onStatusChange: (status: string) => void,
    seq: number
  ) {
    const streamUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${tf.toLowerCase()}`;
    onStatusChange('● جاري الاتصال بالبث المباشر (Binance)...');

    try {
      const ws = new WebSocket(streamUrl);
      this.activeWs = ws;

      ws.onopen = () => {
        if (seq === this.currentSeq) {
          this.reconnectAttempts = 0;
          onStatusChange('● مباشر (Binance WebSocket)');
        }
      };

      ws.onmessage = (event) => {
        if (seq !== this.currentSeq) return;
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
        if (seq === this.currentSeq) {
          onStatusChange('انقطع البث المباشر — جاري إعادة الاتصال...');
          this.scheduleReconnect(() =>
            this.connectBinanceWebSocket(symbol, tf, onTick, onStatusChange, seq)
          );
        }
      };

      ws.onerror = () => {
        if (seq === this.currentSeq) {
          onStatusChange('تعذر الاتصال بالبث المباشر');
        }
      };
    } catch (err: any) {
      onStatusChange(err.message || 'خطأ في WebSocket');
    }
  }

  private connectTwelveDataFeed(
    symbol: string,
    tf: Timeframe,
    key: string,
    onTick: (bar: Bar, isClosed: boolean) => void,
    onStatusChange: (status: string) => void,
    seq: number
  ) {
    onStatusChange('● جاري الاتصال بـ Twelve Data...');
    let connectedWs = false;

    try {
      const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${key}`);
      this.activeWs = ws;

      ws.onopen = () => {
        if (seq === this.currentSeq) {
          ws.send(JSON.stringify({ action: 'subscribe', params: { symbols: symbol } }));
          connectedWs = true;
          this.reconnectAttempts = 0;
          onStatusChange('● مباشر (Twelve Data)');
        }
      };

      ws.onmessage = (event) => {
        if (seq !== this.currentSeq) return;
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
        if (!connectedWs && seq === this.currentSeq) {
          this.startPollingTwelveData(symbol, tf, key, onTick, onStatusChange);
        }
      };

      ws.onclose = () => {
        if (seq === this.currentSeq) {
          this.startPollingTwelveData(symbol, tf, key, onTick, onStatusChange);
        }
      };
    } catch {
      this.startPollingTwelveData(symbol, tf, key, onTick, onStatusChange);
    }
  }

  private scheduleReconnect(reconnectFn: () => void) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectTimer = setTimeout(reconnectFn, delay);
  }

  private startPollingTwelveData(
    symbol: string,
    tf: Timeframe,
    key: string,
    onTick: (bar: Bar, isClosed: boolean) => void,
    onStatusChange: (status: string) => void
  ) {
    if (this.pollTimer) clearInterval(this.pollTimer);
    onStatusChange('● مباشر (Twelve Data تحديث دوري كل 15ث)');

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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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

export const apiDataSource = new ApiDataSource();
