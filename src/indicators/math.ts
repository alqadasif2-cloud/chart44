/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bar, VolumeProfileData } from '../types/chart';

export function sma(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    if (slice.some((v) => v == null)) {
      result.push(null);
      continue;
    }
    const sum = (slice as number[]).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

export function ema(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const slice = data.slice(0, period);
      prevEma = slice.reduce((a, b) => a + b, 0) / period;
      result.push(prevEma);
    } else {
      prevEma = data[i] * k + (prevEma as number) * (1 - k);
      result.push(prevEma);
    }
  }
  return result;
}

export function wma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const denominator = (period * (period + 1)) / 2;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - period + 1 + j] * (j + 1);
    }
    result.push(sum / denominator);
  }
  return result;
}

export function vwma(bars: Bar[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sumPv = 0;
    let sumV = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const v = bars[j].v || 1;
      sumPv += bars[j].c * v;
      sumV += v;
    }
    result.push(sumV === 0 ? null : sumPv / sumV);
  }
  return result;
}

export function rma(data: number[], period: number): (number | null)[] {
  const alpha = 1 / period;
  const result: (number | null)[] = [];
  let prevRma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      prevRma = sum / period;
      result.push(prevRma);
    } else {
      prevRma = alpha * data[i] + (1 - alpha) * (prevRma as number);
      result.push(prevRma);
    }
  }
  return result;
}

export function hma(data: number[], period: number): (number | null)[] {
  const halfLength = Math.max(1, Math.round(period / 2));
  const sqrtLength = Math.max(1, Math.round(Math.sqrt(period)));

  const wmaHalf = wma(data, halfLength);
  const wmaFull = wma(data, period);

  const diff: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (wmaHalf[i] != null && wmaFull[i] != null) {
      diff.push(2 * (wmaHalf[i] as number) - (wmaFull[i] as number));
    } else {
      diff.push(0);
    }
  }
  return wma(diff, sqrtLength);
}

export function dema(data: number[], period: number): (number | null)[] {
  const e1 = ema(data, period);
  const nonNullE1: number[] = [];
  const offset = period - 1;
  for (let i = offset; i < e1.length; i++) {
    nonNullE1.push(e1[i] as number);
  }
  const e2 = ema(nonNullE1, period);

  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < offset * 2) {
      result.push(null);
    } else {
      const val1 = e1[i];
      const val2 = e2[i - offset];
      if (val1 != null && val2 != null) {
        result.push(2 * val1 - val2);
      } else {
        result.push(null);
      }
    }
  }
  return result;
}

export function tema(data: number[], period: number): (number | null)[] {
  const e1 = ema(data, period);
  const nonNullE1 = e1.slice(period - 1) as number[];
  const e2 = ema(nonNullE1, period);
  const nonNullE2 = e2.slice(period - 1) as number[];
  const e3 = ema(nonNullE2, period);

  const shift1 = period - 1;
  const shift2 = shift1 * 2;
  const shift3 = shift1 * 3;

  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < shift3) {
      result.push(null);
    } else {
      const val1 = e1[i];
      const val2 = e2[i - shift1];
      const val3 = e3[i - shift2];
      if (val1 != null && val2 != null && val3 != null) {
        result.push(3 * val1 - 3 * val2 + val3);
      } else {
        result.push(null);
      }
    }
  }
  return result;
}

export function trs(bars: Bar[]): number[] {
  return bars.map((b, i) => {
    if (i === 0) return b.h - b.l;
    return Math.max(b.h - b.l, Math.abs(b.h - bars[i - 1].c), Math.abs(b.l - bars[i - 1].c));
  });
}

export function atr(bars: Bar[], period = 14): (number | null)[] {
  return rma(trs(bars), period);
}

