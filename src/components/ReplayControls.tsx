/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  FastForward,
} from 'lucide-react';

interface ReplayControlsProps {
  isPlaying: boolean;
  currentIndex: number;
  maxIndex: number;
  currentTimestamp?: number;
  speed: number;
  onPlayToggle: () => void;
  onStepNext: () => void;
  onStepPrev: () => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
  onSeek: (index: number) => void;
  onSpeedChange: (speed: number) => void;
  onOpenGoToDate: () => void;
  onPickCandle?: () => void;
  onExit: () => void;
}

const REPLAY_SPEEDS = [0.25, 0.5, 1, 2, 3, 5, 10, 20, 50];

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPlaying,
  currentIndex,
  maxIndex,
  currentTimestamp,
  speed,
  onPlayToggle,
  onStepNext,
  onStepPrev,
  onJumpStart,
  onJumpEnd,
  onSeek,
  onSpeedChange,
  onOpenGoToDate,
  onPickCandle,
  onExit,
}) => {
  const formattedDate = currentTimestamp
    ? new Date(currentTimestamp * 1000).toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';

  return (
    <div className="bg-[#18202a] border-t border-[#2a3542] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#d5dde6] select-none z-30 shadow-lg">
      {/* Left: Replay Status & Go To Date */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[#ff9f43] font-bold">
          <FastForward className="w-4 h-4 animate-pulse" />
          <span>وضع إعادة التشغيل التاريخي</span>
        </span>

        {/* Date Display Badge */}
        {formattedDate && (
          <div className="px-2.5 py-1 rounded bg-[#10151c] border border-[#2a3542] text-[11px] text-[#26a69a] font-mono">
            {formattedDate}
          </div>
        )}

        {onPickCandle && (
          <button
            type="button"
            onClick={onPickCandle}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#2962ff]/20 hover:bg-[#2962ff]/30 text-[#4aa3ff] border border-[#2962ff] transition-colors"
            title="تحديد شمعة بداية جديدة من الشارت مباشرة"
          >
            <span>📍 تحديد شمعة من الشارت</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenGoToDate}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#222d3a] hover:bg-[#2c3a4a] text-white border border-[#2a3542] transition-colors"
          title="تحديد تاريخ ووقت محدد"
        >
          <Calendar className="w-3.5 h-3.5 text-[#26a69a]" />
          <span>انتقال لتاريخ (Go To Date)</span>
        </button>
      </div>

      {/* Center: Timeline Scrubber */}
      <div className="flex-1 max-w-xl flex items-center gap-3 min-w-[200px]">
        <input
          type="range"
          min={1}
          max={maxIndex || 100}
          value={currentIndex}
          onChange={(e) => onSeek(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-[#10151c] rounded-lg appearance-none cursor-pointer accent-[#f0b429]"
        />
        <span className="text-[11px] font-mono text-[#7d8b9a] whitespace-nowrap">
          {currentIndex} / {maxIndex}
        </span>
      </div>

      {/* Right: Controls & Speed */}
      <div className="flex items-center gap-1.5">
        {/* Jump to start */}
        <button
          type="button"
          onClick={onJumpStart}
          className="p-1.5 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
          title="القفز إلى البداية"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Step Prev */}
        <button
          type="button"
          onClick={onStepPrev}
          className="p-1.5 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
          title="بار سابق (السهم لليسار)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          onClick={onPlayToggle}
          className="p-2 rounded bg-[#f0b429] text-[#10151c] hover:bg-[#ffc038] font-bold shadow-md transition-colors"
          title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل المحاكاة'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        {/* Step Next */}
        <button
          type="button"
          onClick={onStepNext}
          className="p-1.5 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
          title="بار تالي (السهم لليمين)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Jump to end */}
        <button
          type="button"
          onClick={onJumpEnd}
          className="p-1.5 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
          title="القفز إلى النهاية"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 mr-2">
          <span className="text-[#7d8b9a] text-[11px]">السرعة:</span>
          <select
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="bg-[#222d3a] text-white border border-[#2a3542] rounded px-2 py-1 text-xs focus:outline-none cursor-pointer"
          >
            {REPLAY_SPEEDS.map((sp) => (
              <option key={sp} value={sp}>
                {sp}x
              </option>
            ))}
          </select>
        </div>

        {/* Exit Replay Button */}
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#ef5350]/20 hover:bg-[#ef5350]/30 border border-[#ef5350] text-[#ef5350] font-medium mr-1 transition-colors"
          title="إنهاء وضع إعادة التشغيل والعودة للبث المباشر"
        >
          <X className="w-3.5 h-3.5" />
          <span>خروج</span>
        </button>
      </div>
    </div>
  );
};
