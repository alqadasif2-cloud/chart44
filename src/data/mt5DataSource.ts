/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bar, SymbolMeta, Timeframe } from '../types/chart';

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

// In-memory cache for MT5 data
const mt5DataCache: Record<string, Bar[]> = {};

/**
 * Windows MetaTrader 5 Data Source.
 * Connects directly to the locally running MT5 bridge (FastAPI on 127.0.0.1:8000).
 * Retrieves real broker symbols, live ticks, historical bars, and depth of market.
 * Zero external API keys or credentials needed.
 */
export class MT5DataSource {
  private activeWs: WebSocket | null = null;
  private currentSeq = 0;
  public isMT5Active = false;
  public mt5Status: MT5StatusInfo | null = null;
  public mt5Symbols: SymbolMeta[] = [];
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  public onStatusChange?: (status: MT5StatusInfo | null) => void;

  constructor() {
    // Only probe on http / localhost / desktop environment
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
      this.checkMT5Status();
      this.checkTimer = setInterval(() => this.checkMT5Status(), 5000);
    }
  }

  public getCacheKey(symbol: string, tf: Timeframe): string {
    return `mt5_${symbol}_${tf}`;
  }

  public getCachedData(symbol: string, tf: Timeframe): Bar[] {
    return mt5DataCache[this.getCacheKey(symbol, tf)] || [];
  }

  public setCachedData(symbol: string, tf: Timeframe, bars: Bar[]): void {
    mt5DataCache[this.getCacheKey(symbol, tf)] = bars;
  }

  /**
   * Probes the local MetaTrader 5 FastAPI bridge at 127.0.0.1:8000
   */
  public async checkMT5Status(): Promise<boolean> {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
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

        if (this.onStatusChange) {
          this.onStatusChange(json);
        }
        return json.is_connected;
      }
    } catch {
      if (this.isMT5Active) {
        this.isMT5Active = false;
        this.mt5Status = null;
        if (this.onStatusChange) {
          this.onStatusChange(null);
        }
      }
    }
    return false;
  }

  /**
   * Discovers and populates available symbols from the connected MT5 terminal.
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

  public getAvailableSymbols(): SymbolMeta[] {
    if (this.mt5Symbols.length > 0) {
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
    return [];
  }

  /**
   * Fetch batch of historical bars directly from MT5
   */
  public async fetchHistoricalData(
    symbol: string,
    tf: Timeframe,
    limit = 800
  ): Promise<{ bars: Bar[]; error?: string }> {
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

  /**
   * Paginates backwards to load older historical data prior to a given timestamp
   */
  public async loadHistoricalBefore(
    symbol: string,
    tf: Timeframe,
    beforeTimestamp: number,
    limit = 1000
  ): Promise<{ newBars: Bar[]; totalBars: Bar[]; hasMore: boolean }> {
    const existing = this.getCachedData(symbol, tf);
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

  /**
   * Subscribes to real-time WebSocket tick updates from the MT5 Python bridge.
   */
  public subscribeRealtime(
    symbol: string,
    tf: Timeframe,
    onTick: (bar: Bar, isClosed: boolean) => void,
    onStatusChange: (status: string) => void
  ): () => void {
    this.unsubscribeRealtime();
    const mySeq = ++this.currentSeq;
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

  public unsubscribeRealtime(): void {
    if (this.activeWs) {
      this.activeWs.close();
      this.activeWs = null;
    }
  }

  public destroy(): void {
    this.unsubscribeRealtime();
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }
}

export const mt5DataSource = new MT5DataSource();
