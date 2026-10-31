/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bar } from '../types/chart';
import {
  CompilerDiagnostic,
  PineExecutionResult,
  PineScriptMetadata,
} from './types';
import { PineScriptParser } from './parser';
import {
  atr as calcAtr,
  ema as calcEma,
  rsi as calcRsi,
  sma as calcSma,
  wma as calcWma,
} from '../indicators/math';

export class PineScriptRuntime {
  /**
   * Executes a parsed Pine Script on a series of historical/live bars
   */
  public static execute(
    source: string,
    bars: Bar[],
    userInputs: Record<string, any> = {},
    symbol = 'BTCUSDT',
    timeframe = '15m'
  ): {
    result: PineExecutionResult | null;
    diagnostics: CompilerDiagnostic[];
  } {
    if (!bars.length) {
      return {
        result: null,
        diagnostics: [{ line: 1, column: 1, message: 'لا توجد بيانات أسعار لتنفيذ السكريبت عليها', severity: 'warning' }],
      };
    }

    const { metadata, diagnostics } = PineScriptParser.parse(source);
    if (diagnostics.some((d) => d.severity === 'error')) {
      return { result: null, diagnostics };
    }

    // Merge default inputs with user-provided overrides
    const inputs: Record<string, any> = {};
    metadata.inputs.forEach((inp) => {
      inputs[inp.id] = userInputs[inp.id] !== undefined ? userInputs[inp.id] : inp.default;
    });

    const numBars = bars.length;

    // Series vectors
    const openSeries = bars.map((b) => b.o);
    const highSeries = bars.map((b) => b.h);
    const lowSeries = bars.map((b) => b.l);
    const closeSeries = bars.map((b) => b.c);
    const volumeSeries = bars.map((b) => b.v);
    const timeSeries = bars.map((b) => b.t);
    const hl2Series = bars.map((b) => (b.h + b.l) / 2);
    const hlc3Series = bars.map((b) => (b.h + b.l + b.c) / 3);
    const ohlc4Series = bars.map((b) => (b.o + b.h + b.l + b.c) / 4);

    // TA Helper Library
    const ta = {
      sma: (src: number[], len: number): (number | null)[] => calcSma(src, len),
      ema: (src: number[], len: number): (number | null)[] => calcEma(src, len),
      wma: (src: number[], len: number): (number | null)[] => calcWma(src, len),
      rsi: (src: number[], len = 14): (number | null)[] => calcRsi(src, len),
      atr: (len = 14): (number | null)[] => calcAtr(bars, len),
      highest: (srcOrLen: number[] | number, lenOpt?: number): (number | null)[] => {
        const isSrc = Array.isArray(srcOrLen);
        const len = isSrc ? lenOpt || 14 : srcOrLen;
        const src = isSrc ? (srcOrLen as number[]) : highSeries;
        return src.map((_, i) => {
          if (i < len - 1) return null;
          let m = -Infinity;
          for (let j = i - len + 1; j <= i; j++) m = Math.max(m, src[j]);
          return m;
        });
      },
      lowest: (srcOrLen: number[] | number, lenOpt?: number): (number | null)[] => {
        const isSrc = Array.isArray(srcOrLen);
        const len = isSrc ? lenOpt || 14 : srcOrLen;
        const src = isSrc ? (srcOrLen as number[]) : lowSeries;
        return src.map((_, i) => {
          if (i < len - 1) return null;
          let m = Infinity;
          for (let j = i - len + 1; j <= i; j++) m = Math.min(m, src[j]);
          return m;
        });
      },
      crossover: (s1: (number | null)[], s2: (number | null)[] | number): boolean[] => {
        return s1.map((v1, i) => {
          if (i === 0 || v1 == null) return false;
          const v2 = typeof s2 === 'number' ? s2 : s2[i];
          const prevV1 = s1[i - 1];
          const prevV2 = typeof s2 === 'number' ? s2 : s2[i - 1];
          if (prevV1 == null || v2 == null || prevV2 == null) return false;
          return prevV1 <= prevV2 && v1 > v2;
        });
      },
      crossunder: (s1: (number | null)[], s2: (number | null)[] | number): boolean[] => {
        return s1.map((v1, i) => {
          if (i === 0 || v1 == null) return false;
          const v2 = typeof s2 === 'number' ? s2 : s2[i];
          const prevV1 = s1[i - 1];
          const prevV2 = typeof s2 === 'number' ? s2 : s2[i - 1];
          if (prevV1 == null || v2 == null || prevV2 == null) return false;
          return prevV1 >= prevV2 && v1 < v2;
        });
      },
      stdev: (src: number[], len: number): (number | null)[] => {
        const ma = calcSma(src, len);
        return src.map((_, i) => {
          const m = ma[i];
          if (m == null) return null;
          const slice = src.slice(i - len + 1, i + 1);
          const variance = slice.reduce((acc, v) => acc + (v - m) ** 2, 0) / len;
          return Math.sqrt(variance);
        });
      },
      barssince: (cond: boolean[]): (number | null)[] => {
        let lastTrue = -1;
        return cond.map((c, i) => {
          if (c) lastTrue = i;
          return lastTrue === -1 ? null : i - lastTrue;
        });
      },
    };

    // Math functions
    const math = {
      abs: Math.abs,
      max: Math.max,
      min: Math.min,
      sqrt: Math.sqrt,
      pow: Math.pow,
      round: Math.round,
      floor: Math.floor,
      ceil: Math.ceil,
      log: Math.log,
    };

    // Color constants
    const color = {
      green: '#26a69a',
      red: '#ef5350',
      blue: '#4aa3ff',
      yellow: '#f0b429',
      purple: '#b57cff',
      orange: '#ff9f43',
      aqua: '#00d2d3',
      white: '#ffffff',
      gray: '#7d8b9a',
      black: '#10151c',
      rgb: (r: number, g: number, b: number, a = 1) => `rgba(${r},${g},${b},${a})`,
    };

    const shape = {
      triangleup: 'triangleup',
      triangledown: 'triangledown',
      circle: 'circle',
      square: 'square',
      labelup: 'labelup',
      labeldown: 'labeldown',
    };

    const location = {
      abovebar: 'abovebar',
      belowbar: 'belowbar',
      top: 'top',
      bottom: 'bottom',
    };

    // Intermediate execution context
    const scope: Record<string, any> = {
      ...inputs,
      open: openSeries,
      high: highSeries,
      low: lowSeries,
      close: closeSeries,
      volume: volumeSeries,
      time: timeSeries,
      hl2: hl2Series,
      hlc3: hlc3Series,
      ohlc4: ohlc4Series,
      ta,
      math,
      color,
      shape,
      location,
    };

    const plotsData: { def: any; values: (number | null)[] }[] = [];
    const shapesData: { def: any; items: any[] }[] = [];
    const bgColors: (string | null)[] = new Array(numBars).fill(null);
    const barColors: (string | null)[] = new Array(numBars).fill(null);
    const alertsFired: any[] = [];

    // Builtin recording functions
    let plotIndex = 0;
    const plot = (series: any, titleStr?: string, colorVal?: any, lineWidth?: number) => {
      const def = metadata.plots[plotIndex] || {
        id: `plot_${plotIndex}`,
        title: titleStr || `Plot ${plotIndex + 1}`,
        color: typeof colorVal === 'string' ? colorVal : '#4aa3ff',
        lineWidth: lineWidth || 1.5,
        style: 'line',
      };
      plotIndex++;

      const values: (number | null)[] = Array.isArray(series)
        ? series
        : new Array(numBars).fill(typeof series === 'number' ? series : null);

      plotsData.push({ def, values });
    };

    let shapeIndex = 0;
    const plotshape = (
      condition: any,
      titleStr?: string,
      styleVal?: any,
      locationVal?: any,
      colorVal?: any,
      _offset?: number,
      textVal?: string
    ) => {
      const def = metadata.shapes[shapeIndex] || {
        id: `shape_${shapeIndex}`,
        title: titleStr || `Shape ${shapeIndex + 1}`,
        style: styleVal || 'triangleup',
        location: locationVal || 'belowbar',
        color: typeof colorVal === 'string' ? colorVal : '#26a69a',
        size: 'small',
        text: textVal,
      };
      shapeIndex++;

      const items: any[] = [];
      if (Array.isArray(condition)) {
        condition.forEach((cond, i) => {
          if (cond) {
            const price = def.location === 'abovebar' ? highSeries[i] : lowSeries[i];
            items.push({
              barIndex: i,
              price,
              color: def.color,
              text: def.text,
            });
          }
        });
      }
      shapesData.push({ def, items });
    };

    const bgcolor = (col: string | ((barIdx: number) => string | null)) => {
      for (let i = 0; i < numBars; i++) {
        bgColors[i] = typeof col === 'function' ? col(i) : col;
      }
    };

    const barcolor = (col: string | ((barIdx: number) => string | null)) => {
      for (let i = 0; i < numBars; i++) {
        barColors[i] = typeof col === 'function' ? col(i) : col;
      }
    };

    const alertcondition = (cond: boolean[] | boolean, titleStr?: string, msgStr?: string) => {
      const lastIdx = numBars - 1;
      const isTriggered = Array.isArray(cond) ? cond[lastIdx] : cond;
      if (isTriggered) {
        alertsFired.push({
          conditionId: titleStr || 'Alert',
          title: titleStr || 'Pine Alert Condition',
          message: (msgStr || 'Alert triggered on {{ticker}}')
            .replace('{{ticker}}', symbol)
            .replace('{{close}}', closeSeries[lastIdx].toFixed(2)),
          barIndex: lastIdx,
          time: timeSeries[lastIdx],
          price: closeSeries[lastIdx],
        });
      }
    };

    // Sandbox execution context
    scope.plot = plot;
    scope.plotshape = plotshape;
    scope.bgcolor = bgcolor;
    scope.barcolor = barcolor;
    scope.alertcondition = alertcondition;

    // Transpile & Execute safe Pine Script statements
    try {
      const transpiled = this.transpileToJs(source, metadata);
      const executionFunc = new Function(
        ...Object.keys(scope),
        `"use strict";\n${transpiled}`
      );
      executionFunc(...Object.values(scope));
    } catch (err: any) {
      diagnostics.push({
        line: 1,
        column: 1,
        message: `خطأ أثناء تنفيذ الكود: ${err.message}`,
        severity: 'error',
      });
      return { result: null, diagnostics };
    }

    const result: PineExecutionResult = {
      overlay: metadata.overlay,
      title: metadata.title,
      plots: plotsData,
      shapes: shapesData,
      hlines: metadata.hlines,
      bgColors,
      barColors,
      alertsFired,
    };

    return { result, diagnostics };
  }

