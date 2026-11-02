/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Bar,
  ChartType,
  DrawingItem,
  DrawingToolType,
  IndicatorInstance,
  SymbolMeta,
  Timeframe,
  VolumeProfileData,
} from './types/chart';
import {
  marketDataService,
  MT5StatusInfo,
  SUPPORTED_SYMBOLS,
  TF_SECONDS,
} from './data/marketData';
import { Capacitor } from '@capacitor/core';
import {
  calculateHeikinAshi,
  calculateRenko,
  calculateVolumeProfile,
  sma,
  ema,
  wma,
  vwma,
  hma,
  dema,
  tema,
  supertrend,
  parabolicSar,
  ichimoku,
  bollingerBands,
  donchianChannels,
  keltnerChannels,
  atr,
  rsi,
  stochastic,
  stochasticRsi,
  macd,
  cci,
  williamsR,
  awesomeOscillator,
  vwap,
  obv,
  mfi,
  cmf,
  cumulativeVolumeDelta,
} from './indicators/math';
import { INDICATOR_DEFINITIONS } from './indicators/definitions';
import {
  loadSavedDrawings,
  persistDrawings,
  renderDrawing,
  ChartCoordinateMapper,
} from './drawings/drawingEngine';

import { TopToolbar } from './components/TopToolbar';
import { LeftToolbar } from './components/LeftToolbar';
import { RightSidebar } from './components/RightSidebar';
import { ReplayControls } from './components/ReplayControls';
import { IndicatorModal } from './components/IndicatorModal';
import { GoToDateModal } from './components/GoToDateModal';
import { KeyModal } from './components/KeyModal';
import { PineEditorModal } from './components/PineEditorModal';
import { PineSettingsModal } from './components/PineSettingsModal';
import { CustomPineIndicator, PineAlert, PineExecutionResult } from './pine/types';
import { PineScriptParser } from './pine/parser';
import { PineScriptRuntime } from './pine/runtime';
import { PINE_TEMPLATES } from './pine/templates';
import { Bell, X } from 'lucide-react';