export function supertrend(
  bars: Bar[],
  period = 10,
  multiplier = 3
): { up: (number | null)[]; dn: (number | null)[]; trend: number[] } {
  const trList = trs(bars);
  const atrValues = rma(trList, period);
  const up: (number | null)[] = [];
  const dn: (number | null)[] = [];
  const trend: number[] = [];

  let finalUpper: number | null = null;
  let finalLower: number | null = null;
  let currentTrend = 1;

  for (let i = 0; i < bars.length; i++) {
    const atrVal = atrValues[i];
    if (atrVal == null) {
      up.push(null);
      dn.push(null);
      trend.push(1);
      continue;
    }
    const hl2 = (bars[i].h + bars[i].l) / 2;
    const basicUpper = hl2 + multiplier * atrVal;
    const basicLower = hl2 - multiplier * atrVal;

    if (finalUpper == null || finalLower == null) {
      finalUpper = basicUpper;
      finalLower = basicLower;
    } else {
      const prevClose = bars[i - 1].c;
      finalUpper = basicUpper < finalUpper || prevClose > finalUpper ? basicUpper : finalUpper;
      finalLower = basicLower > finalLower || prevClose < finalLower ? basicLower : finalLower;

      if (currentTrend === -1 && bars[i].c > finalUpper) {
        currentTrend = 1;
      } else if (currentTrend === 1 && bars[i].c < finalLower) {
        currentTrend = -1;
      }
    }

    trend.push(currentTrend);
    up.push(currentTrend === 1 ? finalLower : null);
    dn.push(currentTrend === -1 ? finalUpper : null);
  }
  return { up, dn, trend };
}

export function parabolicSar(
  bars: Bar[],
  step = 0.02,
  maxStep = 0.2
): (number | null)[] {
  if (bars.length < 2) return bars.map(() => null);

  const result: (number | null)[] = [];
  let isRising = bars[1].c > bars[0].c;
  let ep = isRising ? bars[0].h : bars[0].l;
  let af = step;
  let sar = isRising ? bars[0].l : bars[0].h;

  result.push(sar);

  for (let i = 1; i < bars.length; i++) {
    const priorSar = sar;
    sar = priorSar + af * (ep - priorSar);

    if (isRising) {
      if (i >= 2) sar = Math.min(sar, bars[i - 1].l, bars[i - 2].l);
      else sar = Math.min(sar, bars[i - 1].l);

      if (bars[i].l < sar) {
        isRising = false;
        sar = ep;
        ep = bars[i].l;
        af = step;
      } else {
        if (bars[i].h > ep) {
          ep = bars[i].h;
          af = Math.min(af + step, maxStep);
        }
      }
    } else {
      if (i >= 2) sar = Math.max(sar, bars[i - 1].h, bars[i - 2].h);
      else sar = Math.max(sar, bars[i - 1].h);

      if (bars[i].h > sar) {
        isRising = true;
        sar = ep;
        ep = bars[i].h;
        af = step;
      } else {
        if (bars[i].l < ep) {
          ep = bars[i].l;
          af = Math.min(af + step, maxStep);
        }
      }
    }
    result.push(sar);
  }
  return result;
}

export function ichimoku(
  bars: Bar[],
  conversionPeriod = 9,
  basePeriod = 26,
  spanBPeriod = 52,
  displacement = 26
): {
  tenkan: (number | null)[];
  kijun: (number | null)[];
  spanA: (number | null)[];
  spanB: (number | null)[];
  chikou: (number | null)[];
} {
  const getMidpoint = (len: number, idx: number) => {
    if (idx < len - 1) return null;
    let high = -Infinity;
    let low = Infinity;
    for (let j = idx - len + 1; j <= idx; j++) {
      high = Math.max(high, bars[j].h);
      low = Math.min(low, bars[j].l);
    }
    return (high + low) / 2;
  };

  const tenkan = bars.map((_, i) => getMidpoint(conversionPeriod, i));
  const kijun = bars.map((_, i) => getMidpoint(basePeriod, i));

  const spanA: (number | null)[] = [];
  const spanB: (number | null)[] = [];
  const chikou: (number | null)[] = [];

  for (let i = 0; i < bars.length; i++) {
    // Span A & B are projected forward by displacement
    const tVal = tenkan[i];
    const kVal = kijun[i];
    spanA.push(tVal != null && kVal != null ? (tVal + kVal) / 2 : null);
    spanB.push(getMidpoint(spanBPeriod, i));

    // Chikou is close displaced backward by displacement
    chikou.push(bars[i].c);
  }

  return { tenkan, kijun, spanA, spanB, chikou };
}

export function bollingerBands(
  data: number[],
  period = 20,
  stdDevMult = 2
): {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
  bandwidth: (number | null)[];
} {
  const middle = sma(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const bandwidth: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    const mid = middle[i];
    if (mid == null) {
      upper.push(null);
      lower.push(null);
      bandwidth.push(null);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const variance = slice.reduce((sum, val) => sum + (val - mid) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);

    const up = mid + stdDevMult * stdDev;
    const lo = mid - stdDevMult * stdDev;
    upper.push(up);
    lower.push(lo);
    bandwidth.push(mid === 0 ? 0 : (up - lo) / mid);
  }
  return { middle, upper, lower, bandwidth };
}

export function donchianChannels(
  bars: Bar[],
  period = 20
): {
  upper: (number | null)[];
  lower: (number | null)[];
  middle: (number | null)[];
} {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const middle: (number | null)[] = [];

  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      middle.push(null);
      continue;
    }
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, bars[j].h);
      lo = Math.min(lo, bars[j].l);
    }
    upper.push(hi);
    lower.push(lo);
    middle.push((hi + lo) / 2);
  }
  return { upper, lower, middle };
}

