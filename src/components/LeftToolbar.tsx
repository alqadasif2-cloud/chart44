/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Crosshair,
  TrendingUp,
  Minus,
  Maximize2,
  Box,
  Layers,
  ArrowUpRight,
  Type,
  Lock,
  Unlock,
  Trash2,
  GitBranch,
  Split,
  Target,
  Clock,
  Compass,
} from 'lucide-react';
import { DrawingToolType } from '../types/chart';

interface LeftToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  onClearAll: () => void;
  isLocked: boolean;
  onToggleLock: () => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  activeTool,
  onSelectTool,
  onClearAll,
  isLocked,
  onToggleLock,
}) => {
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);

  const toggleFlyout = (id: string) => {
    setActiveFlyout(activeFlyout === id ? null : id);
  };

  return (
    <aside className="w-11 bg-[#141b24] border-r border-[#2a3542] flex flex-col items-center py-2 gap-1.5 z-20 select-none text-xs">
      {/* Cursor / Crosshair */}
      <button
        type="button"
        className={`p-2 rounded hover:bg-[#222d3a] transition-colors relative ${
          activeTool === 'crosshair' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#7d8b9a]'
        }`}
        onClick={() => onSelectTool('crosshair')}
        title="مؤشر التقاطع (Crosshair)"
      >
        <Crosshair className="w-4 h-4" />
      </button>

      <div className="w-6 h-[1px] bg-[#2a3542]" />

      {/* Trend & Line Tools Flyout */}
      <div className="relative">
        <button
          type="button"
          className={`p-2 rounded hover:bg-[#222d3a] transition-colors ${
            ['trend', 'ray', 'extended', 'hline', 'vline'].includes(activeTool)
              ? 'bg-[#2a3542] text-[#f0b429]'
              : 'text-[#7d8b9a]'
          }`}
          onClick={() => toggleFlyout('lines')}
          title="أدوات الخطوط والترند"
        >
          <TrendingUp className="w-4 h-4" />
        </button>

        {activeFlyout === 'lines' && (
          <div className="absolute left-full top-0 ml-1.5 bg-[#18202a] border border-[#2a3542] rounded-lg shadow-2xl p-1.5 flex flex-col gap-1 w-44 z-50">
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'trend' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('trend');
                setActiveFlyout(null);
              }}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>خط اتجاه (Trendline)</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'ray' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('ray');
                setActiveFlyout(null);
              }}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>شعاع ممتد (Ray)</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'extended' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('extended');
                setActiveFlyout(null);
              }}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>خط لا نهائي (Extended)</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'hline' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('hline');
                setActiveFlyout(null);
              }}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>خط أفقي (Horizontal)</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'vline' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('vline');
                setActiveFlyout(null);
              }}
            >
              <Minus className="w-3.5 h-3.5 rotate-90" />
              <span>خط رأسي (Vertical)</span>
            </button>
          </div>
        )}
      </div>

      {/* Channels & Pitchfork */}
      <div className="relative">
        <button
          type="button"
          className={`p-2 rounded hover:bg-[#222d3a] transition-colors ${
            ['channel', 'pitchfork'].includes(activeTool)
              ? 'bg-[#2a3542] text-[#f0b429]'
              : 'text-[#7d8b9a]'
          }`}
          onClick={() => toggleFlyout('channels')}
          title="القنوات وشوكة أندروز"
        >
          <GitBranch className="w-4 h-4" />
        </button>

        {activeFlyout === 'channels' && (
          <div className="absolute left-full top-0 ml-1.5 bg-[#18202a] border border-[#2a3542] rounded-lg shadow-2xl p-1.5 flex flex-col gap-1 w-44 z-50">
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'channel' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('channel');
                setActiveFlyout(null);
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>قناة سعرية متوازية</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'pitchfork' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('pitchfork');
                setActiveFlyout(null);
              }}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>شوكة أندروز (Pitchfork)</span>
            </button>
          </div>
        )}
      </div>

      {/* Fibonacci Tools */}
      <div className="relative">
        <button
          type="button"
          className={`p-2 rounded hover:bg-[#222d3a] transition-colors ${
            ['fibRetracement', 'fibExtension', 'fibTimezones'].includes(activeTool)
              ? 'bg-[#2a3542] text-[#f0b429]'
              : 'text-[#7d8b9a]'
          }`}
          onClick={() => toggleFlyout('fib')}
          title="أدوات فيبوناتشي"
        >
          <Split className="w-4 h-4" />
        </button>

        {activeFlyout === 'fib' && (
          <div className="absolute left-full top-0 ml-1.5 bg-[#18202a] border border-[#2a3542] rounded-lg shadow-2xl p-1.5 flex flex-col gap-1 w-48 z-50">
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'fibRetracement' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('fibRetracement');
                setActiveFlyout(null);
              }}
            >
              <Split className="w-3.5 h-3.5" />
              <span>تصحيح فيبوناتشي (Retracement)</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'fibExtension' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('fibExtension');
                setActiveFlyout(null);
              }}
            >
              <Split className="w-3.5 h-3.5" />
              <span>امتداد فيبوناتشي (Extension)</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'fibTimezones' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('fibTimezones');
                setActiveFlyout(null);
              }}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>فترات فيبوناتشي الزمنية</span>
            </button>
          </div>
        )}
      </div>

      {/* Shapes: Rect, Zone */}
      <div className="relative">
        <button
          type="button"
          className={`p-2 rounded hover:bg-[#222d3a] transition-colors ${
            ['rect', 'zone'].includes(activeTool) ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#7d8b9a]'
          }`}
          onClick={() => toggleFlyout('shapes')}
          title="أشكال هندسية ومناطق دعم/مقاومة"
        >
          <Box className="w-4 h-4" />
        </button>

        {activeFlyout === 'shapes' && (
          <div className="absolute left-full top-0 ml-1.5 bg-[#18202a] border border-[#2a3542] rounded-lg shadow-2xl p-1.5 flex flex-col gap-1 w-44 z-50">
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'rect' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('rect');
                setActiveFlyout(null);
              }}
            >
              <Box className="w-3.5 h-3.5" />
              <span>مستطيل (Rectangle)</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'zone' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('zone');
                setActiveFlyout(null);
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>منطقة دعم/مقاومة (Zone)</span>
            </button>
          </div>
        )}
      </div>

      {/* Trading Positions & Measurements */}
      <div className="relative">
        <button
          type="button"
          className={`p-2 rounded hover:bg-[#222d3a] transition-colors ${
            ['longPosition', 'shortPosition', 'priceRange', 'dateRange'].includes(activeTool)
              ? 'bg-[#2a3542] text-[#f0b429]'
              : 'text-[#7d8b9a]'
          }`}
          onClick={() => toggleFlyout('positions')}
          title="أدوات إدارة المخاطر والقياس"
        >
          <Target className="w-4 h-4" />
        </button>

        {activeFlyout === 'positions' && (
          <div className="absolute left-full top-0 ml-1.5 bg-[#18202a] border border-[#2a3542] rounded-lg shadow-2xl p-1.5 flex flex-col gap-1 w-48 z-50">
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'longPosition' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('longPosition');
                setActiveFlyout(null);
              }}
            >
              <Target className="w-3.5 h-3.5 text-[#26a69a]" />
              <span>صفقة شراء (Long Position)</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'shortPosition' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('shortPosition');
                setActiveFlyout(null);
              }}
            >
              <Target className="w-3.5 h-3.5 text-[#ef5350]" />
              <span>صفقة بيع (Short Position)</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'priceRange' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('priceRange');
                setActiveFlyout(null);
              }}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>نطاق السعر والنسبة %</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
                activeTool === 'dateRange' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#d5dde6] hover:bg-[#222d3a]'
              }`}
              onClick={() => {
                onSelectTool('dateRange');
                setActiveFlyout(null);
              }}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>النطاق الزمني وعدد البارات</span>
            </button>
          </div>
        )}
      </div>

      {/* Text Annotation */}
      <button
        type="button"
        className={`p-2 rounded hover:bg-[#222d3a] transition-colors ${
          activeTool === 'text' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#7d8b9a]'
        }`}
        onClick={() => onSelectTool('text')}
        title="ملاحظة نصية (Text)"
      >
        <Type className="w-4 h-4" />
      </button>

      {/* Arrow */}
      <button
        type="button"
        className={`p-2 rounded hover:bg-[#222d3a] transition-colors ${
          activeTool === 'arrow' ? 'bg-[#2a3542] text-[#f0b429]' : 'text-[#7d8b9a]'
        }`}
        onClick={() => onSelectTool('arrow')}
        title="سهم توجيهي (Arrow)"
      >
        <ArrowUpRight className="w-4 h-4" />
      </button>

      <div className="flex-1" />

      {/* Lock all drawings */}
      <button
        type="button"
        className={`p-2 rounded hover:bg-[#222d3a] transition-colors ${
          isLocked ? 'text-[#f0b429] bg-[#2a3542]' : 'text-[#7d8b9a]'
        }`}
        onClick={onToggleLock}
        title={isLocked ? 'إلغاء قفل الرسومات' : 'قفل جميع الرسومات'}
      >
        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </button>

      {/* Clear All Drawings */}
      <button
        type="button"
        className="p-2 rounded hover:bg-[#222d3a] text-[#ef5350] transition-colors"
        onClick={onClearAll}
        title="مسح جميع الرسومات"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </aside>
  );
};
