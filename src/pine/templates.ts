/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PineTemplate {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  code: string;
}

export const PINE_TEMPLATES: PineTemplate[] = [
  {
    id: 'ema_crossover',
    name: 'Dual EMA Golden Cross Strategy',
    nameAr: 'تقاطع المتوسطات الذهبي (EMA 9/21 Crossover)',
    description: 'Plots fast and slow exponential moving averages with buy/sell shape signals on crossovers.',
    code: `//@version=5
indicator("Dual EMA Golden Cross", "EMA Cross", overlay=true)

fastLen = input.int(9, "Fast EMA Length", minval=1)
slowLen = input.int(21, "Slow EMA Length", minval=1)
fastCol = input.color(color.yellow, "Fast EMA Color")
slowCol = input.color(color.blue, "Slow EMA Color")

fastEma = ta.ema(close, fastLen)
slowEma = ta.ema(close, slowLen)

plot(fastEma, "Fast EMA", fastCol, 2)
plot(slowEma, "Slow EMA", slowCol, 2)

bullishCross = ta.crossover(fastEma, slowEma)
bearishCross = ta.crossunder(fastEma, slowEma)

plotshape(bullishCross, "Bullish Buy Signal", shape.triangleup, location.belowbar, color.green, 0, "BUY")
plotshape(bearishCross, "Bearish Sell Signal", shape.triangledown, location.abovebar, color.red, 0, "SELL")

alertcondition(bullishCross, "Golden Cross Buy", "EMA Bullish Crossover detected on {{ticker}} at price {{close}}")
alertcondition(bearishCross, "Death Cross Sell", "EMA Bearish Crossunder detected on {{ticker}} at price {{close}}")
`,
  },
  {
    id: 'rsi_divergence',
    name: 'Enhanced RSI with Alerts',
    nameAr: 'مؤشر القوة النسبية مع تنبيهات ذروة الشراء والبيع',
    description: 'Custom RSI oscillator with customizable upper and lower thresholds and extreme reversal alerts.',
    code: `//@version=5
indicator("Enhanced RSI Oscillator", "RSI Alert", overlay=false)

rsiLength = input.int(14, "RSI Length", minval=1)
overbought = input.float(70.0, "Overbought Level", minval=50.0, maxval=95.0)
oversold = input.float(30.0, "Oversold Level", minval=5.0, maxval=50.0)
rsiColor = input.color(color.purple, "RSI Line Color")

rsiVal = ta.rsi(close, rsiLength)

plot(rsiVal, "RSI", rsiColor, 2)
hline(overbought, "Overbought", color.red, hline.style_dashed, 1)
hline(50.0, "Middle", color.gray, hline.style_dotted, 1)
hline(oversold, "Oversold", color.green, hline.style_dashed, 1)

isOverbought = ta.crossover(rsiVal, overbought)
isOversold = ta.crossunder(rsiVal, oversold)

alertcondition(isOverbought, "RSI Overbought", "RSI is overbought on {{ticker}} at {{close}}")
alertcondition(isOversold, "RSI Oversold", "RSI is oversold on {{ticker}} at {{close}}")
`,
  },
  {
    id: 'bollinger_breakout',
    name: 'Bollinger Bands Breakout',
    nameAr: 'اختراق قنوات بولنجر باندز',
    description: 'Calculates standard deviation channels and flags bullish/bearish breakouts beyond the bands.',
    code: `//@version=5
indicator("Bollinger Bands Breakout", "BB Break", overlay=true)

length = input.int(20, "Period Length", minval=5)
mult = input.float(2.0, "Multiplier", minval=0.5, step=0.1)

basis = ta.sma(close, length)
dev = ta.stdev(close, length)
upper = basis + (mult * dev)
lower = basis - (mult * dev)

plot(basis, "Basis (SMA)", color.yellow, 1)
plot(upper, "Upper Band", color.blue, 1)
plot(lower, "Lower Band", color.blue, 1)

breakoutUp = ta.crossover(close, upper)
breakoutDn = ta.crossunder(close, lower)

plotshape(breakoutUp, "Upper Breakout", shape.triangleup, location.belowbar, color.green, 0, "BULL")
plotshape(breakoutDn, "Lower Breakout", shape.triangledown, location.abovebar, color.red, 0, "BEAR")

alertcondition(breakoutUp, "BB Upper Breakout", "Price broke out above Upper Bollinger Band on {{ticker}}")
alertcondition(breakoutDn, "BB Lower Breakout", "Price broke down below Lower Bollinger Band on {{ticker}}")
`,
  },
  {
    id: 'supertrend_custom',
    name: 'Custom Supertrend ATR Filter',
    nameAr: 'سوبر تريند المخصص مع إشارات الاتجاه',
    description: 'True ATR-based trailing stop line with directional signals and crossover alerts.',
    code: `//@version=5
indicator("Supertrend ATR Custom", "Supertrend", overlay=true)

atrPeriod = input.int(10, "ATR Period", minval=1)
factor = input.float(3.0, "ATR Multiplier", minval=0.5, step=0.5)

atrVal = ta.atr(atrPeriod)
upperBand = hl2 + (factor * atrVal)
lowerBand = hl2 - (factor * atrVal)

plot(upperBand, "Upper Trailing Level", color.red, 1)
plot(lowerBand, "Lower Trailing Level", color.green, 1)

bullishSignal = ta.crossover(close, upperBand)
plotshape(bullishSignal, "Bullish Trend Shift", shape.triangleup, location.belowbar, color.green, 0, "UP")

alertcondition(bullishSignal, "Supertrend Bullish Flip", "Supertrend flipped Bullish on {{ticker}} at price {{close}}")
`,
  },
];