export function keltnerChannels(
  bars: Bar[],
  emaPeriod = 20,
  atrPeriod = 10,
  multiplier = 2
): {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
} {
  const middle = ema(bars.map((b) => b.c), emaPeriod);
  const atrValues = atr(bars, atrPeriod);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < bars.length; i++) {
    const mid = middle[i];
    const a = atrValues[i];
    if (mid == null || a == null) {
      upper.push(null);
      lower.push(null);
    } else {
      upper.push(mid + multiplier * a);
      lower.push(mid - multiplier * a);
    }
  }
  return { middle, upper, lower };
}

export function rsi(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }
    const diff = data[i] - data[i - 1];
    const gain = Math.max(0, diff);
    const loss = Math.max(0, -diff);

    if (i < period) {
      avgGain += gain;
      avgLoss += loss;
      result.push(null);
    } else if (i === period) {
      avgGain = (avgGain + gain) / period;
      avgLoss = (avgLoss + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

export function stochastic(
  bars: Bar[],
  periodK = 14,
  smoothK = 3,
  periodD = 3
): { k: (number | null)[]; d: (number | null)[] } {
  const rawK: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < periodK - 1) {
      rawK.push(null);
      continue;
    }
    const slice = bars.slice(i - periodK + 1, i + 1);
    const highest = Math.max(...slice.map((b) => b.h));
    const lowest = Math.min(...slice.map((b) => b.l));
    const range = highest - lowest;
    rawK.push(range === 0 ? 50 : ((bars[i].c - lowest) / range) * 100);
  }
  const k = sma(rawK, smoothK);
  const d = sma(k, periodD);
  return { k, d };
}

export function stochasticRsi(
  data: number[],
  rsiPeriod = 14,
  stochPeriod = 14,
  smoothK = 3,
  smoothD = 3
): { k: (number | null)[]; d: (number | null)[] } {
  const rsiValues = rsi(data, rsiPeriod);
  const rawK: (number | null)[] = [];

  for (let i = 0; i < rsiValues.length; i++) {
    if (i < rsiPeriod + stochPeriod - 1) {
      rawK.push(null);
      continue;
    }
    const slice = rsiValues.slice(i - stochPeriod + 1, i + 1);
    if (slice.some((v) => v == null)) {
      rawK.push(null);
      continue;
    }
    const valid = slice as number[];
    const minRsi = Math.min(...valid);
    const maxRsi = Math.max(...valid);
    const range = maxRsi - minRsi;
    const current = rsiValues[i] as number;
    rawK.push(range === 0 ? 50 : ((current - minRsi) / range) * 100);
  }

  const k = sma(rawK, smoothK);
  const d = sma(k, smoothD);
  return { k, d };
}

export function macd(
  data: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
} {
  const fastEma = ema(data, fastPeriod);
  const slowEma = ema(data, slowPeriod);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    const f = fastEma[i];
    const s = slowEma[i];
    macdLine.push(f != null && s != null ? f - s : null);
  }

  const signalLine = ema(
    macdLine.map((v) => (v == null ? 0 : v)),
    signalPeriod
  );

  const histogram: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    const m = macdLine[i];
    const sig = signalLine[i];
    histogram.push(m != null && sig != null ? m - sig : null);
  }

  return { macdLine, signalLine, histogram };
}

export function cci(bars: Bar[], period = 20): (number | null)[] {
  const tp = bars.map((b) => (b.h + b.l + b.c) / 3);
  const smaTp = sma(tp, period);
  const result: (number | null)[] = [];

  for (let i = 0; i < bars.length; i++) {
    const avg = smaTp[i];
    if (avg == null) {
      result.push(null);
      continue;
    }
    let meanDev = 0;
    for (let j = i - period + 1; j <= i; j++) {
      meanDev += Math.abs(tp[j] - avg);
    }
    meanDev /= period;
    result.push(meanDev === 0 ? 0 : (tp[i] - avg) / (0.015 * meanDev));
  }
  return result;
}

export function roc(data: number[], period = 12): (number | null)[] {
  return data.map((val, i) => {
    if (i < period) return null;
    const prev = data[i - period];
    return prev === 0 ? 0 : ((val - prev) / prev) * 100;
  });
}

