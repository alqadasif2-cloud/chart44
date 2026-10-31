/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Code,
  Play,
  Save,
  CheckCircle,
  AlertTriangle,
  X,
  FileCode,
  Bookmark,
  Bell,
  Trash2,
  FolderOpen,
  Copy,
} from 'lucide-react';
import { CompilerDiagnostic, CustomPineIndicator, PineAlert } from '../pine/types';
import { PineScriptParser } from '../pine/parser';
import { PINE_TEMPLATES } from '../pine/templates';

interface PineEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunOnChart: (indicator: CustomPineIndicator) => void;
  savedIndicators: CustomPineIndicator[];
  onSaveIndicator: (indicator: CustomPineIndicator) => void;
  onDeleteSavedIndicator: (id: string) => void;
  activeAlerts: PineAlert[];
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
}

export const PineEditorModal: React.FC<PineEditorModalProps> = ({
  isOpen,
  onClose,
  onRunOnChart,
  savedIndicators,
  onSaveIndicator,
  onDeleteSavedIndicator,
  activeAlerts,
  onToggleAlert,
  onDeleteAlert,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'myIndicators' | 'templates' | 'alerts'>('editor');
  const [sourceCode, setSourceCode] = useState<string>(PINE_TEMPLATES[0].code);
  const [scriptTitle, setScriptTitle] = useState<string>('My Pine Indicator');
  const [diagnostics, setDiagnostics] = useState<CompilerDiagnostic[]>([]);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  // Compile & Validate Script
  const handleCompile = () => {
    const { metadata, diagnostics: diags } = PineScriptParser.parse(sourceCode);
    setDiagnostics(diags);

    if (diags.some((d) => d.severity === 'error')) {
      setCompileStatus('error');
      return null;
    }

    setCompileStatus('success');
    if (metadata.title) {
      setScriptTitle(metadata.title);
    }
    return metadata;
  };

  // Run Directly on Chart
  const handleApplyToChart = () => {
    const meta = handleCompile();
    if (!meta) return;

    const customInd: CustomPineIndicator = {
      id: `pine_${Date.now()}`,
      name: meta.title || scriptTitle,
      code: sourceCode,
      version: meta.version,
      overlay: meta.overlay,
      inputValues: {},
      visible: true,
      metadata: meta,
      updatedAt: Date.now(),
    };

    onRunOnChart(customInd);
    onClose();
  };

  // Save to My Indicators
  const handleSave = () => {
    const meta = handleCompile();
    if (!meta) return;

    const customInd: CustomPineIndicator = {
      id: `saved_pine_${Date.now()}`,
      name: meta.title || scriptTitle,
      code: sourceCode,
      version: meta.version,
      overlay: meta.overlay,
      inputValues: {},
      visible: true,
      metadata: meta,
      updatedAt: Date.now(),
    };

    onSaveIndicator(customInd);
    alert('تم حفظ المؤشر في مكتبة مؤشراتك الخاصة بنجاح!');
  };

  const lines = sourceCode.split('\n');

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-xs select-none">
      <div className="bg-[#18202a] border border-[#2a3542] rounded-xl max-w-4xl w-full h-[90vh] shadow-2xl flex flex-col text-[#d5dde6] text-xs overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#141b24] border-b border-[#2a3542]">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-[#f0b429]" />
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>محرر ومترجم باين سكريبت (Pine Script Editor v5/v6)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2962ff]/20 text-[#4aa3ff] font-mono">
                  v5/v6 Engine
                </span>
              </h2>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-[#10151c] p-0.5 rounded border border-[#2a3542]">
            <button
              type="button"
              className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                activeTab === 'editor' ? 'bg-[#f0b429] text-[#10151c] font-bold' : 'text-[#7d8b9a] hover:text-white'
              }`}
              onClick={() => setActiveTab('editor')}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>المحرر (Editor)</span>
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                activeTab === 'myIndicators' ? 'bg-[#f0b429] text-[#10151c] font-bold' : 'text-[#7d8b9a] hover:text-white'
              }`}
              onClick={() => setActiveTab('myIndicators')}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>مؤشراتي ({savedIndicators.length})</span>
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                activeTab === 'templates' ? 'bg-[#f0b429] text-[#10151c] font-bold' : 'text-[#7d8b9a] hover:text-white'
              }`}
              onClick={() => setActiveTab('templates')}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>نماذج جاهزة</span>
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                activeTab === 'alerts' ? 'bg-[#f0b429] text-[#10151c] font-bold' : 'text-[#7d8b9a] hover:text-white'
              }`}
              onClick={() => setActiveTab('alerts')}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>التنبيهات ({activeAlerts.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#222d3a] text-[#7d8b9a] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB 1: CODE EDITOR */}
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Editor Action Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#18202a] border-b border-[#2a3542]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value)}
                  placeholder="اسم المؤشر..."
                  className="bg-[#10151c] border border-[#2a3542] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#f0b429] font-medium w-48"
                />
                {compileStatus === 'success' && (
                  <span className="flex items-center gap-1 text-[11px] text-[#26a69a] font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>تم التحقق بدون أخطاء</span>
                  </span>
                )}
                {compileStatus === 'error' && (
                  <span className="flex items-center gap-1 text-[11px] text-[#ef5350] font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>يوجد أخطاء في الكود</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCompile}
                  className="px-3 py-1.5 rounded bg-[#222d3a] hover:bg-[#2c3a4a] text-white border border-[#2a3542] font-medium flex items-center gap-1.5 transition-colors"
                  title="التحقق من صحة الكود والمخرجات"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-[#26a69a]" />
                  <span>التحقق (Compile)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-1.5 rounded bg-[#222d3a] hover:bg-[#2c3a4a] text-white border border-[#2a3542] font-medium flex items-center gap-1.5 transition-colors"
                  title="حفظ في قائمة المؤشرات الخاصة"
                >
                  <Save className="w-3.5 h-3.5 text-[#f0b429]" />
                  <span>حفظ المؤشر</span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyToChart}
                  className="px-4 py-1.5 rounded bg-[#26a69a] hover:bg-[#2bbbad] text-[#10151c] font-bold shadow-md flex items-center gap-1.5 transition-colors"
                  title="تطبيق وتشغيل المؤشر على الشارت مباشرة"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>تطبيق على الشارت (Add to Chart)</span>
                </button>
              </div>
            </div>

            {/* Code Textarea Area with line numbers */}
            <div className="flex-1 flex overflow-hidden bg-[#10151c] font-mono text-xs">
              {/* Line Numbers */}
              <div className="w-12 bg-[#141b24] text-[#7d8b9a] py-3 text-right pr-2 select-none border-r border-[#2a3542] overflow-hidden leading-5">
                {lines.map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={sourceCode}
                onChange={(e) => {
                  setSourceCode(e.target.value);
                  setCompileStatus('idle');
                }}
                spellCheck={false}
                className="flex-1 p-3 bg-transparent text-[#d5dde6] focus:outline-none resize-none overflow-y-auto leading-5"
                placeholder="// اكتب كود باين سكريبت هنا أو الصقه من TradingView..."
              />
            </div>

            {/* Compiler Console / Diagnostics Output */}
            {diagnostics.length > 0 && (
              <div className="h-28 bg-[#141b24] border-t border-[#2a3542] p-2 overflow-y-auto">
                <div className="text-[11px] font-bold text-[#7d8b9a] mb-1">
                  سجل المترجم (Compiler Diagnostics):
                </div>
                {diagnostics.map((diag, i) => (
                  <div
                    key={i}
                    className={`text-[11px] flex items-center gap-2 py-0.5 ${
                      diag.severity === 'error' ? 'text-[#ef5350]' : 'text-[#ff9f43]'
                    }`}
                  >
                    <span>{diag.severity === 'error' ? '❌' : '⚠️'}</span>
                    <span className="font-mono">
                      [سطر {diag.line}, عمود {diag.column}]:
                    </span>
                    <span>{diag.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY SAVED INDICATORS */}
        {activeTab === 'myIndicators' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <h3 className="text-sm font-bold text-white mb-3">مكتبة مؤشراتك الخاصة المحفوظة</h3>
            {savedIndicators.length === 0 ? (
              <div className="text-center py-16 text-[#7d8b9a]">
                لم تقم بحفظ أي مؤشرات مخصصة حتى الآن.
                <br />
                يمكنك كتابة كود باين سكريبت والضغط على زر "حفظ المؤشر".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedIndicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="p-3 rounded-lg bg-[#141b24] border border-[#2a3542] flex flex-col justify-between"
                  >
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-sm">{ind.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#222d3a] text-[#7d8b9a]">
                          {ind.overlay ? 'Overlay شارت السعر' : 'Subpanel نافذة سفلية'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#7d8b9a]">
                        Pine Script v{ind.version} • تم التحديث:{' '}
                        {new Date(ind.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2a3542]">
                      <button
                        type="button"
                        onClick={() => {
                          setSourceCode(ind.code);
                          setScriptTitle(ind.name);
                          setActiveTab('editor');
                        }}
                        className="px-2.5 py-1 rounded bg-[#222d3a] hover:bg-[#2c3a4a] text-white text-xs"
                      >
                        فتح في المحرر
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRunOnChart(ind);
                          onClose();
                        }}
                        className="px-3 py-1 rounded bg-[#26a69a] hover:bg-[#2bbbad] text-[#10151c] font-bold text-xs"
                      >
                        تطبيق على الشارت
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSavedIndicator(ind.id)}
                        className="p-1 rounded hover:bg-[#222d3a] text-[#ef5350]"
                        title="حذف المؤشر"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: READY-TO-USE PINE TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <h3 className="text-sm font-bold text-white mb-2">نماذج باين سكريبت جاهزة للاستخدام</h3>
            <p className="text-xs text-[#7d8b9a] mb-4">
              نماذج احترافية مكتوبة بـ Pine Script v5 يمكنك تحميلها وتعديلها أو تطبيقها على الشارت مباشرة:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PINE_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-4 rounded-lg bg-[#141b24] border border-[#2a3542] hover:border-[#f0b429] transition-colors flex flex-col justify-between"
                >
                  <div className="mb-3">
                    <div className="font-bold text-white text-sm mb-1">{tmpl.name}</div>
                    <div className="text-[11px] text-[#f0b429] mb-1.5">{tmpl.nameAr}</div>
                    <p className="text-[11px] text-[#7d8b9a] leading-relaxed">{tmpl.description}</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#2a3542]">
                    <button
                      type="button"
                      onClick={() => {
                        setSourceCode(tmpl.code);
                        setScriptTitle(tmpl.name);
                        setActiveTab('editor');
                      }}
                      className="px-3 py-1.5 rounded bg-[#222d3a] hover:bg-[#2c3a4a] text-white text-xs font-medium"
                    >
                      تحميل في المحرر (Load)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ALERTS MANAGEMENT */}
        {activeTab === 'alerts' && (
          <div className="flex-1 p-5 overflow-y-auto">
            <h3 className="text-sm font-bold text-white mb-3">التنبيهات المخصصة المشتقة من Pine Script</h3>
            {activeAlerts.length === 0 ? (
              <div className="text-center py-16 text-[#7d8b9a]">
                لا توجد تنبيهات مفعلة حالياً.
                <br />
                يمكنك كتابة شروط `alertcondition()` في مؤشرك لتفعيل التنبيهات اللحظية.
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3 rounded-lg bg-[#141b24] border border-[#2a3542] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <span>{alt.conditionName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#222d3a] text-[#f0b429]">
                          {alt.symbol} • {alt.timeframe}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#7d8b9a] mt-0.5">
                        الرسالة: {alt.messageTemplate}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleAlert(alt.id)}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          alt.active ? 'bg-[#26a69a]/20 text-[#26a69a]' : 'bg-[#ef5350]/20 text-[#ef5350]'
                        }`}
                      >
                        {alt.active ? 'مفعل (Active)' : 'معطل (Disabled)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAlert(alt.id)}
                        className="p-1 rounded hover:bg-[#222d3a] text-[#ef5350]"
                        title="حذف التنبيه"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