  /**
   * Transpiler that converts clean Pine Script idioms into JavaScript syntax
   */
  private static transpileToJs(source: string, metadata: PineScriptMetadata): string {
    const lines = source.split(/\r?\n/);
    const jsLines: string[] = [];

    for (const rawLine of lines) {
      let line = rawLine.trim();

      // Skip comments, indicator declarations, and input declarations (handled upfront)
      if (
        !line ||
        line.startsWith('//') ||
        line.startsWith('indicator(') ||
        line.startsWith('strategy(')
      ) {
        continue;
      }

      // Convert input assignments: var_name = input.int(...) -> var var_name = var_name;
      if (line.match(/^(?:var\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*input(?:\.[a-zA-Z_]+)?\(/)) {
        continue;
      }

      // Replace `var type varName = ...` -> `let varName = ...`
      line = line.replace(/^var\s+(?:float|int|bool|string|color)?\s*/, 'let ');

      // Replace `:=` (Pine assignment) -> `=`
      line = line.replace(/:=/g, '=');

      // Replace variable declarations without let/const/var
      const assignMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=(?!=)/);
      if (assignMatch && !line.startsWith('let ') && !line.startsWith('const ') && !line.startsWith('var ')) {
        const varName = assignMatch[1];
        if (!metadata.inputs.some((inp) => inp.id === varName)) {
          line = 'let ' + line;
        }
      }

      // Replace series index `close[1]` -> `ta.shift(close, 1)` or custom handling
      line = line.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\[([0-9]+)\]/g, (_, vName, shift) => {
        return `(${vName}.map((_, idx, arr) => idx >= ${shift} ? arr[idx - ${shift}] : null))`;
      });

      // Replace ternary operators without spaces: condition ? true_val : false_val is standard in JS
      jsLines.push(line);
    }

    return jsLines.join('\n');
  }
}