export function momentum(data: number[], period = 10): (number | null)[] {
  return data.map((val, i) => {
    if (i < period) return null;
    return val - data[i - period];
  });
}

export function williamsR(bars: Bar[], period = 14): (number | null)[] {
  return bars.map((b, i) => {
    if (i < period - 1) return null;
    const slice = bars.slice(i - period + 1, i + 1);
    const hi = Math.max(...slice.map((x) => x.h));
    const lo = Math.min(...slice.map((x) => x.l));
    const range = hi - lo;
    return range === 0 ? -50 : ((hi - b.c) / range) * -100;
  });
}

export function awesomeOscillator(bars: Bar[]): (number | null)[] {
  const hl2 = bars.map((b) => (b.h + b.l) / 2);
  const sma5 = sma(hl2, 5);
  const sma34 = sma(hl2, 34);
  return bars.map((_, i) => (sma5[i] != null && sma34[i] != null ? (sma5[i] as number) - (sma34[i] as number) : null));
}

export function vwap(bars: Bar[]): (number | null)[] {
  let cumPv = 0;
  let cumVol = 0;
  let currentDay = -1;

  return bars.map((b) => {
    const day = Math.floor(b.t / 86400);
    if (day !== currentDay) {
      currentDay = day;
      cumPv = 0;
      cumVol = 0;
    }
    const vol = b.v || 1;
    cumPv += ((b.h + b.l + b.c) / 3) * vol;
    cumVol += vol;
    return cumVol === 0 ? null : cumPv / cumVol;
  });
}

export function obv(bars: Bar[]): number[] {
  const result: number[] = [];
  let currentObv = 0;
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      result.push(currentObv);
      continue;
    }
    if (bars[i].c > bars[i - 1].c) {
      currentObv += bars[i].v;
    } else if (bars[i].c < bars[i - 1].c) {
      currentObv -= bars[i].v;
    }
    result.push(currentObv);
  }
  return result;
}

export function mfi(bars: Bar[], period = 14): (number | null)[] {
  const tp = bars.map((b) => (b.h + b.l + b.c) / 3);
  const result: (number | null)[] = [];

  for (let i = 0; i < bars.length; i++) {
    if (i < period) {
      result.push(null);
      continue;
    }
    let posFlow = 0;
    let negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const moneyFlow = tp[j] * (bars[j].v || 1);
      if (tp[j] > tp[j - 1]) posFlow += moneyFlow;
      else if (tp[j] < tp[j - 1]) negFlow += moneyFlow;
    }
    if (negFlow === 0) {
      result.push(100);
    } else {
      const mr = posFlow / negFlow;
      result.push(100 - 100 / (1 + mr));
    }
  }
  return result;
}

export function cmf(bars: Bar[], period = 20): (number | null)[] {
  const mfv = bars.map((b) => {
    const range = b.h - b.l;
    const clv = range === 0 ? 0 : (b.c - b.l - (b.h - b.c)) / range;
    return clv * b.v;
  });

  const result: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sumMfv = 0;
    let sumVol = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumMfv += mfv[j];
      sumVol += bars[j].v;
    }
    result.push(sumVol === 0 ? 0 : sumMfv / sumVol);
  }
  return result;
}

export function cumulativeVolumeDelta(bars: Bar[]): number[] {
  let cvd = 0;
  const result: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    let delta = 0;
    if (b.buyVol != null && b.sellVol != null) {
      delta = b.buyVol - b.sellVol;
    } else {
      // Estimate tick delta based on candle body & range
      const range = b.h - b.l;
      const body = b.c - b.o;
      const factor = range === 0 ? 0 : body / range;
      delta = b.v * factor;
    }
    cvd += delta;
    result.push(cvd);
  }
  return result;
}

/**
 * Calculates a professional Volume Profile (VRVP) with POC, VAH, and VAL
 */