export default function App() {
  const [sym, setSym] = useState<string>('BTCUSDT');
  const [tf, setTf] = useState<Timeframe>('15m');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [statusText, setStatusText] = useState<string>('جارٍ التحميل...');

  // MetaTrader 5 Connection State & Symbols
  const [mt5Status, setMt5Status] = useState<MT5StatusInfo | null>(() => marketDataService.mt5Status);
  const [availableSymbols, setAvailableSymbols] = useState<SymbolMeta[]>(() => marketDataService.getAvailableSymbols());

  useEffect(() => {
    // Android Detection: If running natively inside Android APK via Capacitor, lock to API mode
    const isNativeAndroid =
      typeof window !== 'undefined' &&
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === 'android';

    if (isNativeAndroid) {
      marketDataService.setMode('api');
      setAvailableSymbols(marketDataService.getAvailableSymbols());
      return;
    }

    marketDataService.onMT5StatusChange = (status) => {
      setMt5Status(status);
      const symbols = marketDataService.getAvailableSymbols();
      setAvailableSymbols(symbols);
      if (status?.is_connected) {
        setStatusText(`● مباشر MT5 (#${status.account?.login || ''})`);
        if (symbols.length > 0 && !symbols.some((s) => s.symbol === sym)) {
          const gold = symbols.find(
            (s) => s.symbol.toUpperCase().includes('XAU') || s.symbol.toUpperCase().includes('GOLD')
          );
          if (gold) {
            setSym(gold.symbol);
          } else {
            setSym(symbols[0].symbol);
          }
        }
      }
    };

    // Initial check for locally running MT5 bridge
    marketDataService.checkMT5Status().then((connected) => {
      if (connected) {
        setMt5Status(marketDataService.mt5Status);
        const symbols = marketDataService.getAvailableSymbols();
        setAvailableSymbols(symbols);
        const gold = symbols.find(
          (s) => s.symbol.toUpperCase().includes('XAU') || s.symbol.toUpperCase().includes('GOLD')
        );
        if (gold && (sym === 'BTCUSDT' || !sym)) {
          setSym(gold.symbol);
        }
      }
    });
  }, []);

  // Active Indicators list
  const [activeIndicators, setActiveIndicators] = useState<IndicatorInstance[]>([
    {
      instanceId: 'vol_default',
      defId: 'vol',
      name: 'Volume (VOL)',
      panel: 'overlay',
      visible: true,
      params: { showSma: true, smaPeriod: 20 },
      color: '#26a69a',
      lineWidth: 1.5,
    },
    {
      instanceId: 'sma_20',
      defId: 'sma',
      name: 'SMA (20)',
      panel: 'overlay',
      visible: true,
      params: { period: 20 },
      color: '#f0b429',
      lineWidth: 1.5,
    },
    {
      instanceId: 'vp_default',
      defId: 'vp',
      name: 'Volume Profile',
      panel: 'overlay',
      visible: true,
      params: { bins: 40, valueArea: 70, showPoc: true },
      color: 'rgba(240, 180, 41, 0.25)',
      lineWidth: 1.5,
    },
  ]);

  // Drawing tools state
  const [activeTool, setActiveTool] = useState<DrawingToolType>('crosshair');
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [isDrawingsLocked, setIsDrawingsLocked] = useState<boolean>(false);

  // Modals state
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<IndicatorInstance | null>(null);
  const [isGoToDateOpen, setIsGoToDateOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // Pine Script State
  const [customPineIndicators, setCustomPineIndicators] = useState<CustomPineIndicator[]>(() => {
    try {
      const saved = localStorage.getItem('cchart_active_pine_indicators');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default to first template (Dual EMA Golden Cross) out of the box
    try {
      const defaultTpl = PINE_TEMPLATES[0];
      const { metadata } = PineScriptParser.parse(defaultTpl.code);
      return [
        {
          id: 'pine_default_ema',
          name: metadata.title || defaultTpl.name,
          code: defaultTpl.code,
          version: metadata.version,
          overlay: metadata.overlay,
          inputValues: {},
          visible: true,
          metadata,
          updatedAt: Date.now(),
        },
      ];
    } catch {
      return [];
    }
  });

  const [savedPineIndicators, setSavedPineIndicators] = useState<CustomPineIndicator[]>(() => {
    try {
      const saved = localStorage.getItem('cchart_saved_pine_indicators');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default library populated with all 4 ready-to-use Pine templates
    return PINE_TEMPLATES.map((tpl) => {
      const { metadata } = PineScriptParser.parse(tpl.code);
      return {
        id: tpl.id,
        name: metadata.title || tpl.name,
        code: tpl.code,
        version: metadata.version,
        overlay: metadata.overlay,
        inputValues: {},
        visible: true,
        metadata,
        updatedAt: Date.now(),
      };
    });
  });

  const [pineAlerts, setPineAlerts] = useState<PineAlert[]>(() => {
    try {
      const saved = localStorage.getItem('cchart_pine_alerts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'alert_ema_cross',
        indicatorId: 'pine_default_ema',
        indicatorName: 'Dual EMA Golden Cross',
        symbol: 'BTCUSDT',
        timeframe: '15m',
        conditionName: 'Golden Cross Buy',
        messageTemplate: 'EMA Bullish Crossover detected on {{ticker}} at price {{close}}',
        triggerType: 'once_per_bar_close',
        sound: true,
        popup: true,
      },
    ];
  });

  const [isPineEditorOpen, setIsPineEditorOpen] = useState(false);
  const [editingPineIndicator, setEditingPineIndicator] = useState<CustomPineIndicator | null>(null);
  const [activeAlertToast, setActiveAlertToast] = useState<{
    id: string;
    title: string;
    message: string;
    time: number;
  } | null>(null);

  const lastAlertFiredRef = useRef<{ title: string; time: number } | null>(null);

  // Sync Pine state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cchart_active_pine_indicators', JSON.stringify(customPineIndicators));
    } catch (e) {
      console.error(e);
    }
  }, [customPineIndicators]);

  useEffect(() => {
    try {
      localStorage.setItem('cchart_saved_pine_indicators', JSON.stringify(savedPineIndicators));
    } catch (e) {
      console.error(e);
    }
  }, [savedPineIndicators]);

  useEffect(() => {
    try {
      localStorage.setItem('cchart_pine_alerts', JSON.stringify(pineAlerts));
    } catch (e) {
      console.error(e);
    }
  }, [pineAlerts]);

  // Audio tone generator for Pine alerts
  const playAlertChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio might need user gesture
    }
  }, []);

  // Pine Script Handlers
  const handleRunPineOnChart = useCallback((indicator: CustomPineIndicator) => {
    setCustomPineIndicators((prev) => {
      const idx = prev.findIndex((p) => p.id === indicator.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = indicator;
        return updated;
      }
      return [indicator, ...prev];
    });
  }, []);

  const handleTogglePineVisibility = useCallback((id: string) => {
    setCustomPineIndicators((prev) =>
      prev.map((ind) => (ind.id === id ? { ...ind, visible: !ind.visible } : ind))
    );
  }, []);

  const handleRemovePineIndicator = useCallback((id: string) => {
    setCustomPineIndicators((prev) => prev.filter((ind) => ind.id !== id));
  }, []);

  const handleSavePineIndicator = useCallback((indicator: CustomPineIndicator) => {
    setSavedPineIndicators((prev) => {
      const idx = prev.findIndex((p) => p.id === indicator.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = indicator;
        return updated;
      }
      return [indicator, ...prev];
    });
  }, []);

  const handleDeleteSavedPineIndicator = useCallback((id: string) => {
    setSavedPineIndicators((prev) => prev.filter((ind) => ind.id !== id));
  }, []);

  const handleSavePineInputs = useCallback((indicatorId: string, updatedInputs: Record<string, any>) => {
    setCustomPineIndicators((prev) =>
      prev.map((ind) =>
        ind.id === indicatorId ? { ...ind, inputValues: updatedInputs } : ind
      )
    );
    setSavedPineIndicators((prev) =>
      prev.map((ind) =>
        ind.id === indicatorId ? { ...ind, inputValues: updatedInputs } : ind
      )
    );
  }, []);

  const handleTogglePineAlert = useCallback((alertId: string) => {
    setPineAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, sound: !a.sound } : a))
    );
  }, []);

  const handleDeletePineAlert = useCallback((alertId: string) => {
    setPineAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  // Auto-dismiss alert toast after 6 seconds
  useEffect(() => {
    if (!activeAlertToast) return;
    const timer = setTimeout(() => {
      setActiveAlertToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeAlertToast]);

  // Historical Bar Replay state
  const [isReplaying, setIsReplaying] = useState(false);
  const [isSelectingReplayPoint, setIsSelectingReplayPoint] = useState(false);
  const [selectedReplayTimestamp, setSelectedReplayTimestamp] = useState<number | null>(null);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayMax, setReplayMax] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1); // 1x

  // Free Chart Movement & Auto-Follow mode
  // DEFAULT IS FREE MOVEMENT (autoFollow = false)
  const [autoFollow, setAutoFollow] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cchart_auto_follow');
      return saved === 'true'; // Default is false (Free Movement mode)
    } catch {
      return false;
    }
  });
  const [isScrolledAway, setIsScrolledAway] = useState<boolean>(false);

  // DOM Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);

  // Internal mutable engine state
  const engineRef = useRef<{
    masterHistoricalBars: Bar[];
    rawBars: Bar[];
    isReplaying: boolean;
    replayCursor: number;
    replayStartCursor: number;
    replayTimer: any;
    view: { n: number; off: number };
    verticalZoom: number;
    verticalPan: number;
    autoFollow: boolean;
    isDraggingPriceScale: boolean;
    priceDragStartY: number;
    priceDragStartZoom: number;
    isDraggingTimeScale: boolean;
    timeScaleStartX: number;
    timeScaleStartN: number;
    mainChartHeight: number;
    mainChartWidth: number;
    pricePerPx: number;
    crosshair: { x: number; y: number } | null;
    drag: {
      startX: number;
      startY: number;
      startOff: number;
      startPan: number;
      pricePerPx: number;
    } | null;
    pinchDist: number;
    activePointers: Map<number, { x: number; y: number }>;
    activeDrawingDraft: DrawingItem | null;
    coordMapper: ChartCoordinateMapper | null;
    unsubscribeLive: (() => void) | null;
    pointerDownPos: { x: number; y: number } | null;
    hoveredCandleIndex: number | null;
    indicatorCache: Map<string, any>;
    pineCache: Map<string, any>;
    lastInfoHtml: string;
  }>({
    masterHistoricalBars: [],
    rawBars: [],
    isReplaying: false,
    replayCursor: 0,
    replayStartCursor: 0,
    replayTimer: null,
    view: {
      n: (() => {
        try {
          const saved = localStorage.getItem('cchart_zoom_n');
          if (saved) {
            const v = Number(saved);
            if (v >= 12 && v <= 500) return v;
          }
        } catch {
          // ignore
        }
        return 100;
      })(),
      off: 0,
    },
    verticalZoom: 1.0,
    verticalPan: 0,
    autoFollow: false,
    isDraggingPriceScale: false,
    priceDragStartY: 0,
    priceDragStartZoom: 1.0,
    isDraggingTimeScale: false,
    timeScaleStartX: 0,
    timeScaleStartN: 100,
    mainChartHeight: 500,
    mainChartWidth: 800,
    pricePerPx: 0.05,
    crosshair: null,
    drag: null,
    pinchDist: 0,
    activePointers: new Map(),
    activeDrawingDraft: null,
    coordMapper: null,
    unsubscribeLive: null,
    pointerDownPos: null,
    hoveredCandleIndex: null,
    indicatorCache: new Map(),
    pineCache: new Map(),
    lastInfoHtml: '',
  });

  // Load drawings from localStorage when symbol/tf changes
  useEffect(() => {
    const loaded = loadSavedDrawings(sym, tf);
    setDrawings(loaded);
  }, [sym, tf]);

  // Authoritative data retrieval: STRICT REPLAY CUTOFF
  // Ensures the visible dataset contains ONLY candles up to replayCursor during replay.
  const getEffectiveBars = useCallback((): Bar[] => {
    const engine = engineRef.current;
    let base: Bar[];

    if (isSelectingReplayPoint) {
      // In candle selection mode, show full master historical dataset so the user can choose any starting candle
      base = engine.masterHistoricalBars.length ? engine.masterHistoricalBars : engine.rawBars;
    } else if (engine.isReplaying) {
      // REPLAY MODE: Filter dataset to only contain candles from 0 to replayCursor!
      // ALL future candles (from replayCursor + 1 to end) are strictly hidden from the dataset!
      const cutoff = Math.max(0, Math.min(engine.masterHistoricalBars.length, engine.replayCursor + 1));
      base = engine.masterHistoricalBars.slice(0, cutoff);
    } else {
      // Live / Normal mode
      base = engine.masterHistoricalBars.length ? engine.masterHistoricalBars : engine.rawBars;
    }

    if (!base || !base.length) return [];
    if (chartType === 'heikinAshi') {
      return calculateHeikinAshi(base);
    }
    if (chartType === 'renko') {
      return calculateRenko(base);
    }
    return base;
  }, [isSelectingReplayPoint, chartType]);

  // Main Canvas Render Loop
  const renderChart = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    ctx.clearRect(0, 0, W, H);

    const engine = engineRef.current;
    const bars = getEffectiveBars();

    const lastBar = bars[bars.length - 1];
    const dataSig = `${bars.length}_${lastBar?.t || 0}_${lastBar?.c || 0}`;

    // High performance calculation cache (cleared when exceeding 200 items to bound memory)
    const getCached = <T,>(key: string, computeFn: () => T): T => {
      const fullKey = `${key}_${dataSig}`;
      if (engine.indicatorCache.has(fullKey)) {
        return engine.indicatorCache.get(fullKey) as T;
      }
      if (engine.indicatorCache.size > 200) {
        engine.indicatorCache.clear();
      }
      const val = computeFn();
      engine.indicatorCache.set(fullKey, val);
      return val;
    };

    // 0. Execute active Pine Script indicators (with memory cache)
    const pineResults: { indicator: CustomPineIndicator; result: PineExecutionResult }[] = [];
    customPineIndicators
      .filter((ind) => ind.visible)
      .forEach((ind) => {
        try {
          const pineKey = `pine_${ind.id}_${ind.updatedAt}_${dataSig}_${JSON.stringify(ind.inputValues)}`;
          let result = engine.pineCache.get(pineKey);
          if (!result) {
            const exec = PineScriptRuntime.execute(
              ind.code,
              bars,
              ind.inputValues,
              sym,
              tf
            );
            result = exec.result;
            if (result) {
              engine.pineCache.set(pineKey, result);
            }
          }
          if (result) {
            pineResults.push({ indicator: ind, result });

            // Check for new alerts fired on latest bar
            if (result.alertsFired && result.alertsFired.length > 0) {
              const latestAlert = result.alertsFired[result.alertsFired.length - 1];
              if (
                !lastAlertFiredRef.current ||
                lastAlertFiredRef.current.time !== latestAlert.time ||
                lastAlertFiredRef.current.title !== latestAlert.title
              ) {
                lastAlertFiredRef.current = {
                  title: latestAlert.title,
                  time: latestAlert.time,
                };
                setActiveAlertToast({
                  id: `${latestAlert.time}_${Math.random()}`,
                  title: latestAlert.title,
                  message: latestAlert.message,
                  time: latestAlert.time,
                });
                playAlertChime();
              }
            }
          }
        } catch (err) {
          console.error('Pine execution error:', err);
        }
      });

    // Subpanels determination (standard indicators + pine subpanels)
    const subpanelIndicators = activeIndicators.filter(
      (ind) => ind.visible && ind.panel === 'subpanel'
    );
    const pineSubpanels = pineResults.filter((p) => !p.result.overlay);
    const pineOverlays = pineResults.filter((p) => p.result.overlay);

    const subpanelCount = subpanelIndicators.length + pineSubpanels.length;
    const subpanelHeight = subpanelCount > 0 ? Math.min(100, (H * 0.4) / subpanelCount) : 0;
    const totalSubpanelHeight = subpanelCount * subpanelHeight;

    const axisWidth = 65;
    const bottomAxisHeight = 22;
    const mainChartHeight = H - bottomAxisHeight - totalSubpanelHeight;
    const mainChartWidth = W - axisWidth;

    const n = Math.max(10, Math.round(engine.view.n));
    const end = Math.max(1, bars.length - Math.round(engine.view.off));
    const st = Math.max(0, end - n);
    const visibleBars = bars.slice(st, end);

    if (!visibleBars.length) {
      if (infoRef.current) {
        infoRef.current.innerHTML = `<b>${sym}</b> ${tf} <span style="color:#26a69a">${statusText}</span>`;
      }
      return;
    }

    // Price scaling
    let hi = -Infinity;
    let lo = Infinity;
    for (let i = 0; i < visibleBars.length; i++) {
      const b = visibleBars[i];
      if (b.h > hi) hi = b.h;
      if (b.l < lo) lo = b.l;
    }
    const pad = (hi - lo) * 0.08 || 1;
    hi += pad;
    lo -= pad;

    // Apply interactive vertical scale factor & pan from engine
    const vZoom = engine.verticalZoom || 1.0;
    const vPan = engine.verticalPan || 0;
    const midPrice = (hi + lo) / 2 + vPan;
    const halfSpan = ((hi - lo) / 2) * vZoom;
    hi = midPrice + halfSpan;
    lo = midPrice - halfSpan;

    engine.mainChartHeight = mainChartHeight;
    engine.mainChartWidth = mainChartWidth;
    engine.pricePerPx = (hi - lo) / Math.max(1, mainChartHeight);

    const barWidth = mainChartWidth / n;

    // Coordinate Mappings
    const X = (idx: number) => (idx - st + 0.5) * barWidth;
    const Y = (p: number) => mainChartHeight * (1 - (p - lo) / (hi - lo));
    const P = (y: number) => lo + (1 - y / mainChartHeight) * (hi - lo);

    // Fast O(log N) Binary Search for time-to-X mapping
    const timeToX = (t: number) => {
      let low = 0;
      let high = bars.length - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (bars[mid].t < t) low = mid + 1;
        else high = mid - 1;
      }
      const idx = Math.min(bars.length - 1, Math.max(0, low));
      return X(idx);
    };

    const mapper: ChartCoordinateMapper = {
      timeToX,
      priceToY: Y,
      xToTime: (x: number) => {
        const barIdx = Math.min(
          bars.length - 1,
          Math.max(0, Math.round(st + x / barWidth - 0.5))
        );
        return bars[barIdx]?.t || 0;
      },
      yToPrice: P,
      chartWidth: mainChartWidth,
      chartHeight: mainChartHeight,
    };
    engine.coordMapper = mapper;

    // 1. Grid Lines & Axis Labels
    ctx.font = '11px system-ui, sans-serif';
    ctx.strokeStyle = '#202a36';
    ctx.fillStyle = '#7d8b9a';
    ctx.lineWidth = 1;

    // Horizontal Price Grid
    for (let k = 0; k <= 6; k++) {
      const y = (mainChartHeight * k) / 6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mainChartWidth, y);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillText(P(y).toFixed(2), mainChartWidth + 6, y + 4);
    }

    // Vertical Time Grid
    const step = Math.ceil(n / 6);
    for (let i = st; i < end; i += step) {
      const x = X(i);
      const d = new Date(bars[i].t * 1000);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mainChartHeight);
      ctx.stroke();

      ctx.textAlign = 'center';
      const timeLabel =
        TF_SECONDS[tf] >= 86400
          ? `${d.getMonth() + 1}/${d.getDate()}`
          : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      ctx.fillText(timeLabel, x, H - totalSubpanelHeight - 5);
    }

    // 2. Volume Profile (VRVP) if active (cached by visible range and parameters)
    const vpInd = activeIndicators.find((ind) => ind.defId === 'vp' && ind.visible);
    if (vpInd) {
      const vpKey = `vp_${st}_${end}_${vpInd.params.bins || 40}_${vpInd.params.valueArea || 70}`;
      const vpData: VolumeProfileData = getCached(vpKey, () =>
        calculateVolumeProfile(
          visibleBars,
          vpInd.params.bins || 40,
          vpInd.params.valueArea || 70
        )
      );

      ctx.fillStyle = vpInd.color || 'rgba(240, 180, 41, 0.25)';
      vpData.bins.forEach((bin) => {
        const binH = (mainChartHeight / vpData.bins.length) * 0.9;
        const binW = (bin.vol / (vpData.maxBinVolume || 1)) * (mainChartWidth * 0.25);
        const y = Y(bin.price);
        ctx.fillRect(0, y - binH / 2, binW, binH);
      });

      // POC Line (Red)
      if (vpInd.params.showPoc !== false && vpData.pocPrice) {
        ctx.strokeStyle = '#ef5350';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        const pocY = Y(vpData.pocPrice);
        ctx.beginPath();
        ctx.moveTo(0, pocY);
        ctx.lineTo(mainChartWidth, pocY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef5350';
        ctx.fillRect(mainChartWidth, pocY - 8, axisWidth, 16);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(`POC ${vpData.pocPrice.toFixed(2)}`, mainChartWidth + 3, pocY + 4);
      }
    }

    // 3. Candle Rendering
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, mainChartWidth, mainChartHeight);
    ctx.clip();

    if (chartType === 'line') {
      ctx.strokeStyle = '#4aa3ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      visibleBars.forEach((b, i) => {
        const x = X(st + i);
        if (i === 0) ctx.moveTo(x, Y(b.c));
        else ctx.lineTo(x, Y(b.c));
      });
      ctx.stroke();
    } else if (chartType === 'area') {
      ctx.strokeStyle = '#4aa3ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      visibleBars.forEach((b, i) => {
        const x = X(st + i);
        if (i === 0) ctx.moveTo(x, Y(b.c));
        else ctx.lineTo(x, Y(b.c));
      });
      ctx.stroke();
      ctx.lineTo(X(end - 1), mainChartHeight);
      ctx.lineTo(X(st), mainChartHeight);
      ctx.fillStyle = 'rgba(74, 163, 255, 0.15)';
      ctx.fill();
    } else if (chartType === 'bars') {
      // OHLC Bars
      visibleBars.forEach((b, i) => {
        const x = X(st + i);
        const isUp = b.c >= b.o;
        ctx.strokeStyle = isUp ? '#26a69a' : '#ef5350';
        ctx.lineWidth = 1.5;

        // High to Low bar
        ctx.beginPath();
        ctx.moveTo(x, Y(b.h));
        ctx.lineTo(x, Y(b.l));
        // Open tick left
        ctx.moveTo(x - barWidth * 0.35, Y(b.o));
        ctx.lineTo(x, Y(b.o));
        // Close tick right
        ctx.moveTo(x, Y(b.c));
        ctx.lineTo(x + barWidth * 0.35, Y(b.c));
        ctx.stroke();
      });
    } else {
      // Standard Candlesticks / Heikin Ashi / Renko
      visibleBars.forEach((b, i) => {
        const x = X(st + i);
        const isUp = b.c >= b.o;
        ctx.strokeStyle = ctx.fillStyle = isUp ? '#26a69a' : '#ef5350';

        // Wicks
        ctx.beginPath();
        ctx.moveTo(x, Y(b.h));
        ctx.lineTo(x, Y(b.l));
        ctx.stroke();

        // Candle Body
        const yTop = Y(Math.max(b.o, b.c));
        const bodyHeight = Math.max(1, Math.abs(Y(b.o) - Y(b.c)));
        ctx.fillRect(x - barWidth * 0.35, yTop, barWidth * 0.7, bodyHeight);
      });
    }

    // 4. Overlay Indicators (High Performance Cached)
    const closeSeries = bars.map((b) => b.c);

    activeIndicators
      .filter((ind) => ind.visible && ind.panel === 'overlay')
      .forEach((ind) => {
        ctx.strokeStyle = ind.color;
        ctx.lineWidth = ind.lineWidth || 1.5;

        if (ind.defId === 'sma') {
          const values = getCached(`sma_${ind.params.period || 20}`, () =>
            sma(closeSeries, ind.params.period || 20)
          );
          drawOverlayLine(ctx, values, st, end, X, Y);
        } else if (ind.defId === 'ema') {
          const values = getCached(`ema_${ind.params.period || 50}`, () =>
            ema(closeSeries, ind.params.period || 50)
          );
          drawOverlayLine(ctx, values, st, end, X, Y);
        } else if (ind.defId === 'wma') {
          const values = getCached(`wma_${ind.params.period || 20}`, () =>
            wma(closeSeries, ind.params.period || 20)
          );
          drawOverlayLine(ctx, values, st, end, X, Y);
        } else if (ind.defId === 'vwma') {
          const values = getCached(`vwma_${ind.params.period || 20}`, () =>
            vwma(bars, ind.params.period || 20)
          );
          drawOverlayLine(ctx, values, st, end, X, Y);
        } else if (ind.defId === 'hma') {
          const values = getCached(`hma_${ind.params.period || 9}`, () =>
            hma(closeSeries, ind.params.period || 9)
          );
          drawOverlayLine(ctx, values, st, end, X, Y);
        } else if (ind.defId === 'dema') {
          const values = getCached(`dema_${ind.params.period || 21}`, () =>
            dema(closeSeries, ind.params.period || 21)
          );
          drawOverlayLine(ctx, values, st, end, X, Y);
        } else if (ind.defId === 'tema') {
          const values = getCached(`tema_${ind.params.period || 21}`, () =>
            tema(closeSeries, ind.params.period || 21)
          );
          drawOverlayLine(ctx, values, st, end, X, Y);
        } else if (ind.defId === 'vwap') {
          const values = getCached('vwap', () => vwap(bars));
          drawOverlayLine(ctx, values, st, end, X, Y);
        } else if (ind.defId === 'supertrend') {
          const res = getCached(
            `st_${ind.params.period || 10}_${ind.params.multiplier || 3}`,
            () => supertrend(bars, ind.params.period || 10, ind.params.multiplier || 3)
          );
          ctx.strokeStyle = ind.params.upColor || '#26a69a';
          drawOverlayLine(ctx, res.up, st, end, X, Y);
          ctx.strokeStyle = ind.params.dnColor || '#ef5350';
          drawOverlayLine(ctx, res.dn, st, end, X, Y);
        } else if (ind.defId === 'bb') {
          const res = getCached(
            `bb_${ind.params.period || 20}_${ind.params.stdDev || 2}`,
            () =>
              bollingerBands(
                closeSeries,
                ind.params.period || 20,
                ind.params.stdDev || 2
              )
          );
          ctx.strokeStyle = ind.color;
          drawOverlayLine(ctx, res.middle, st, end, X, Y);
          drawOverlayLine(ctx, res.upper, st, end, X, Y);
          drawOverlayLine(ctx, res.lower, st, end, X, Y);
        } else if (ind.defId === 'donchian') {
          const res = getCached(`donchian_${ind.params.period || 20}`, () =>
            donchianChannels(bars, ind.params.period || 20)
          );
          drawOverlayLine(ctx, res.upper, st, end, X, Y);
          drawOverlayLine(ctx, res.lower, st, end, X, Y);
          drawOverlayLine(ctx, res.middle, st, end, X, Y);
        } else if (ind.defId === 'keltner') {
          const res = getCached(
            `keltner_${ind.params.emaPeriod || 20}_${ind.params.atrPeriod || 10}_${ind.params.multiplier || 2}`,
            () =>
              keltnerChannels(
                bars,
                ind.params.emaPeriod || 20,
                ind.params.atrPeriod || 10,
                ind.params.multiplier || 2
              )
          );
          drawOverlayLine(ctx, res.middle, st, end, X, Y);
          drawOverlayLine(ctx, res.upper, st, end, X, Y);
          drawOverlayLine(ctx, res.lower, st, end, X, Y);
        } else if (ind.defId === 'psar') {
          const values = getCached(
            `psar_${ind.params.step || 0.02}_${ind.params.maxStep || 0.2}`,
            () =>
              parabolicSar(
                bars,
                ind.params.step || 0.02,
                ind.params.maxStep || 0.2
              )
          );
          for (let i = st; i < end; i++) {
            if (values[i] != null) {
              ctx.fillStyle = ind.color || '#54a0ff';
              ctx.beginPath();
              ctx.arc(X(i), Y(values[i] as number), 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      });

    // 4b. Pine Script Overlay Plots and Shapes
    pineOverlays.forEach(({ indicator, result }) => {
      // Background colors
      if (result.bgColors) {
        visibleBars.forEach((_, i) => {
          const bgCol = result.bgColors[st + i];
          if (bgCol) {
            ctx.fillStyle = bgCol;
            ctx.fillRect(X(st + i) - barWidth * 0.5, 0, barWidth, mainChartHeight);
          }
        });
      }

      // Plots
      result.plots.forEach((plot) => {
        ctx.strokeStyle = plot.def.color || '#f0b429';
        ctx.lineWidth = plot.def.lineWidth || 1.5;
        drawOverlayLine(ctx, plot.values, st, end, X, Y);
      });

      // Hlines
      result.hlines.forEach((hl) => {
        ctx.strokeStyle = hl.color || '#7d8b9a';
        ctx.lineWidth = hl.lineWidth || 1;
        if (hl.linestyle === 'dashed') ctx.setLineDash([4, 2]);
        else if (hl.linestyle === 'dotted') ctx.setLineDash([2, 2]);
        else ctx.setLineDash([]);
        const yHl = Y(hl.price);
        ctx.beginPath();
        ctx.moveTo(0, yHl);
        ctx.lineTo(mainChartWidth, yHl);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Shapes (plotshape / buy/sell signals)
      result.shapes.forEach((shapeGroup) => {
        const sDef = shapeGroup.def;
        shapeGroup.items.forEach((item) => {
          if (item.barIndex >= st && item.barIndex < end) {
            const x = X(item.barIndex);
            let y = Y(item.price);
            if (sDef.location === 'belowbar') {
              y = Y(bars[item.barIndex].l) + 14;
            } else if (sDef.location === 'abovebar') {
              y = Y(bars[item.barIndex].h) - 14;
            }

            ctx.save();
            const shapeColor = item.color || sDef.color || '#26a69a';
            ctx.fillStyle = shapeColor;
            ctx.strokeStyle = shapeColor;

            if (sDef.style === 'triangleup') {
              ctx.beginPath();
              ctx.moveTo(x, y - 6);
              ctx.lineTo(x - 5, y + 4);
              ctx.lineTo(x + 5, y + 4);
              ctx.closePath();
              ctx.fill();
            } else if (sDef.style === 'triangledown') {
              ctx.beginPath();
              ctx.moveTo(x, y + 6);
              ctx.lineTo(x - 5, y - 4);
              ctx.lineTo(x + 5, y - 4);
              ctx.closePath();
              ctx.fill();
            } else if (sDef.style === 'circle') {
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fill();
            } else if (sDef.style === 'labelup' || sDef.style === 'labeldown') {
              const text = item.text || sDef.text || 'SIGNAL';
              ctx.font = 'bold 9px system-ui, sans-serif';
              const textW = ctx.measureText(text).width;
              ctx.fillRect(x - textW / 2 - 4, y - 7, textW + 8, 14);
              ctx.fillStyle = '#10151c';
              ctx.textAlign = 'center';
              ctx.fillText(text, x, y + 3);
            }

            // Signal text below or above triangle
            const badgeText = item.text || sDef.text;
            if ((sDef.style === 'triangleup' || sDef.style === 'triangledown') && badgeText) {
              ctx.font = 'bold 9px system-ui, sans-serif';
              ctx.fillStyle = shapeColor;
              ctx.textAlign = 'center';
              const textY = sDef.style === 'triangleup' ? y + 14 : y - 8;
              ctx.fillText(badgeText, x, textY);
            }
            ctx.restore();
          }
        });
      });
    });

    // 5. Drawings Rendering (filter future drawings during replay)
    const allDrawings = [...drawings];
    if (engine.activeDrawingDraft) {
      allDrawings.push(engine.activeDrawingDraft);
    }
    const permittedDrawings = engine.isReplaying && lastBar
      ? allDrawings.filter((d) => !d.points[0] || d.points[0].t <= lastBar.t)
      : allDrawings;
    permittedDrawings.forEach((drawItem) => {
      renderDrawing(ctx, drawItem, mapper, drawItem.id === selectedDrawingId);
    });

    ctx.restore();

    // 6. Subpanels (Standard Oscillators + Pine Subpanels)
    subpanelIndicators.forEach((ind, pi) => {
      const topY = mainChartHeight + pi * subpanelHeight;
      renderSubpanel(
        ctx,
        ind,
        bars,
        st,
        end,
        topY,
        subpanelHeight,
        mainChartWidth,
        axisWidth,
        barWidth,
        X,
        getCached
      );
    });

    // Pine Script Subpanels
    pineSubpanels.forEach((pineSub, idx) => {
      const pi = subpanelIndicators.length + idx;
      const topY = mainChartHeight + pi * subpanelHeight;
      renderPineSubpanel(
        ctx,
        pineSub.indicator,
        pineSub.result,
        bars,
        st,
        end,
        topY,
        subpanelHeight,
        mainChartWidth,
        axisWidth,
        barWidth,
        X
      );
    });

    // 7. Replay Starting Point Marker (Vertical Gold Line & Badge)
    if (isReplaying && selectedReplayTimestamp) {
      const selIdx = bars.findIndex((b) => b.t === selectedReplayTimestamp);
      if (selIdx >= st && selIdx < end) {
        const x = X(selIdx);
        ctx.save();
        ctx.strokeStyle = '#f0b429';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mainChartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Start Badge at top
        const badgeW = 100;
        const bx = Math.max(2, Math.min(mainChartWidth - badgeW - 2, x - badgeW / 2));
        ctx.fillStyle = '#f0b429';
        ctx.fillRect(bx, 6, badgeW, 18);
        ctx.fillStyle = '#10151c';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📍 بداية الإعادة (Start)', bx + badgeW / 2, 19);
        ctx.restore();
      }
    }

    // 8. Replay Selection Mode Hover Guide (Cyan Line & Click Prompt)
    if (isSelectingReplayPoint && engine.hoveredCandleIndex != null) {
      const hIdx = engine.hoveredCandleIndex;
      if (hIdx >= st && hIdx < end) {
        const x = X(hIdx);
        const candle = bars[hIdx];
        ctx.save();
        ctx.strokeStyle = '#00d2d3';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mainChartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Candle Highlight Halo
        ctx.fillStyle = 'rgba(0, 210, 211, 0.25)';
        ctx.strokeStyle = '#00d2d3';
        ctx.lineWidth = 2;
        const yTop = Y(Math.max(candle.o, candle.c));
        const bodyHeight = Math.max(2, Math.abs(Y(candle.o) - Y(candle.c)));
        ctx.fillRect(x - barWidth * 0.45, yTop - 3, barWidth * 0.9, bodyHeight + 6);
        ctx.strokeRect(x - barWidth * 0.45, yTop - 3, barWidth * 0.9, bodyHeight + 6);

        // Tooltip Badge at top
        const badgeW = 210;
        const bx = Math.max(4, Math.min(mainChartWidth - badgeW - 4, x - badgeW / 2));
        ctx.fillStyle = '#00d2d3';
        ctx.fillRect(bx, 8, badgeW, 22);
        ctx.fillStyle = '#10151c';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📍 انقر لبدء الإعادة من هنا | Start Replay', bx + badgeW / 2, 23);
        ctx.restore();
      }
    }

    // 9. Last Price Line & Tag
    const lastVisibleBar = visibleBars[visibleBars.length - 1];
    if (lastVisibleBar) {
      const lastY = Y(lastVisibleBar.c);
      if (lastY >= 0 && lastY <= mainChartHeight) {
        ctx.strokeStyle = lastVisibleBar.c >= lastVisibleBar.o ? '#26a69a' : '#ef5350';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, lastY);
        ctx.lineTo(mainChartWidth, lastY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = lastVisibleBar.c >= lastVisibleBar.o ? '#26a69a' : '#ef5350';
        ctx.fillRect(mainChartWidth, lastY - 9, axisWidth, 18);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(lastVisibleBar.c.toFixed(2), mainChartWidth + 4, lastY + 4);
      }
    }

    // 10. Crosshair Cursor & Info Bar
    const cross = engine.crosshair;
    if (cross && cross.x < mainChartWidth && cross.y < mainChartHeight) {
      ctx.strokeStyle = '#7d8b9a';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cross.x, 0);
      ctx.lineTo(cross.x, mainChartHeight);
      ctx.moveTo(0, cross.y);
      ctx.lineTo(mainChartWidth, cross.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Crosshair Price Box
      ctx.fillStyle = '#222d3a';
      ctx.fillRect(mainChartWidth, cross.y - 9, axisWidth, 18);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(P(cross.y).toFixed(2), mainChartWidth + 4, cross.y + 4);
    }

    // Top Info Bar Stats
    const hoveredBar =
      cross && cross.x < mainChartWidth
        ? bars[Math.min(end - 1, Math.max(st, st + Math.floor(cross.x / barWidth)))]
        : lastBar;

    if (infoRef.current && hoveredBar) {
      const infoHtml = `<span class="font-bold text-white">${sym}</span> <span class="text-[#f0b429]">${tf}</span> <span style="color:#26a69a">${statusText}</span> &nbsp; O <span class="text-white">${hoveredBar.o.toFixed(2)}</span> H <span class="text-[#26a69a]">${hoveredBar.h.toFixed(2)}</span> L <span class="text-[#ef5350]">${hoveredBar.l.toFixed(2)}</span> C <b style="color:${hoveredBar.c >= hoveredBar.o ? '#26a69a' : '#ef5350'}">${hoveredBar.c.toFixed(2)}</b> Vol <span class="text-white">${hoveredBar.v.toLocaleString()}</span>`;
      if (engine.lastInfoHtml !== infoHtml) {
        engine.lastInfoHtml = infoHtml;
        infoRef.current.innerHTML = infoHtml;
      }
    }
  }, [
    getEffectiveBars,
    chartType,
    activeIndicators,
    customPineIndicators,
    drawings,
    selectedDrawingId,
    sym,
    tf,
    statusText,
    isReplaying,
    isSelectingReplayPoint,
    selectedReplayTimestamp,
    replayIndex,
    playAlertChime,
  ]);

  // Helper to draw indicator lines on overlay
  const drawOverlayLine = (
    ctx: CanvasRenderingContext2D,
    series: (number | null)[],
    st: number,
    end: number,
    X: (i: number) => number,
    Y: (p: number) => number
  ) => {
    ctx.beginPath();
    let started = false;
    for (let i = st; i < end; i++) {
      const val = series[i];
      if (val == null) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(X(i), Y(val));
        started = true;
      } else {
        ctx.lineTo(X(i), Y(val));
      }
    }
    ctx.stroke();
  };

  // Helper to render individual subpanel
  const renderSubpanel = (
    ctx: CanvasRenderingContext2D,
    ind: IndicatorInstance,
    bars: Bar[],
    st: number,
    end: number,
    topY: number,
    panelH: number,
    panelW: number,
    axisW: number,
    bw: number,
    X: (i: number) => number,
    getCached: <T,>(key: string, computeFn: () => T) => T
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, topY, panelW, panelH);
    ctx.clip();
    ctx.fillStyle = '#141b24';
    ctx.fillRect(0, topY, panelW, panelH);

    const closeSeries = bars.map((b) => b.c);
    let values: (number | null)[] = [];
    let minVal = 0;
    let maxVal = 100;

    if (ind.defId === 'rsi') {
      values = getCached(`sub_rsi_${ind.params.period || 14}`, () =>
        rsi(closeSeries, ind.params.period || 14)
      );
      minVal = 0;
      maxVal = 100;
      // Overbought / Oversold guides
      const y70 = topY + panelH * (1 - 70 / 100);
      const y30 = topY + panelH * (1 - 30 / 100);
      ctx.strokeStyle = '#2a3542';
      ctx.beginPath();
      ctx.moveTo(0, y70);
      ctx.lineTo(panelW, y70);
      ctx.moveTo(0, y30);
      ctx.lineTo(panelW, y30);
      ctx.stroke();
    } else if (ind.defId === 'macd') {
      const res = getCached(
        `sub_macd_${ind.params.fast || 12}_${ind.params.slow || 26}_${ind.params.signal || 9}`,
        () =>
          macd(
            closeSeries,
            ind.params.fast || 12,
            ind.params.slow || 26,
            ind.params.signal || 9
          )
      );
      values = res.macdLine;
      const valid = values.slice(st, end).filter((v) => v != null) as number[];
      if (valid.length) {
        minVal = Math.min(...valid) * 1.1;
        maxVal = Math.max(...valid) * 1.1;
      }
    } else if (ind.defId === 'stoch') {
      const res = getCached(
        `sub_stoch_${ind.params.periodK || 14}_${ind.params.smoothK || 3}_${ind.params.periodD || 3}`,
        () =>
          stochastic(
            bars,
            ind.params.periodK || 14,
            ind.params.smoothK || 3,
            ind.params.periodD || 3
          )
      );
      values = res.k;
      minVal = 0;
      maxVal = 100;
    } else if (ind.defId === 'atr') {
      values = getCached(`sub_atr_${ind.params.period || 14}`, () =>
        atr(bars, ind.params.period || 14)
      );
      const valid = values.slice(st, end).filter((v) => v != null) as number[];
      if (valid.length) {
        minVal = Math.min(...valid) * 0.9;
        maxVal = Math.max(...valid) * 1.1;
      }
    } else if (ind.defId === 'cvd') {
      values = getCached('sub_cvd', () => cumulativeVolumeDelta(bars));
      const valid = values.slice(st, end).filter((v) => v != null) as number[];
      if (valid.length) {
        minVal = Math.min(...valid);
        maxVal = Math.max(...valid);
      }
    }

    const YSub = (v: number) => topY + panelH * (1 - (v - minVal) / (maxVal - minVal || 1));

    // Plot Line
    ctx.strokeStyle = ind.color;
    ctx.lineWidth = ind.lineWidth || 1.4;
    ctx.beginPath();
    let started = false;
    for (let i = st; i < end; i++) {
      const val = values[i];
      if (val == null) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(X(i), YSub(val));
        started = true;
      } else {
        ctx.lineTo(X(i), YSub(val));
      }
    }
    ctx.stroke();

    ctx.restore();

    // Border & Title Tag
    ctx.strokeStyle = '#2a3542';
    ctx.strokeRect(0, topY, panelW, panelH);
    ctx.fillStyle = '#7d8b9a';
    ctx.textAlign = 'left';
    ctx.fillText(ind.name.toUpperCase(), 6, topY + 14);
  };

  // Helper to render custom Pine Script subpanels
  const renderPineSubpanel = (
    ctx: CanvasRenderingContext2D,
    ind: CustomPineIndicator,
    result: PineExecutionResult,
    bars: Bar[],
    st: number,
    end: number,
    topY: number,
    panelH: number,
    panelW: number,
    axisW: number,
    bw: number,
    X: (i: number) => number
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, topY, panelW, panelH);
    ctx.clip();
    ctx.fillStyle = '#141b24';
    ctx.fillRect(0, topY, panelW, panelH);

    // Collect valid plot values in range [st, end]
    let allVals: number[] = [];
    result.plots.forEach((p) => {
      const slice = p.values.slice(st, end).filter((v) => v != null && isFinite(v)) as number[];
      allVals = allVals.concat(slice);
    });
    result.hlines.forEach((hl) => {
      if (isFinite(hl.price)) allVals.push(hl.price);
    });

    let minVal = allVals.length ? Math.min(...allVals) : 0;
    let maxVal = allVals.length ? Math.max(...allVals) : 100;
    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }
    const range = maxVal - minVal;
    minVal -= range * 0.08;
    maxVal += range * 0.08;

    const YSub = (v: number) => topY + panelH * (1 - (v - minVal) / (maxVal - minVal || 1));

    // Hlines (thresholds e.g. 70/30)
    result.hlines.forEach((hl) => {
      ctx.strokeStyle = hl.color || '#7d8b9a';
      ctx.lineWidth = hl.lineWidth || 1;
      if (hl.linestyle === 'dashed') ctx.setLineDash([4, 2]);
      else if (hl.linestyle === 'dotted') ctx.setLineDash([2, 2]);
      else ctx.setLineDash([]);
      const yHl = YSub(hl.price);
      ctx.beginPath();
      ctx.moveTo(0, yHl);
      ctx.lineTo(panelW, yHl);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label on price axis
      ctx.fillStyle = hl.color || '#7d8b9a';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(hl.price.toString(), panelW + 4, yHl + 3);
    });

    // Plots
    result.plots.forEach((plot) => {
      ctx.strokeStyle = plot.def.color || '#4aa3ff';
      ctx.fillStyle = plot.def.color || '#4aa3ff';
      ctx.lineWidth = plot.def.lineWidth || 1.5;

      if (plot.def.style === 'histogram') {
        const zeroY = YSub(0);
        for (let i = st; i < end; i++) {
          const val = plot.values[i];
          if (val != null) {
            const x = X(i);
            const y = YSub(val);
            const h = zeroY - y;
            ctx.fillRect(x - bw * 0.3, Math.min(y, zeroY), bw * 0.6, Math.abs(h));
          }
        }
      } else {
        ctx.beginPath();
        let started = false;
        for (let i = st; i < end; i++) {
          const val = plot.values[i];
          if (val == null || !isFinite(val)) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(X(i), YSub(val));
            started = true;
          } else {
            ctx.lineTo(X(i), YSub(val));
          }
        }
        ctx.stroke();
      }
    });

    ctx.restore();

    // Border & Title Tag
    ctx.strokeStyle = '#2a3542';
    ctx.strokeRect(0, topY, panelW, panelH);
    ctx.fillStyle = '#f0b429';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${ind.name.toUpperCase()} [PINE]`, 6, topY + 14);

    // Min & Max on axis
    ctx.fillStyle = '#7d8b9a';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(maxVal.toFixed(1), panelW + 4, topY + 12);
    ctx.fillText(minVal.toFixed(1), panelW + 4, topY + panelH - 4);
  };

  // Scheduled requestAnimationFrame for 60/120fps smooth rendering
  const rafIdRef = useRef<number | null>(null);
  const renderChartRef = useRef<() => void>(() => {});

  useEffect(() => {
    renderChartRef.current = renderChart;
  });

  const scheduleRender = useCallback(() => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      renderChartRef.current();
    });
  }, []);

  // Trigger immediate render on any visual state change
  useEffect(() => {
    scheduleRender();
  }, [
    sym,
    tf,
    chartType,
    activeIndicators,
    customPineIndicators,
    drawings,
    selectedDrawingId,
    isReplaying,
    isSelectingReplayPoint,
    selectedReplayTimestamp,
    replayIndex,
    scheduleRender,
  ]);

  // Resize canvas to match pixel density
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    scheduleRender();
  }, [scheduleRender]);

  // Load Historical Data & Subscribe Live
  const initMarketData = useCallback(async () => {
    const engine = engineRef.current;
    if (engine.unsubscribeLive) {
      engine.unsubscribeLive();
      engine.unsubscribeLive = null;
    }
    if (engine.replayTimer) {
      clearInterval(engine.replayTimer);
      engine.replayTimer = null;
    }

    setStatusText('جارٍ تحميل البيانات التاريخية...');
    const res = await marketDataService.fetchHistoricalData(sym, tf);
    if (res.error) {
      setStatusText(res.error);
    } else {
      engine.masterHistoricalBars = res.bars;
      engine.rawBars = [...res.bars];
      engine.isReplaying = false;
      engine.replayCursor = res.bars.length - 1;
      engine.replayStartCursor = res.bars.length - 1;
      engine.indicatorCache.clear();
      engine.pineCache.clear();
      engine.view.off = 0;
      engine.verticalZoom = 1.0;
      engine.verticalPan = 0;
      setIsScrolledAway(false);
      setStatusText('● مباشر');
    }
    scheduleRender();

    // Subscribe to live websocket only if not in replay
    engine.unsubscribeLive = marketDataService.subscribeRealtime(
      sym,
      tf,
      (incomingBar) => {
        if (engine.isReplaying) return; // Strict lock: zero live bar injection during replay!
        const bars = engine.masterHistoricalBars;
        if (!bars.length) return;
        const last = bars[bars.length - 1];

        if (incomingBar.t === last.t) {
          bars[bars.length - 1] = incomingBar;
          engine.rawBars[engine.rawBars.length - 1] = incomingBar;
        } else if (incomingBar.t > last.t) {
          bars.push(incomingBar);
          engine.rawBars.push(incomingBar);
          // If in Free Movement mode (autoFollow === false) and the user has navigated back in history,
          // automatically increment view.off by 1 so the visible historical window remains 100% stationary!
          if (!engine.autoFollow && engine.view.off > 0) {
            engine.view.off += 1;
          }
        }
        scheduleRender();
      },
      (st) => {
        if (!engine.isReplaying) setStatusText(st);
      }
    );
  }, [sym, tf, scheduleRender]);

  // Dedicated Jump to Latest Live Candle (Auto-Follow / Return to Live)
  const handleJumpToLatest = useCallback(() => {
    const engine = engineRef.current;
    engine.view.off = 0;
    engine.verticalPan = 0;
    engine.verticalZoom = 1.0;
    engine.autoFollow = true;
    setAutoFollow(true);
    setIsScrolledAway(false);
    try {
      localStorage.setItem('cchart_auto_follow', 'true');
    } catch {
      // ignore
    }
    scheduleRender();
  }, [scheduleRender]);

  // Toggle Auto-Follow Live Mode vs Free Movement Mode
  const handleToggleAutoFollow = useCallback(() => {
    setAutoFollow((prev) => {
      const next = !prev;
      engineRef.current.autoFollow = next;
      if (next) {
        engineRef.current.view.off = 0;
        engineRef.current.verticalPan = 0;
        setIsScrolledAway(false);
        scheduleRender();
      }
      try {
        localStorage.setItem('cchart_auto_follow', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [scheduleRender]);

  // Load market data when symbol or timeframe changes (isolated from replay state)
  useEffect(() => {
    initMarketData();

    return () => {
      if (engineRef.current.unsubscribeLive) {
        engineRef.current.unsubscribeLive();
      }
      if (engineRef.current.replayTimer) {
        clearInterval(engineRef.current.replayTimer);
      }
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [initMarketData]);

  // Window resize handler
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // ----------------------------------------------------
  // HISTORICAL BAR REPLAY LOGIC
  // ----------------------------------------------------
  const handleReplayButtonClick = useCallback(() => {
    if (isSelectingReplayPoint) {
      setIsSelectingReplayPoint(false);
      engineRef.current.hoveredCandleIndex = null;
      setStatusText(isReplaying ? '⏮ وضع إعادة التشغيل التاريخي' : '● مباشر');
      scheduleRender();
    } else if (isReplaying) {
      exitReplay();
    } else {
      setIsSelectingReplayPoint(true);
      engineRef.current.hoveredCandleIndex = null;
      setStatusText('📍 حدد شمعة على الشارت لبدء إعادة التشغيل | Select a candle on the chart to start replay');
      scheduleRender();
    }
  }, [isSelectingReplayPoint, isReplaying, scheduleRender]);

  const cancelReplaySelection = useCallback(() => {
    setIsSelectingReplayPoint(false);
    engineRef.current.hoveredCandleIndex = null;
    setStatusText(isReplaying ? '⏮ وضع إعادة التشغيل التاريخي' : '● مباشر');
    scheduleRender();
  }, [isReplaying, scheduleRender]);

  const startReplayFromCandle = useCallback((candle: Bar) => {
    const engine = engineRef.current;

    // Disconnect live WebSocket so it cannot inject any new live bars into replay view
    if (engine.unsubscribeLive) {
      engine.unsubscribeLive();
      engine.unsubscribeLive = null;
    }

    if (engine.replayTimer) {
      clearInterval(engine.replayTimer);
      engine.replayTimer = null;
      setReplayPlaying(false);
    }

    // Capture full original historical dataset once if not already captured
    if (!engine.masterHistoricalBars.length && engine.rawBars.length) {
      engine.masterHistoricalBars = [...engine.rawBars];
    }
    const fullDataset = engine.masterHistoricalBars;
    if (!fullDataset.length) return;

    // Find the exact candle index in the master dataset
    const exactIndex = fullDataset.findIndex((b) => b.t === candle.t);
    const targetIdx = exactIndex !== -1 ? exactIndex : fullDataset.length - 1;

    // CRITICAL: Filter dataset to only contain candles from 0 to targetIdx
    // ALL candles occurring after targetIdx (targetIdx + 1 to end) are completely hidden
    engine.isReplaying = true;
    engine.replayCursor = targetIdx;
    engine.replayStartCursor = targetIdx;
    engine.rawBars = fullDataset.slice(0, targetIdx + 1);
    engine.indicatorCache.clear();
    engine.pineCache.clear();

    // Position view so selected candle is visible as the last available candle at right edge
    engine.view.off = 0;

    setIsSelectingReplayPoint(false);
    engine.hoveredCandleIndex = null;
    setIsReplaying(true);
    setSelectedReplayTimestamp(candle.t);
    setReplayIndex(targetIdx + 1);
    setReplayMax(fullDataset.length);
    setReplayPlaying(false);

    const d = new Date(candle.t * 1000);
    const formatted = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    setStatusText(`⏮ وضع الإعادة من: ${formatted} (شمعة ${targetIdx + 1}/${fullDataset.length})`);

    scheduleRender();
  }, [scheduleRender]);

  const exitReplay = useCallback(() => {
    const engine = engineRef.current;
    if (engine.replayTimer) {
      clearInterval(engine.replayTimer);
      engine.replayTimer = null;
    }
    engine.isReplaying = false;
    if (engine.masterHistoricalBars.length) {
      engine.rawBars = [...engine.masterHistoricalBars];
      engine.replayCursor = engine.masterHistoricalBars.length - 1;
    }
    engine.indicatorCache.clear();
    engine.pineCache.clear();

    setIsReplaying(false);
    setIsSelectingReplayPoint(false);
    setSelectedReplayTimestamp(null);
    setReplayPlaying(false);
    engine.hoveredCandleIndex = null;
    setStatusText('● مباشر');

    // Re-subscribe to live feed
    engine.unsubscribeLive = marketDataService.subscribeRealtime(
      sym,
      tf,
      (incomingBar) => {
        if (engine.isReplaying) return;
        const bars = engine.masterHistoricalBars;
        if (!bars.length) return;
        const last = bars[bars.length - 1];

        if (incomingBar.t === last.t) {
          bars[bars.length - 1] = incomingBar;
          engine.rawBars[engine.rawBars.length - 1] = incomingBar;
        } else if (incomingBar.t > last.t) {
          bars.push(incomingBar);
          engine.rawBars.push(incomingBar);
        }
        scheduleRender();
      },
      (st) => {
        if (!engine.isReplaying) setStatusText(st);
      }
    );
    scheduleRender();
  }, [sym, tf, scheduleRender]);

  const seekReplay = useCallback((targetIndex: number) => {
    const engine = engineRef.current;
    if (!engine.masterHistoricalBars.length) return;

    const clamped = Math.max(1, Math.min(engine.masterHistoricalBars.length, targetIndex));
    engine.replayCursor = clamped - 1;
    engine.rawBars = engine.masterHistoricalBars.slice(0, engine.replayCursor + 1);
    engine.view.off = 0;
    setReplayIndex(clamped);
    scheduleRender();
  }, [scheduleRender]);

  const stepReplayNext = useCallback(() => {
    const engine = engineRef.current;
    if (!engine.masterHistoricalBars.length) return;

    if (engine.replayCursor < engine.masterHistoricalBars.length - 1) {
      engine.replayCursor += 1;
      engine.rawBars = engine.masterHistoricalBars.slice(0, engine.replayCursor + 1);
      setReplayIndex(engine.replayCursor + 1);
      scheduleRender();
    } else {
      if (engine.replayTimer) {
        clearInterval(engine.replayTimer);
        engine.replayTimer = null;
      }
      setReplayPlaying(false);
    }
  }, [scheduleRender]);

  const stepReplayPrev = useCallback(() => {
    const engine = engineRef.current;
    if (!engine.masterHistoricalBars.length || engine.replayCursor <= 0) return;
    engine.replayCursor -= 1;
    engine.rawBars = engine.masterHistoricalBars.slice(0, engine.replayCursor + 1);
    setReplayIndex(engine.replayCursor + 1);
    scheduleRender();
  }, [scheduleRender]);

  const toggleReplayPlay = useCallback(() => {
    const engine = engineRef.current;
    if (!engine.masterHistoricalBars.length) return;

    if (replayPlaying) {
      if (engine.replayTimer) {
        clearInterval(engine.replayTimer);
        engine.replayTimer = null;
      }
      setReplayPlaying(false);
    } else {
      if (engine.replayTimer) {
        clearInterval(engine.replayTimer);
        engine.replayTimer = null;
      }
      setReplayPlaying(true);
      const intervalMs = Math.max(20, Math.round(1000 / replaySpeed));
      engine.replayTimer = setInterval(stepReplayNext, intervalMs);
    }
  }, [replayPlaying, replaySpeed, stepReplayNext]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setReplaySpeed(newSpeed);
    const engine = engineRef.current;
    if (replayPlaying && engine.replayTimer) {
      clearInterval(engine.replayTimer);
      const intervalMs = Math.max(20, Math.round(1000 / newSpeed));
      engine.replayTimer = setInterval(stepReplayNext, intervalMs);
    }
  }, [replayPlaying, stepReplayNext]);

  // Jump to specific historical date & time
  const handleJumpToHistoricalDate = async (timestamp: number) => {
    const engine = engineRef.current;
    let full = engine.masterHistoricalBars.length ? engine.masterHistoricalBars : engine.rawBars;

    // If target timestamp is before currently loaded bars, load older historical data
    if (full.length && timestamp < full[0].t) {
      setStatusText('جارٍ جلب البيانات التاريخية القديمة...');
      const res = await marketDataService.loadHistoricalBefore(sym, tf, full[0].t, 1000);
      full = res.totalBars;
      engine.masterHistoricalBars = full;
      engine.rawBars = full;
    }

    // Locate target candle and start replay from it
    const targetIdx = full.findIndex((b) => b.t >= timestamp);
    const chosenCandle = targetIdx !== -1 ? full[targetIdx] : full[full.length - 1];
    if (chosenCandle) {
      startReplayFromCandle(chosenCandle);
    }
  };

  // ----------------------------------------------------
  // INTERACTIVE CANVAS POINTER & TOUCH GESTURES
  // ----------------------------------------------------
  // ----------------------------------------------------
  // INTERACTIVE CANVAS POINTER & TOUCH GESTURES
  // ----------------------------------------------------
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement> | PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const pos = getCanvasPos(e);
    const engine = engineRef.current;
    engine.activePointers.set(e.pointerId, pos);
    engine.pointerDownPos = pos;

    const wrap = wrapRef.current;
    const mainChartWidth = engine.mainChartWidth || (wrap ? wrap.clientWidth - 65 : canvas.clientWidth - 65);
    const mainChartHeight = engine.mainChartHeight || (wrap ? wrap.clientHeight - 22 : canvas.clientHeight - 22);

    // Multi-touch pinch zoom for Android / mobile touchscreens
    if (engine.activePointers.size === 2) {
      const pts = [...engine.activePointers.values()];
      engine.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      engine.drag = null;
      engine.isDraggingPriceScale = false;
      engine.isDraggingTimeScale = false;
      engine.activeDrawingDraft = null;
      return;
    }

    // 1. Vertical Price Scale Dragging (clicking on the right price scale)
    if (pos.x >= mainChartWidth && pos.y < mainChartHeight) {
      engine.isDraggingPriceScale = true;
      engine.priceDragStartY = pos.y;
      engine.priceDragStartZoom = engine.verticalZoom || 1.0;
      engine.isDraggingTimeScale = false;
      engine.drag = null;
      return;
    }

    // 2. Bottom Time Scale Dragging (horizontal axis drag to zoom in/out)
    if (pos.y >= mainChartHeight && pos.y <= mainChartHeight + 24 && pos.x < mainChartWidth) {
      engine.isDraggingTimeScale = true;
      engine.timeScaleStartX = pos.x;
      engine.timeScaleStartN = engine.view.n;
      engine.isDraggingPriceScale = false;
      engine.drag = null;
      return;
    }

    // 3. Replay point selection mode
    if (isSelectingReplayPoint) {
      engine.drag = {
        startX: pos.x,
        startY: pos.y,
        startOff: engine.view.off,
        startPan: engine.verticalPan,
        pricePerPx: engine.pricePerPx || 0.05,
      };
      engine.crosshair = pos;
      scheduleRender();
      return;
    }

    // 4. Drawing tools mode
    if (activeTool !== 'crosshair' && activeTool !== 'cursor' && engine.coordMapper) {
      const time = engine.coordMapper.xToTime(pos.x);
      const price = engine.coordMapper.yToPrice(pos.y);

      if (activeTool === 'hline') {
        const newItem: DrawingItem = {
          id: `draw_${Date.now()}`,
          type: 'hline',
          points: [{ t: time, p: price }],
          color: '#f0b429',
          lineWidth: 1.5,
        };
        const nextDrawings = [...drawings, newItem];
        setDrawings(nextDrawings);
        persistDrawings(sym, tf, nextDrawings);
        setActiveTool('crosshair');
      } else if (activeTool === 'vline') {
        const newItem: DrawingItem = {
          id: `draw_${Date.now()}`,
          type: 'vline',
          points: [{ t: time, p: price }],
          color: '#f0b429',
          lineWidth: 1.5,
        };
        const nextDrawings = [...drawings, newItem];
        setDrawings(nextDrawings);
        persistDrawings(sym, tf, nextDrawings);
        setActiveTool('crosshair');
      } else {
        // Start multi-point drawing draft
        engine.activeDrawingDraft = {
          id: `draw_${Date.now()}`,
          type: activeTool,
          points: [
            { t: time, p: price },
            { t: time, p: price },
          ],
          color: '#f0b429',
          lineWidth: 1.5,
        };
      }
    } else {
      // 5. Default 2D Free Movement Dragging (Horizontal Time Scroll + Vertical Price Pan)
      engine.drag = {
        startX: pos.x,
        startY: pos.y,
        startOff: engine.view.off,
        startPan: engine.verticalPan,
        pricePerPx: engine.pricePerPx || 0.05,
      };
    }

    engine.crosshair = pos;
    scheduleRender();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    const pos = getCanvasPos(e);
    engine.crosshair = pos;

    if (engine.activePointers.has(e.pointerId)) {
      engine.activePointers.set(e.pointerId, pos);
    }

    const wrap = wrapRef.current;
    if (!wrap) return;

    const mainChartWidth = engine.mainChartWidth || (wrap.clientWidth - 65);
    const mainChartHeight = engine.mainChartHeight || (wrap.clientHeight - 22);

    // Multi-touch smooth pinch zoom for Android tablets / phones
    if (engine.activePointers.size === 2) {
      const pts = [...engine.activePointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (engine.pinchDist > 0 && dist > 0) {
        const ratio = engine.pinchDist / dist;
        const oldN = engine.view.n;
        const newN = Math.min(500, Math.max(12, oldN * ratio));
        const midX = (pts[0].x + pts[1].x) / 2;
        const frac = Math.max(0, Math.min(1, midX / mainChartWidth));
        engine.view.off = Math.max(
          0,
          engine.view.off - (newN - oldN) * (1 - frac)
        );
        engine.view.n = newN;
        try {
          localStorage.setItem('cchart_zoom_n', String(Math.round(newN)));
        } catch {
          // ignore
        }
      }
      engine.pinchDist = dist;
      scheduleRender();
      return;
    }

    // 1. Vertical Price Scale Dragging
    if (engine.isDraggingPriceScale) {
      const dy = pos.y - engine.priceDragStartY;
      engine.verticalZoom = Math.max(0.05, Math.min(20, engine.priceDragStartZoom * (1 + dy * 0.005)));
      scheduleRender();
      return;
    }

    // 2. Bottom Time Scale Dragging (horizontal axis drag to zoom)
    if (engine.isDraggingTimeScale) {
      const dx = pos.x - engine.timeScaleStartX;
      const newN = Math.max(12, Math.min(500, engine.timeScaleStartN * (1 - dx * 0.004)));
      engine.view.n = newN;
      try {
        localStorage.setItem('cchart_zoom_n', String(Math.round(newN)));
      } catch {
        // ignore
      }
      scheduleRender();
      return;
    }

    // Update hovered candle indicator during Replay Selection Mode
    if (isSelectingReplayPoint) {
      const fullDataset = engine.masterHistoricalBars.length ? engine.masterHistoricalBars : engine.rawBars;
      if (pos.x < mainChartWidth && pos.y < mainChartHeight && fullDataset.length > 0) {
        const n = Math.max(10, Math.round(engine.view.n));
        const end = Math.max(1, fullDataset.length - Math.round(engine.view.off));
        const st = Math.max(0, end - n);
        const barWidth = mainChartWidth / n;
        const hIdx = Math.min(end - 1, Math.max(st, Math.floor(st + pos.x / barWidth)));
        engine.hoveredCandleIndex = hIdx;
      } else {
        engine.hoveredCandleIndex = null;
      }

      if (engine.drag) {
        const activeBars = getEffectiveBars();
        const barW = mainChartWidth / engine.view.n;
        const dx = pos.x - engine.drag.startX;
        engine.view.off = Math.max(
          0,
          Math.min(
            Math.max(0, activeBars.length - engine.view.n),
            engine.drag.startOff + dx / barW
          )
        );
      }
      scheduleRender();
      return;
    }

    // Active Drawing Draft
    if (engine.activeDrawingDraft && engine.coordMapper) {
      const time = engine.coordMapper.xToTime(pos.x);
      const price = engine.coordMapper.yToPrice(pos.y);
      engine.activeDrawingDraft.points[1] = { t: time, p: price };
      scheduleRender();
      return;
    }

    // 3. Default 2D Free Movement Dragging (Horizontal Time Scroll + Vertical Price Pan)
    if (engine.drag) {
      const activeBars = getEffectiveBars();
      const barW = mainChartWidth / engine.view.n;
      const dx = pos.x - engine.drag.startX;
      const dy = pos.y - engine.drag.startY;

      // When user starts moving the chart, immediately turn off auto-follow
      if (Math.hypot(dx, dy) > 3) {
        if (engine.autoFollow) {
          engine.autoFollow = false;
          setAutoFollow(false);
          try {
            localStorage.setItem('cchart_auto_follow', 'false');
          } catch {
            // ignore
          }
        }
      }

      // Horizontal time panning
      engine.view.off = Math.max(
        0,
        Math.min(
          Math.max(0, activeBars.length - engine.view.n),
          engine.drag.startOff + dx / barW
        )
      );

      // Vertical price panning
      engine.verticalPan = engine.drag.startPan + dy * engine.drag.pricePerPx;

      const scrolledAway = engine.view.off > 0.5 || Math.abs(engine.verticalPan) > 1;
      setIsScrolledAway(scrolledAway);
    }

    scheduleRender();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    engine.activePointers.delete(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const pos = getCanvasPos(e);
    const downPos = engine.pointerDownPos;
    engine.pointerDownPos = null;
    engine.isDraggingPriceScale = false;
    engine.isDraggingTimeScale = false;

    // Detect Click / Tap in Replay Selection Mode
    if (isSelectingReplayPoint && downPos && wrapRef.current) {
      const dist = Math.hypot(pos.x - downPos.x, pos.y - downPos.y);
      const mainChartWidth = engine.mainChartWidth || (wrapRef.current.clientWidth - 65);
      const mainChartHeight = engine.mainChartHeight || (wrapRef.current.clientHeight - 22);

      // Click must be on chart body, NOT on price scale or indicator panel
      if (dist < 12 && pos.x < mainChartWidth && pos.y < mainChartHeight) {
        const fullDataset = engine.masterHistoricalBars.length ? engine.masterHistoricalBars : engine.rawBars;
        const n = Math.max(10, Math.round(engine.view.n));
        const end = Math.max(1, fullDataset.length - Math.round(engine.view.off));
        const st = Math.max(0, end - n);
        const barWidth = mainChartWidth / n;
        const visibleIdx = Math.min(end - 1, Math.max(st, Math.floor(st + pos.x / barWidth)));
        const candle = fullDataset[visibleIdx];

        if (candle) {
          startReplayFromCandle(candle);
          return;
        }
      }
    }

    if (engine.activeDrawingDraft) {
      const nextDrawings = [...drawings, engine.activeDrawingDraft];
      setDrawings(nextDrawings);
      persistDrawings(sym, tf, nextDrawings);
      engine.activeDrawingDraft = null;
      setActiveTool('crosshair');
    }

    const scrolledAway = engine.view.off > 0.5 || Math.abs(engine.verticalPan) > 1;
    setIsScrolledAway(scrolledAway);

    engine.drag = null;
    engine.pinchDist = 0;
    if (e.pointerType !== 'mouse') {
      engine.crosshair = null;
    }
    scheduleRender();
  };

  // Double Click / Double Tap Handler to Reset Autoscale or Viewport
  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e as unknown as React.PointerEvent<HTMLCanvasElement>);
    const wrap = wrapRef.current;
    const mainChartWidth = engineRef.current.mainChartWidth || (wrap ? wrap.clientWidth - 65 : 300);
    const engine = engineRef.current;

    if (pos.x >= mainChartWidth) {
      // Double click on price axis: reset vertical price scale & vertical pan
      engine.verticalZoom = 1.0;
      engine.verticalPan = 0;
    } else {
      // Double click on chart body: reset horizontal offset, default zoom, & vertical pan
      engine.view.off = 0;
      engine.view.n = 100;
      engine.verticalZoom = 1.0;
      engine.verticalPan = 0;
      setIsScrolledAway(false);
      try {
        localStorage.setItem('cchart_zoom_n', '100');
      } catch {
        // ignore
      }
    }
    scheduleRender();
  };

  // Desktop Mouse Wheel Zoom (centered around cursor position)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const posX = e.clientX - rect.left;
      const wrap = wrapRef.current;
      const mainChartWidth = (wrap ? wrap.clientWidth : canvas.clientWidth) - 65;

      const engine = engineRef.current;
      const factor = e.deltaY > 0 ? 1.09 : 0.91;
      const oldN = engine.view.n;
      const newN = Math.min(500, Math.max(12, oldN * factor));

      if (posX > 0 && posX < mainChartWidth) {
        const ratio = posX / mainChartWidth;
        const deltaBars = newN - oldN;
        const activeBars = engine.isReplaying ? engine.replayCursor + 1 : engine.masterHistoricalBars.length;
        engine.view.off = Math.max(
          0,
          Math.min(
            Math.max(0, activeBars - newN),
            engine.view.off - deltaBars * (1 - ratio)
          )
        );
      }
      engine.view.n = newN;
      try {
        localStorage.setItem('cchart_zoom_n', String(Math.round(newN)));
      } catch {
        // ignore
      }
      scheduleRender();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [scheduleRender]);

  // Indicators management
  const handleAddIndicator = (def: any) => {
    const defaultParams: Record<string, any> = {};
    def.params.forEach((p: any) => {
      defaultParams[p.id] = p.default;
    });

    const newInst: IndicatorInstance = {
      instanceId: `${def.id}_${Date.now()}`,
      defId: def.id,
      name: def.name,
      panel: def.panel,
      visible: true,
      params: defaultParams,
      color: def.params.find((p: any) => p.type === 'color')?.default || '#f0b429',
      lineWidth: 1.5,
    };
    setActiveIndicators([...activeIndicators, newInst]);
    setIsIndicatorModalOpen(false);
  };

  const handleToggleIndicatorVisibility = (id: string) => {
    setActiveIndicators(
      activeIndicators.map((ind) =>
        ind.instanceId === id ? { ...ind, visible: !ind.visible } : ind
      )
    );
  };

  const handleRemoveIndicator = (id: string) => {
    setActiveIndicators(activeIndicators.filter((ind) => ind.instanceId !== id));
  };

  const handleSaveIndicatorSettings = (updated: IndicatorInstance) => {
    setActiveIndicators(
      activeIndicators.map((ind) => (ind.instanceId === updated.instanceId ? updated : ind))
    );
  };

  // Drawings Management
  const handleClearAllDrawings = () => {
    setDrawings([]);
    persistDrawings(sym, tf, []);
    renderChart();
  };

  const handleToggleDrawingVisibility = (id: string) => {
    const next = drawings.map((d) => (d.id === id ? { ...d, visible: !d.visible } : d));
    setDrawings(next);
    persistDrawings(sym, tf, next);
  };

  const handleToggleDrawingLock = (id: string) => {
    const next = drawings.map((d) => (d.id === id ? { ...d, locked: !d.locked } : d));
    setDrawings(next);
    persistDrawings(sym, tf, next);
  };

  const handleRemoveDrawing = (id: string) => {
    const next = drawings.filter((d) => d.id !== id);
    setDrawings(next);
    persistDrawings(sym, tf, next);
  };

  const activeBars = getEffectiveBars();
  const lastBar = activeBars[activeBars.length - 1];
  const firstBar = activeBars[0];
  const dayChange =
    lastBar && firstBar && firstBar.o > 0
      ? ((lastBar.c - firstBar.o) / firstBar.o) * 100
      : 0;

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden bg-[#10151c] text-[#d5dde6]">
      {/* Top Professional Toolbar */}
      <TopToolbar
        currentSymbol={sym}
        currentTimeframe={tf}
        currentChartType={chartType}
        onSelectSymbol={(newSym) => setSym(newSym)}
        onSelectTimeframe={(newTf) => setTf(newTf)}
        onSelectChartType={(type) => setChartType(type)}
        onOpenIndicators={() => setIsIndicatorModalOpen(true)}
        onOpenPineEditor={() => setIsPineEditorOpen(true)}
        onOpenReplay={handleReplayButtonClick}
        onOpenGoToDate={() => setIsGoToDateOpen(true)}
        onOpenSettings={() => {}}
        onOpenApiKey={() => setIsKeyModalOpen(true)}
        onSaveLayout={() => alert('تم حفظ تخطيط الشارت والمؤشرات بنجاح')}
        onResetLayout={() => {}}
        isReplayActive={isReplaying}
        isSelectingReplayPoint={isSelectingReplayPoint}
        availableSymbols={availableSymbols}
        mt5Status={mt5Status}
        onRefreshMT5={() => marketDataService.checkMT5Status()}
        autoFollow={autoFollow}
        onToggleAutoFollow={handleToggleAutoFollow}
        onJumpToLatest={handleJumpToLatest}
        isScrolledAway={isScrolledAway}
        statusText={statusText}
      />

      {/* Active Pine Alert Toast Notification */}
      {activeAlertToast && (
        <div className="fixed top-14 right-4 z-50 bg-[#18202a] border-2 border-[#f0b429] rounded-xl p-3 shadow-2xl max-w-sm flex items-start gap-3 backdrop-blur-md">
          <div className="w-8 h-8 rounded-full bg-[#f0b429]/20 flex items-center justify-center shrink-0 text-[#f0b429] mt-0.5">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-bold text-white text-xs truncate">{activeAlertToast.title}</span>
              <span className="text-[10px] text-[#7d8b9a] font-mono">PINE ALERT</span>
            </div>
            <p className="text-[11px] text-[#d5dde6] leading-tight break-words">{activeAlertToast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveAlertToast(null)}
            className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace (Left Toolbar + Canvas Viewport + Right Sidebar) */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Left Drawing Tools Toolbar */}
        <LeftToolbar
          activeTool={activeTool}
          onSelectTool={(tool) => setActiveTool(tool)}
          onClearAll={handleClearAllDrawings}
          isLocked={isDrawingsLocked}
          onToggleLock={() => setIsDrawingsLocked(!isDrawingsLocked)}
        />

        {/* Central Chart Canvas Container */}
        <div id="wrap" ref={wrapRef} className="flex-1 relative min-h-0 cursor-crosshair">
          {/* Prominent Floating Banner for Candle Selection Mode */}
          {isSelectingReplayPoint && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#18202a]/95 border-2 border-[#f0b429] rounded-xl px-5 py-2.5 shadow-2xl flex items-center gap-3 z-40 backdrop-blur-md animate-bounce">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f0b429] animate-ping" />
              <div className="text-white text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                <span>Select a candle on the chart to start replay</span>
                <span className="text-[#f0b429] font-normal text-xs sm:text-sm">
                  (حدد شمعة على الشارت لبدء إعادة التشغيل)
                </span>
              </div>
              <button
                type="button"
                className="px-3 py-1 rounded bg-[#222d3a] hover:bg-[#2c3a4a] text-xs text-[#ef5350] border border-[#ef5350]/50 font-bold transition-colors ml-2"
                onClick={cancelReplaySelection}
              >
                إلغاء (Cancel)
              </button>
            </div>
          )}

          {/* Floating Jump to Latest Button when Scrolled Away or Free Movement */}
          {(isScrolledAway || !autoFollow) && !isReplaying && (
            <div className="absolute bottom-8 right-20 z-30 flex items-center gap-2">
              <button
                type="button"
                onClick={handleJumpToLatest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18202a]/95 hover:bg-[#2563eb] text-white text-xs font-semibold shadow-xl border border-[#3b82f6]/50 hover:border-[#3b82f6] transition-all backdrop-blur-md group"
                title="العودة لأحدث شمعة مباشرة وتفعيل المتابعة التلقائية | Jump to Latest Candle"
              >
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                <span>العودة للمباشر</span>
                <span className="text-[10px] text-[#94a3b8] group-hover:text-white font-mono">⏭</span>
              </button>
            </div>
          )}

          <canvas
            id="cv"
            ref={canvasRef}
            className="absolute inset-0 w-full h-full touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={onDoubleClick}
          />
          {/* Top-Left OHLC Info Overlay */}
          <div
            id="info"
            ref={infoRef}
            className="absolute top-2 left-3 font-mono text-xs text-[#7d8b9a] pointer-events-none z-10"
          />
        </div>

        {/* Right Collapsible Sidebar (Watchlist, Indicators, Objects) */}
        <RightSidebar
          currentSymbol={sym}
          onSelectSymbol={(newSym) => setSym(newSym)}
          activeIndicators={activeIndicators}
          onToggleIndicatorVisibility={handleToggleIndicatorVisibility}
          onRemoveIndicator={handleRemoveIndicator}
          onEditIndicator={(ind) => setEditingIndicator(ind)}
          customPineIndicators={customPineIndicators}
          onTogglePineVisibility={handleTogglePineVisibility}
          onEditPineIndicator={(ind) => setEditingPineIndicator(ind)}
          onRemovePineIndicator={handleRemovePineIndicator}
          drawingItems={drawings}
          onToggleDrawingVisibility={handleToggleDrawingVisibility}
          onToggleDrawingLock={handleToggleDrawingLock}
          onRemoveDrawing={handleRemoveDrawing}
          currentBar={lastBar}
          dayChangePercent={dayChange}
        />
      </div>

      {/* Historical Bar Replay Bottom Dock */}
      {isReplaying && (
        <ReplayControls
          isPlaying={replayPlaying}
          currentIndex={replayIndex}
          maxIndex={replayMax}
          currentTimestamp={lastBar?.t}
          speed={replaySpeed}
          onPlayToggle={toggleReplayPlay}
          onStepNext={stepReplayNext}
          onStepPrev={stepReplayPrev}
          onJumpStart={() => seekReplay(15)}
          onJumpEnd={() => seekReplay(replayMax)}
          onSeek={(idx) => seekReplay(idx)}
          onSpeedChange={handleSpeedChange}
          onOpenGoToDate={() => setIsGoToDateOpen(true)}
          onPickCandle={() => setIsSelectingReplayPoint(true)}
          onExit={exitReplay}
        />
      )}

      {/* Indicator Modal */}
      <IndicatorModal
        isOpen={isIndicatorModalOpen}
        onClose={() => setIsIndicatorModalOpen(false)}
        onAddIndicator={handleAddIndicator}
        editingIndicator={editingIndicator}
        onSaveIndicatorSettings={handleSaveIndicatorSettings}
        onCloseEditor={() => setEditingIndicator(null)}
      />

      {/* Pine Script Editor & Compiler Modal */}
      <PineEditorModal
        isOpen={isPineEditorOpen}
        onClose={() => setIsPineEditorOpen(false)}
        onRunOnChart={handleRunPineOnChart}
        savedIndicators={savedPineIndicators}
        onSaveIndicator={handleSavePineIndicator}
        onDeleteSavedIndicator={handleDeleteSavedPineIndicator}
        activeAlerts={pineAlerts}
        onToggleAlert={handleTogglePineAlert}
        onDeleteAlert={handleDeletePineAlert}
      />

      {/* Pine Indicator Settings & Inputs Modal */}
      <PineSettingsModal
        indicator={editingPineIndicator}
        onClose={() => setEditingPineIndicator(null)}
        onSaveInputs={handleSavePineInputs}
      />

      {/* Go To Date Modal */}
      <GoToDateModal
        isOpen={isGoToDateOpen}
        onClose={() => setIsGoToDateOpen(false)}
        onJumpToDate={handleJumpToHistoricalDate}
      />

      {/* Twelve Data Key Modal */}
      <KeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        currentKey={marketDataService.getStoredApiKey()}
        onSaveKey={(k) => {
          marketDataService.setStoredApiKey(k);
          initMarketData();
        }}
      />
    </div>
  );
}
