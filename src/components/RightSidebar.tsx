/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  List,
  Eye,
  EyeOff,
  Trash2,
  Lock,
  Unlock,
  ChevronRight,
  ChevronLeft,
  Settings,
  TrendingUp,
  Activity,
  Layers,
  BarChart,
} from 'lucide-react';
import { Bar, DrawingItem, IndicatorInstance } from '../types/chart';
import { CustomPineIndicator } from '../pine/types';
import { SUPPORTED_SYMBOLS } from '../data/marketData';

interface RightSidebarProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  activeIndicators: IndicatorInstance[];
  onToggleIndicatorVisibility: (id: string) => void;
  onRemoveIndicator: (id: string) => void;
  onEditIndicator: (indicator: IndicatorInstance) => void;
  customPineIndicators?: CustomPineIndicator[];
  onTogglePineVisibility?: (id: string) => void;
  onEditPineIndicator?: (indicator: CustomPineIndicator) => void;
  onRemovePineIndicator?: (id: string) => void;
  drawingItems: DrawingItem[];
  onToggleDrawingVisibility: (id: string) => void;
  onToggleDrawingLock: (id: string) => void;
  onRemoveDrawing: (id: string) => void;
  currentBar?: Bar;
  dayChangePercent?: number;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  currentSymbol,
  onSelectSymbol,
  activeIndicators,
  onToggleIndicatorVisibility,
  onRemoveIndicator,
  onEditIndicator,
  customPineIndicators = [],
  onTogglePineVisibility,
  onEditPineIndicator,
  onRemovePineIndicator,
  drawingItems,
  onToggleDrawingVisibility,
  onToggleDrawingLock,
  onRemoveDrawing,
  currentBar,
  dayChangePercent = 0,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'indicators' | 'objects' | 'info'>('watchlist');

  if (!isOpen) {
    return (
      <aside className="w-8 bg-[#18202a] border-l border-[#2a3542] flex flex-col items-center py-2 z-20 select-none">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
          title="فتح الشريط الجانبي"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  const totalIndicatorsCount = activeIndicators.length + customPineIndicators.length;

  return (
    <aside className="w-64 bg-[#141b24] border-l border-[#2a3542] flex flex-col z-20 select-none text-xs text-[#d5dde6]">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-[#2a3542] bg-[#18202a] px-2 py-1.5">
        <div className="flex gap-1">
          <button
            type="button"
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'watchlist' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#7d8b9a] hover:text-white'
            }`}
            onClick={() => setActiveTab('watchlist')}
            title="قائمة المراقبة (Watchlist)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className={`p-1.5 rounded transition-colors relative ${
              activeTab === 'indicators' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#7d8b9a] hover:text-white'
            }`}
            onClick={() => setActiveTab('indicators')}
            title="المؤشرات المفعلة"
          >
            <Activity className="w-3.5 h-3.5" />
            {totalIndicatorsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#f0b429] text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                {totalIndicatorsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'objects' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#7d8b9a] hover:text-white'
            }`}
            onClick={() => setActiveTab('objects')}
            title="شجرة الرسومات (Objects)"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'info' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#7d8b9a] hover:text-white'
            }`}
            onClick={() => setActiveTab('info')}
            title="بيانات ومعلومات الرمز"
          >
            <BarChart className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
          title="طي الشريط الجانبي"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* TAB 1: WATCHLIST */}
        {activeTab === 'watchlist' && (
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-[#7d8b9a] px-2 py-1 uppercase tracking-wider">
              قائمة العملات والأصول
            </div>
            {SUPPORTED_SYMBOLS.map((item) => {
              const isSelected = item.symbol === currentSymbol;
              return (
                <button
                  key={item.symbol}
                  type="button"
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left transition-colors ${
                    isSelected ? 'bg-[#222d3a] border border-[#2a3542]' : 'hover:bg-[#18202a]'
                  }`}
                  onClick={() => onSelectSymbol(item.symbol)}
                >
                  <div>
                    <div className="font-semibold text-white">{item.symbol}</div>
                    <div className="text-[11px] text-[#7d8b9a]">{item.nameAr}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        item.category === 'crypto'
                          ? 'bg-[#26a69a]/20 text-[#26a69a]'
                          : 'bg-[#f0b429]/20 text-[#f0b429]'
                      }`}
                    >
                      {item.category.toUpperCase()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* TAB 2: ACTIVE INDICATORS */}
        {activeTab === 'indicators' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-[#7d8b9a]">
                المؤشرات النشطة ({totalIndicatorsCount})
              </span>
            </div>

            {totalIndicatorsCount === 0 ? (
              <div className="text-center py-8 text-[#7d8b9a] text-[11px]">
                لا توجد مؤشرات مضافة حالياً.
                <br />
                اضغط على زر (المؤشرات) أو (Pine Script) في الأعلى لإضافة استراتيجيات ومؤشرات.
              </div>
            ) : (
              <>
                {/* Standard Built-in Indicators */}
                {activeIndicators.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-medium text-[#7d8b9a] px-1">مؤشرات المنصة الأساسية</div>
                    {activeIndicators.map((ind) => (
                      <div
                        key={ind.instanceId}
                        className="flex items-center justify-between p-2 rounded bg-[#18202a] border border-[#2a3542]"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: ind.color }}
                          />
                          <div className="truncate font-medium text-white">{ind.name}</div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEditIndicator(ind)}
                            className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
                            title="تعديل الإعدادات"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleIndicatorVisibility(ind.instanceId)}
                            className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
                            title={ind.visible ? 'إخفاء' : 'إظهار'}
                          >
                            {ind.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-[#ef5350]" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveIndicator(ind.instanceId)}
                            className="p-1 rounded hover:bg-[#222d3a] text-[#ef5350]"
                            title="حذف المؤشر"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Pine Script Indicators */}
                {customPineIndicators.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-medium text-[#f0b429] px-1">
                      <span>مؤشرات Pine Script المخصصة</span>
                      <span className="bg-[#f0b429]/20 text-[#f0b429] px-1.5 py-0.2 rounded text-[9px] font-mono">
                        PINE v5/v6
                      </span>
                    </div>
                    {customPineIndicators.map((pineInd) => (
                      <div
                        key={pineInd.id}
                        className="flex items-center justify-between p-2 rounded bg-[#18202a] border border-[#f0b429]/30"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="w-2 h-2 rounded-full bg-[#f0b429] shrink-0" />
                          <div className="truncate font-medium text-white">
                            {pineInd.metadata?.title || pineInd.name}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {onEditPineIndicator && (
                            <button
                              type="button"
                              onClick={() => onEditPineIndicator(pineInd)}
                              className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-[#f0b429]"
                              title="تعديل مدخلات Pine Script"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onTogglePineVisibility && (
                            <button
                              type="button"
                              onClick={() => onTogglePineVisibility(pineInd.id)}
                              className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
                              title={pineInd.visible ? 'إخفاء' : 'إظهار'}
                            >
                              {pineInd.visible ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-[#ef5350]" />
                              )}
                            </button>
                          )}
                          {onRemovePineIndicator && (
                            <button
                              type="button"
                              onClick={() => onRemovePineIndicator(pineInd.id)}
                              className="p-1 rounded hover:bg-[#222d3a] text-[#ef5350]"
                              title="إزالة من الشارت"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: OBJECT TREE (DRAWINGS) */}
        {activeTab === 'objects' && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-[#7d8b9a] px-1 py-1">
              عناصر الرسم على الشارت ({drawingItems.length})
            </div>
            {drawingItems.length === 0 ? (
              <div className="text-center py-8 text-[#7d8b9a] text-[11px]">
                لم يتم رسم أي أشكال أو خطوط حتى الآن.
              </div>
            ) : (
              drawingItems.map((draw) => (
                <div
                  key={draw.id}
                  className="flex items-center justify-between p-2 rounded bg-[#18202a] border border-[#2a3542]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: draw.color }}
                    />
                    <span className="font-medium text-white capitalize">{draw.type}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleDrawingLock(draw.id)}
                      className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a]"
                      title={draw.locked ? 'إلغاء القفل' : 'قفل'}
                    >
                      {draw.locked ? <Lock className="w-3.5 h-3.5 text-[#f0b429]" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleDrawingVisibility(draw.id)}
                      className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a]"
                      title={draw.visible !== false ? 'إخفاء' : 'إظهار'}
                    >
                      {draw.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-[#ef5350]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveDrawing(draw.id)}
                      className="p-1 rounded hover:bg-[#222d3a] text-[#ef5350]"
                      title="حذف الرسم"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: MARKET INFO & STATS */}
        {activeTab === 'info' && (
          <div className="space-y-3 p-1">
            <div className="p-3 rounded bg-[#18202a] border border-[#2a3542] space-y-2">
              <div className="text-sm font-bold text-white">{currentSymbol}</div>
              {currentBar && (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#7d8b9a]">سعر الإغلاق الحالي:</span>
                    <span className="font-mono font-bold text-white">{currentBar.c.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7d8b9a]">الافتتاح:</span>
                    <span className="font-mono text-white">{currentBar.o.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7d8b9a]">أعلى سعر (High):</span>
                    <span className="font-mono text-[#26a69a]">{currentBar.h.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7d8b9a]">أدنى سعر (Low):</span>
                    <span className="font-mono text-[#ef5350]">{currentBar.l.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7d8b9a]">حجم التداول (Vol):</span>
                    <span className="font-mono text-white">{currentBar.v.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7d8b9a]">التغير:</span>
                    <span
                      className={`font-mono font-bold ${
                        dayChangePercent >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
                      }`}
                    >
                      {dayChangePercent >= 0 ? '+' : ''}
                      {dayChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 rounded bg-[#18202a] border border-[#2a3542] text-[11px] text-[#7d8b9a] space-y-1">
              <div className="font-semibold text-white mb-1">مصدر البيانات:</div>
              <div>• العملات الرقمية: بث لحظي مباشر عبر Binance WebSockets.</div>
              <div>• المعادن والفوركس: اتصال موثق عبر Twelve Data API.</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