export function calculateVolumeProfile(
  bars: Bar[],
  numBins = 50,
  valueAreaPercent = 70
): VolumeProfileData {
  if (!bars.length) {
    return {
      bins: [],
      pocPrice: 0,
      vahPrice: 0,
      valPrice: 0,
      totalVolume: 0,
      maxBinVolume: 0,
    };
  }

  let high = -Infinity;
  let low = Infinity;
  let totalVolume = 0;

  for (const b of bars) {
    high = Math.max(high, b.h);
    low = Math.min(low, b.l);
    totalVolume += b.v;
  }

  const priceRange = high - low;
  const binStep = priceRange / numBins || 1;

  const bins = Array.from({ length: numBins }, (_, idx) => ({
    price: low + (idx + 0.5) * binStep,
    vol: 0,
    buyVol: 0,
    sellVol: 0,
  }));

  for (const b of bars) {
    const candleRange = Math.max(0.0001, b.h - b.l);
    const buyFrac = b.c >= b.o ? 0.6 : 0.4;

    for (let k = 0; k < numBins; k++) {
      const binBottom = low + k * binStep;
      const binTop = binBottom + binStep;

      // Overlap between candle range and bin
      const overlapStart = Math.max(b.l, binBottom);
      const overlapEnd = Math.min(b.h, binTop);

      if (overlapEnd > overlapStart) {
        const weight = (overlapEnd - overlapStart) / candleRange;
        const binVol = b.v * weight;
        bins[k].vol += binVol;
        bins[k].buyVol += binVol * buyFrac;
        bins[k].sellVol += binVol * (1 - buyFrac);
      }
    }
  }

  let maxBinIndex = 0;
  let maxBinVolume = 0;
  for (let k = 0; k < bins.length; k++) {
    if (bins[k].vol > maxBinVolume) {
      maxBinVolume = bins[k].vol;
      maxBinIndex = k;
    }
  }

  const pocPrice = bins[maxBinIndex]?.price || low + priceRange / 2;

  // Value Area calculation (70% standard)
  const targetVaVolume = totalVolume * (valueAreaPercent / 100);
  let currentVaVolume = maxBinVolume;
  let lowIndex = maxBinIndex;
  let highIndex = maxBinIndex;

  while (currentVaVolume < targetVaVolume && (lowIndex > 0 || highIndex < numBins - 1)) {
    const nextLowerVol = lowIndex > 0 ? bins[lowIndex - 1].vol : -1;
    const nextHigherVol = highIndex < numBins - 1 ? bins[highIndex + 1].vol : -1;

    if (nextHigherVol >= nextLowerVol && highIndex < numBins - 1) {
      highIndex++;
      currentVaVolume += bins[highIndex].vol;
    } else if (lowIndex > 0) {
      lowIndex--;
      currentVaVolume += bins[lowIndex].vol;
    } else {
      break;
    }
  }

  const vahPrice = bins[highIndex]?.price || high;
  const valPrice = bins[lowIndex]?.price || low;

  return {
    bins,
    pocPrice,
    vahPrice,
    valPrice,
    totalVolume,
    maxBinVolume,
  };
}

/**
 * Transforms candles into Heikin-Ashi candles
 */
export function calculateHeikinAshi(bars: Bar[]): Bar[] {
  const result: Bar[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const haClose = (b.o + b.h + b.l + b.c) / 4;
    let haOpen: number;
    if (i === 0) {
      haOpen = (b.o + b.c) / 2;
    } else {
      haOpen = (result[i - 1].o + result[i - 1].c) / 2;
    }
    const haHigh = Math.max(b.h, haOpen, haClose);
    const haLow = Math.min(b.l, haOpen, haClose);

    result.push({
      t: b.t,
      o: haOpen,
      h: haHigh,
      l: haLow,
      c: haClose,
      v: b.v,
      buyVol: b.buyVol,
      sellVol: b.sellVol,
    });
  }
  return result;
}

/**
 * Builds Renko bricks based on ATR or fixed brick size
 */
export function calculateRenko(bars: Bar[], brickSize = 0): Bar[] {
  if (bars.length < 2) return bars;
  let size = brickSize;
  if (!size || size <= 0) {
    const atrVals = atr(bars, 14);
    size = (atrVals[atrVals.length - 1] as number) || (bars[0].c * 0.005);
  }

  const renkoBars: Bar[] = [];
  let currentBase = Math.floor(bars[0].c / size) * size;

  for (let i = 1; i < bars.length; i++) {
    const price = bars[i].c;
    while (price >= currentBase + size) {
      renkoBars.push({
        t: bars[i].t,
        o: currentBase,
        c: currentBase + size,
        h: currentBase + size,
        l: currentBase,
        v: bars[i].v,
      });
      currentBase += size;
    }
    while (price <= currentBase - size) {
      renkoBars.push({
        t: bars[i].t,
        o: currentBase,
        c: currentBase - size,
        h: currentBase,
        l: currentBase - size,
        v: bars[i].v,
      });
      currentBase -= size;
    }
  }
  return renkoBars.length > 0 ? renkoBars : bars;
}
