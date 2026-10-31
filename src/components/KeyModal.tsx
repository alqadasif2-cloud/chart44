/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Key, X, ExternalLink, Check } from 'lucide-react';

interface KeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  onSaveKey: (key: string) => void;
}

export const KeyModal: React.FC<KeyModalProps> = ({
  isOpen,
  onClose,
  currentKey,
  onSaveKey,
}) => {
  const [keyValue, setKeyValue] = useState(currentKey);

  React.useEffect(() => {
    setKeyValue(currentKey);
  }, [currentKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(keyValue.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-[#18202a] border border-[#2a3542] rounded-xl max-w-md w-full p-5 shadow-2xl text-[#d5dde6] text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3542] mb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#f0b429]" />
            <h3 className="text-sm font-bold text-white">إعداد مفتاح Twelve Data API</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-[#7d8b9a] mb-3 leading-relaxed">
          يُستخدم مفتاح Twelve Data لجلب بيانات الشارت اللحظية والتاريخية لأسواق الذهب (XAU/USD)
          والفضة والعملات الأجنبية (Forex). يمكنك الحصول على مفتاح مجاني عبر موقع المزود:
        </p>

        <a
          href="https://twelvedata.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#222d3a] hover:bg-[#2c3a4a] text-[#4aa3ff] font-medium mb-4 transition-colors"
        >
          <span>twelvedata.com (تسجيل حساب مجاني)</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <div className="mb-5">
          <label className="block text-[11px] font-medium text-[#7d8b9a] mb-1">
            مفتاح API الخاص بك:
          </label>
          <input
            type="text"
            placeholder="أدخل الـ API Key هنا..."
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            className="w-full bg-[#10151c] border border-[#2a3542] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f0b429] font-mono"
          />
          <div className="text-[10px] text-[#7d8b9a] mt-1.5">
            ملاحظة: العملات الرقمية (Bitcoin, Ethereum, Solana...) تعمل مباشرة وبشكل مجاني دون الحاجة
            لأي مفتاح عبر منصة بينانس.
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
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#f0b429] text-[#10151c] font-bold hover:bg-[#ffc038] shadow-md transition-colors"
            onClick={handleSave}
          >
            <Check className="w-3.5 h-3.5" />
            <span>حفظ واستخدام</span>
          </button>
        </div>
      </div>
    </div>
  );
};
