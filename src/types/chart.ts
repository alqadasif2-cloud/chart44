/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Bar {
  t: number;      // Unix timestamp in seconds
  o: number;      // Open
  h: number;      // High
  l: number;      // Low
  c: number;      // Close
  v: number;      // Volume
  buyVol?: number; // Estimated or real buy volume
  sellVol?: number;// Estimated or real sell volume
  tickVol?: number;// Tick volume
  realVol?: number;// Real volume
  spread?: number; // Spread in points
  trades?: number; // Number of trades
  clusters?: PriceCluster[]; // Footprint price clusters
}

export interface PriceCluster {
  price: number;
  bidVol: number;
  askVol: number;
  totalVol: number;
  delta: number;
}

export type ChartType = 
  | 'candles' 
  | 'bars' 
  | 'line' 
  | 'area' 
  | 'heikinAshi' 
  | 'renko' 
  | 'kagi' 
  | 'pointAndFigure'
  | 'footprint';

export type Timeframe = 
  | '1m' | '3m' | '5m' | '15m' | '30m' | '45m' 
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' 
  | '1D' | '1W' | '1M';

export interface SymbolMeta {
  symbol: string;
  name: string;
  nameAr: string;
  category: 'crypto' | 'forex' | 'metal' | 'indices' | 'commodity';
  provider: 'binance' | 'twelvedata' | 'mt5';
  precision: number;
  tickSize: number;
}

export type IndicatorCategory = 'trend' | 'momentum' | 'volatility' | 'volume' | 'orderflow';

export interface IndicatorParamDef {
  id: string;
  name: string;
  type: 'number' | 'color' | 'select' | 'boolean';
  default: any;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface IndicatorDefinition {
  id: string;
  name: string;
  nameAr: string;
  category: IndicatorCategory;
  panel: 'overlay' | 'subpanel';
  params: IndicatorParamDef[];
  description: string;
}

export interface IndicatorInstance {
  instanceId: string;
  defId: string;
  name: string;
  panel: 'overlay' | 'subpanel';
  visible: boolean;
  params: Record<string, any>;
  color: string;
  lineWidth: number;
}

export type DrawingToolType = 
  | 'cursor'
  | 'crosshair'
  | 'trend'
  | 'ray'
  | 'extended'
  | 'hline'
  | 'vline'
  | 'rect'
  | 'channel'
  | 'fibRetracement'
  | 'fibExtension'
  | 'fibTimezones'
  | 'pitchfork'
  | 'longPosition'
  | 'shortPosition'
  | 'priceRange'
  | 'dateRange'
  | 'text'
  | 'arrow'
  | 'zone';

export interface DrawingPoint {
  t: number;      // Timestamp
  p: number;      // Price
}

export interface DrawingItem {
  id: string;
  type: DrawingToolType;
  points: DrawingPoint[];
  color: string;
  lineWidth: number;
  fillColor?: string;
  locked?: boolean;
  visible?: boolean;
  text?: string;
  extra?: Record<string, any>; // Risk/reward, fib levels, channel width
}

export interface VolumeProfileData {
  bins: {
    price: number;
    vol: number;
    buyVol: number;
    sellVol: number;
  }[];
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
  totalVolume: number;
  maxBinVolume: number;
}

export interface ChartLayoutSettings {
  showGrid: boolean;
  showVolume: boolean;
  showCurrentPriceLine: boolean;
  theme: 'dark' | 'light';
  candleColors: {
    up: string;
    down: string;
    wickUp: string;
    wickDown: string;
  };
  valueAreaPercent: number; // e.g. 70
  renkoBrickSize: number;
}
