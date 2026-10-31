/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, X, Clock, ArrowRight } from 'lucide-react';

interface GoToDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToDate: (timestamp: number) => void;
}

export const GoToDateModal: React.FC<GoToDateModalProps> = ({
  isOpen,
  onClose,
  onJumpToDate,
}) => {
  // Default to today's date minus 7 days
  const now = new Date();
  const past = new Date(now.getTime() - 7 * 86400 * 1000);
  const defaultDateStr = past.toISOString().slice(0, 10);
  const defaultTimeStr = '12:00';

  const [dateStr, setDateStr] = useState(defaultDateStr);
  const [timeStr, setTimeStr] = useState(defaultTimeStr);

  if (!isOpen) return null;

  const handleJump = () => {
    try {
      const combined = new Date(`${dateStr}T${timeStr}:00Z`);
      const ts = Math.floor(combined.getTime() / 1000);
      if (!isNaN(ts)) {
        onJumpToDate(ts);
        onClose();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#18202a] border border-[#2a3542] rounded-xl max-w-sm w-full p-5 shadow-2xl text-[#d5dde6] text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3542] mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#26a69a]" />
            <h3 className="text-sm font-bold text-white">الانتقال إلى تاريخ ووقت (Go To Date)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-[#7d8b9a] mb-4 leading-relaxed">
          حدد التاريخ والوقت الزمني المطلوب للقفز مباشرة إلى الشمعة التاريخية وتفعيل محاكي إعادة
          التشغيل (Bar Replay) من تلك النقطة.
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-[11px] font-medium text-[#7d8b9a] mb-1">
              التاريخ (UTC):
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-[#10151c] border border-[#2a3542] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f0b429]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#7d8b9a] mb-1">
              الوقت (ساعة:دقيقة UTC):
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-[#7d8b9a] absolute left-3 top-2.5" />
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full bg-[#10151c] border border-[#2a3542] rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#f0b429]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#2a3542]">
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-[#222d3a] hover:bg-[#2c3a4a] text-white"
            onClick={onClose}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#26a69a] hover:bg-[#2bbbad] text-[#10151c] font-bold shadow-md transition-colors"
            onClick={handleJump}
          >
            <span>انتقال وتعيين البداية</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
