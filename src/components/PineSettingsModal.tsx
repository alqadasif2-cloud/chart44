/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sliders, X, Check } from 'lucide-react';
import { CustomPineIndicator } from '../pine/types';

interface PineSettingsModalProps {
  indicator: CustomPineIndicator | null;
  onClose: () => void;
  onSaveInputs: (indicatorId: string, updatedInputs: Record<string, any>) => void;
}

export const PineSettingsModal: React.FC<PineSettingsModalProps> = ({
  indicator,
  onClose,
  onSaveInputs,
}) => {
  if (!indicator) return null;

  const [inputs, setInputs] = useState<Record<string, any>>({
    ...indicator.inputValues,
  });

  const metadata = indicator.metadata;
  const inputDefs = metadata?.inputs || [];

  const handleSave = () => {
    onSaveInputs(indicator.id, inputs);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#18202a] border border-[#2a3542] rounded-xl max-w-md w-full p-5 shadow-2xl text-[#d5dde6] text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3542] mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#f0b429]" />
            <h3 className="text-sm font-bold text-white">إعدادات مدخلات {indicator.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs list */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {inputDefs.length === 0 ? (
            <div className="text-center py-6 text-[#7d8b9a]">
              هذا المؤشر لا يحتوي على مدخلات قابلة للتعديل (`input(...)`).
            </div>
          ) : (
            inputDefs.map((def) => {
              const currentVal = inputs[def.id] !== undefined ? inputs[def.id] : def.default;

              return (
                <div
                  key={def.id}
                  className="flex items-center justify-between py-1.5 border-b border-[#2a3542]/40"
                >
                  <label className="text-[#d5dde6] max-w-[50%] truncate font-medium">
                    {def.name}:
                  </label>

                  {/* Integer or Float Number Input */}
                  {(def.type === 'int' || def.type === 'float') && (
                    <input
                      type="number"
                      min={def.min}
                      max={def.max}
                      step={def.step || (def.type === 'int' ? 1 : 0.1)}
                      value={currentVal}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          [def.id]:
                            def.type === 'int'
                              ? parseInt(e.target.value, 10)
                              : parseFloat(e.target.value),
                        })
                      }
                      className="w-24 bg-[#10151c] border border-[#2a3542] rounded px-2 py-1 text-right text-white focus:outline-none focus:border-[#f0b429] font-mono"
                    />
                  )}

                  {/* Boolean Checkbox */}
                  {def.type === 'bool' && (
                    <input
                      type="checkbox"
                      checked={!!currentVal}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          [def.id]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[#f0b429] cursor-pointer"
                    />
                  )}

                  {/* Color Selector */}
                  {def.type === 'color' && (
                    <input
                      type="color"
                      value={currentVal || '#f0b429'}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          [def.id]: e.target.value,
                        })
                      }
                      className="w-10 h-7 bg-transparent cursor-pointer rounded"
                    />
                  )}

                  {/* Source Selector */}
                  {def.type === 'source' && (
                    <select
                      value={currentVal || 'close'}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          [def.id]: e.target.value,
                        })
                      }
                      className="bg-[#10151c] text-white border border-[#2a3542] rounded px-2 py-1 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="close">close (الإغلاق)</option>
                      <option value="open">open (الافتتاح)</option>
                      <option value="high">high (أعلى سعر)</option>
                      <option value="low">low (أدنى سعر)</option>
                      <option value="hl2">hl2 ((H+L)/2)</option>
                      <option value="hlc3">hlc3 ((H+L+C)/3)</option>
                      <option value="ohlc4">ohlc4 ((O+H+L+C)/4)</option>
                    </select>
                  )}

                  {/* String Input */}
                  {def.type === 'string' && (
                    <input
                      type="text"
                      value={currentVal || ''}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          [def.id]: e.target.value,
                        })
                      }
                      className="w-32 bg-[#10151c] border border-[#2a3542] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#f0b429]"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-[#2a3542]">
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-[#222d3a] hover:bg-[#2c3a4a] text-white"
            onClick={onClose}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#f0b429] text-[#10151c] font-bold hover:bg-[#ffc038] shadow-md transition-colors"
            onClick={handleSave}
          >
            <Check className="w-3.5 h-3.5" />
            <span>تحديث الشارت فوراً</span>
          </button>
        </div>
      </div>
    </div>
  );
};
