/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bar, SymbolMeta, Timeframe } from '../types/chart';
import { apiDataSource, API_SYMBOLS, TIMEFRAMES, TF_SECONDS } from './apiDataSource';
import { mt5DataSource, type MT5StatusInfo } from './mt5DataSource';

export { API_SYMBOLS, TIMEFRAMES, TF_SECONDS };
export type { MT5StatusInfo };
export const SUPPORTED_SYMBOLS = API_SYMBOLS;

export type DataSourceMode = 'auto' | 'api' | 'mt5';

/**
 * Unified Market Data Service.
 * Decouples Android (pure API mode) and Windows (local MT5 mode).
 * In API mode (Android / Web), it relies exclusively on public Binance & Twelve Data APIs.
 * In MT5 mode (Windows), it routes through the local Python MT5 bridge.
 */
export class MarketDataManager {
  private mode: DataSourceMode = 'auto';

  constructor() {
    // Forward MT5 events if MT5 status changes
    mt5DataSource.onStatusChange = (status) => {
      if (this.onMT5StatusChange) {
        this.onMT5StatusChange(status);
      }
    };
  }

  public setMode(newMode: DataSourceMode) {
    this.mode = newMode;
  }

  public getMode(): DataSourceMode {
    return this.mode;
  }

  public get isMT5Active(): boolean {
    if (this.mode === 'api') return false;
    return mt5DataSource.isMT5Active;
  }

  public get mt5Status(): MT5StatusInfo | null {
    if (this.mode === 'api') return null;
    return mt5DataSource.mt5Status;
  }

  public get mt5Symbols(): SymbolMeta[] {
    if (this.mode === 'api') return [];
    return mt5DataSource.mt5Symbols;
  }

  public set onMT5StatusChange(callback: ((status: MT5StatusInfo | null) => void) | undefined) {
    mt5DataSource.onStatusChange = callback;
  }

  public async checkMT5Status(): Promise<boolean> {
    if (this.mode === 'api') return false;
    return mt5DataSource.checkMT5Status();
  }

  public async loadMT5Symbols(): Promise<SymbolMeta[]> {
    if (this.mode === 'api') return [];
    return mt5DataSource.loadMT5Symbols();
  }

  /**
   * Returns symbols according to active data source
   */
  public getAvailableSymbols(): SymbolMeta[] {
    if (this.mode === 'api') {
      return apiDataSource.getAvailableSymbols();
    }
    if (this.isMT5Active && mt5DataSource.mt5Symbols.length > 0) {
      return mt5DataSource.getAvailableSymbols();
    }
    return apiDataSource.getAvailableSymbols();
  }

  public getCacheKey(symbol: string, tf: Timeframe): string {
    const symInfo = this.getAvailableSymbols().find((s) => s.symbol === symbol);
    if (symInfo?.provider === 'mt5') {
      return mt5DataSource.getCacheKey(symbol, tf);
    }
    return apiDataSource.getCacheKey(symbol, tf);
  }

  public getCachedData(symbol: string, tf: Timeframe): Bar[] {
    const symInfo = this.getAvailableSymbols().find((s) => s.symbol === symbol);
    if (symInfo?.provider === 'mt5') {
      return mt5DataSource.getCachedData(symbol, tf);
    }
    return apiDataSource.getCachedData(symbol, tf);
  }

  public setCachedData(symbol: string, tf: Timeframe, bars: Bar[]): void {
    const symInfo = this.getAvailableSymbols().find((s) => s.symbol === symbol);
    if (symInfo?.provider === 'mt5') {
      mt5DataSource.setCachedData(symbol, tf, bars);
    } else {
      apiDataSource.setCachedData(symbol, tf, bars);
    }
  }

  /**
   * Fetch historical bars from either MT5 (Windows) or API (Android)
   */
  public async fetchHistoricalData(
    symbol: string,
    tf: Timeframe,
    apiKey?: string,
    limit = 800
  ): Promise<{ bars: Bar[]; error?: string }> {
    const symInfo = this.getAvailableSymbols().find((s) => s.symbol === symbol);
    if (this.mode !== 'api' && (this.isMT5Active || symInfo?.provider === 'mt5')) {
      return mt5DataSource.fetchHistoricalData(symbol, tf, limit);
    }
    return apiDataSource.fetchHistoricalData(symbol, tf, apiKey, limit);
  }

  /**
   * Historical pagination
   */
  public async loadHistoricalBefore(
    symbol: string,
    tf: Timeframe,
    beforeTimestamp: number,
    limit = 1000,
    apiKey?: string
  ): Promise<{ newBars: Bar[]; totalBars: Bar[]; hasMore: boolean }> {
    const symInfo = this.getAvailableSymbols().find((s) => s.symbol === symbol);
    if (this.mode !== 'api' && (this.isMT5Active || symInfo?.provider === 'mt5')) {
      return mt5DataSource.loadHistoricalBefore(symbol, tf, beforeTimestamp, limit);
    }
    return apiDataSource.loadHistoricalBefore(symbol, tf, beforeTimestamp, limit, apiKey);
  }

  /**
   * Real-time subscription
   */
  public subscribeRealtime(
    symbol: string,
    tf: Timeframe,
    onTick: (bar: Bar, isClosed: boolean) => void,
    onStatusChange: (status: string) => void,
    apiKey?: string
  ): () => void {
    const symInfo = this.getAvailableSymbols().find((s) => s.symbol === symbol);
    if (this.mode !== 'api' && (this.isMT5Active || symInfo?.provider === 'mt5')) {
      return mt5DataSource.subscribeRealtime(symbol, tf, onTick, onStatusChange);
    }
    return apiDataSource.subscribeRealtime(symbol, tf, onTick, onStatusChange, apiKey);
  }

  public unsubscribeRealtime(): void {
    mt5DataSource.unsubscribeRealtime();
    apiDataSource.unsubscribeRealtime();
  }

  public getStoredApiKey(): string {
    return apiDataSource.getStoredApiKey();
  }

  public setStoredApiKey(key: string): void {
    apiDataSource.setStoredApiKey(key);
  }
}

export const marketDataService = new MarketDataManager();
