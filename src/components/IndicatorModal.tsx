/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, X, Plus, Check, Sliders } from 'lucide-react';
import { IndicatorCategory, IndicatorDefinition, IndicatorInstance } from '../types/chart';
import { INDICATOR_DEFINITIONS } from '../indicators/definitions';

interface IndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIndicator: (def: IndicatorDefinition) => void;
  editingIndicator: IndicatorInstance | null;
  onSaveIndicatorSettings: (updated: IndicatorInstance) => void;
  onCloseEditor: () => void;
}

export const IndicatorModal: React.FC<IndicatorModalProps> = ({
  isOpen,
  onClose,
  onAddIndicator,
  editingIndicator,
  onSaveIndicatorSettings,
  onCloseEditor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IndicatorCategory | 'all'>('all');

  // Local state for editing an existing indicator
  const [editParams, setEditParams] = useState<Record<string, any>>({});
  const [editColor, setEditColor] = useState<string>('#f0b429');
  const [editLineWidth, setEditLineWidth] = useState<number>(1.5);

  React.useEffect(() => {
    if (editingIndicator) {
      setEditParams({ ...editingIndicator.params });
      setEditColor(editingIndicator.color);
      setEditLineWidth(editingIndicator.lineWidth);
    }
  }, [editingIndicator]);

  if (!isOpen && !editingIndicator) return null;

  // Render Editor Mode if editing
  if (editingIndicator) {
    const def = INDICATOR_DEFINITIONS.find((d) => d.id === editingIndicator.defId);

    const handleSave = () => {
      onSaveIndicatorSettings({
        ...editingIndicator,
        params: editParams,
        color: editColor,
        lineWidth: editLineWidth,
      });
      onCloseEditor();
    };

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
        <div className="bg-[#18202a] border border-[#2a3542] rounded-xl max-w-md w-full p-5 shadow-2xl text-[#d5dde6] text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#2a3542] mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#f0b429]" />
              <h3 className="text-sm font-bold text-white">إعدادات {editingIndicator.name}</h3>
            </div>
            <button
              type="button"
              onClick={onCloseEditor}
              className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {/* Parameters */}
            {def?.params.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1 border-b border-[#2a3542]/50">
                <label className="text-[#d5dde6]">{p.name}:</label>
                {p.type === 'number' && (
                  <input
                    type="number"
                    min={p.min}
                    max={p.max}
                    step={p.step || 1}
                    value={editParams[p.id] ?? p.default}
                    onChange={(e) =>
                      setEditParams({ ...editParams, [p.id]: parseFloat(e.target.value) })
                    }
                    className="w-24 bg-[#10151c] border border-[#2a3542] rounded px-2 py-1 text-right text-white focus:outline-none focus:border-[#f0b429]"
                  />
                )}
                {p.type === 'color' && (
                  <input
                    type="color"
                    value={editParams[p.id] ?? p.default}
                    onChange={(e) => setEditParams({ ...editParams, [p.id]: e.target.value })}
                    className="w-10 h-7 bg-transparent cursor-pointer rounded"
                  />
                )}
                {p.type === 'boolean' && (
                  <input
                    type="checkbox"
                    checked={editParams[p.id] ?? p.default}
                    onChange={(e) => setEditParams({ ...editParams, [p.id]: e.target.checked })}
                    className="w-4 h-4 accent-[#f0b429]"
                  />
                )}
              </div>
            ))}

            {/* General Color */}
            <div className="flex items-center justify-between py-1 border-b border-[#2a3542]/50">
              <label className="text-[#d5dde6]">لون الخط الأساسي:</label>
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="w-10 h-7 bg-transparent cursor-pointer rounded"
              />
            </div>

            {/* Line Width */}
            <div className="flex items-center justify-between py-1">
              <label className="text-[#d5dde6]">سماكة الخط:</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={editLineWidth}
                  onChange={(e) => setEditLineWidth(parseFloat(e.target.value))}
                  className="w-24 accent-[#f0b429]"
                />
                <span className="font-mono text-[11px] text-[#7d8b9a]">{editLineWidth}px</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-[#2a3542]">
            <button
              type="button"
              className="px-4 py-1.5 rounded bg-[#222d3a] hover:bg-[#2c3a4a] text-white"
              onClick={onCloseEditor}
            >
              إلغاء
            </button>
            <button
              type="button"
              className="px-4 py-1.5 rounded bg-[#f0b429] text-[#10151c] font-bold hover:bg-[#ffc038]"
              onClick={handleSave}
            >
              حفظ التغييرات
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Library Browser Mode
  const filteredDefs = INDICATOR_DEFINITIONS.filter((def) => {
    const matchesCategory = selectedCategory === 'all' || def.category === selectedCategory;
    const matchesSearch =
      def.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def.nameAr.includes(searchQuery) ||
      def.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#18202a] border border-[#2a3542] rounded-xl max-w-2xl w-full p-5 shadow-2xl text-[#d5dde6] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3542] mb-3">
          <div>
            <h2 className="text-base font-bold text-white">مكتبة المؤشرات الفنية (Indicators)</h2>
            <p className="text-xs text-[#7d8b9a]">
              اختر من بين مؤشرات الاتجاه والزخم والتذبذب والسيولة وحجم التداول
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-[#7d8b9a] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="ابحث بالاسم (مثل RSI, MACD, Supertrend, 볼린저밴드)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#10151c] border border-[#2a3542] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#f0b429]"
            autoFocus
          />
        </div>

        {/* Categories Pills */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 text-xs">
          {(
            [
              { id: 'all', label: 'جميع المؤشرات' },
              { id: 'trend', label: 'الاتجاه (Trend)' },
              { id: 'momentum', label: 'الزخم (Momentum)' },
              { id: 'volatility', label: 'التذبذب (Volatility)' },
              { id: 'volume', label: 'الحجم (Volume)' },
              { id: 'orderflow', label: 'السيولة وتدفق الأوامر (Order Flow)' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#f0b429] text-[#10151c] font-bold'
                  : 'bg-[#222d3a] text-[#7d8b9a] hover:text-white'
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Indicators List Grid */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredDefs.map((def) => (
            <div
              key={def.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[#141b24] border border-[#2a3542] hover:border-[#7d8b9a] transition-colors"
            >
              <div className="space-y-0.5 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-xs">{def.name}</span>
                  <span className="text-[11px] text-[#f0b429]">({def.nameAr})</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#222d3a] text-[#7d8b9a] uppercase">
                    {def.panel === 'overlay' ? 'شارت السعر' : 'نافذة سفلية'}
                  </span>
                </div>
                <p className="text-[11px] text-[#7d8b9a] leading-relaxed">{def.description}</p>
              </div>

              <button
                type="button"
                onClick={() => onAddIndicator(def)}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#222d3a] hover:bg-[#f0b429] hover:text-[#10151c] text-[#f0b429] font-bold border border-[#f0b429] text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
