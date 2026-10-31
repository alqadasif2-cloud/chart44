/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PineInputType = 'int' | 'float' | 'bool' | 'string' | 'color' | 'source';

export interface PineInputDef {
  id: string;
  name: string;
  type: PineInputType;
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  group?: string;
  inline?: string;
}

export interface PinePlotDef {
  id: string;
  title: string;
  color: string;
  lineWidth: number;
  style: 'line' | 'histogram' | 'cross' | 'circles' | 'area' | 'columns';
}

export interface PineShapeDef {
  id: string;
  title: string;
  style: 'triangleup' | 'triangledown' | 'circle' | 'square' | 'labelup' | 'labeldown' | 'cross' | 'flag';
  location: 'abovebar' | 'belowbar' | 'top' | 'bottom' | 'absolute';
  color: string;
  size: 'auto' | 'tiny' | 'small' | 'normal' | 'large' | 'huge';
  text?: string;
}

export interface PineHlineDef {
  price: number;
  title: string;
  color: string;
  linestyle: 'solid' | 'dashed' | 'dotted';
  lineWidth: number;
}

export interface PineAlertConditionDef {
  id: string;
  conditionVar: string;
  title: string;
  message: string;
}

export interface PineScriptMetadata {
  title: string;
  shorttitle: string;
  overlay: boolean;
  version: number;
  inputs: PineInputDef[];
  plots: PinePlotDef[];
  shapes: PineShapeDef[];
  hlines: PineHlineDef[];
  alertConditions: PineAlertConditionDef[];
}

export interface PineExecutionResult {
  overlay: boolean;
  title: string;
  plots: {
    def: PinePlotDef;
    values: (number | null)[];
  }[];
  shapes: {
    def: PineShapeDef;
    items: {
      barIndex: number;
      price: number;
      color?: string;
      text?: string;
    }[];
  }[];
  hlines: PineHlineDef[];
  bgColors: (string | null)[];
  barColors: (string | null)[];
  alertsFired: {
    conditionId: string;
    title: string;
    message: string;
    barIndex: number;
    time: number;
    price: number;
  }[];
}

export interface CustomPineIndicator {
  id: string;
  name: string;
  code: string;
  version: number;
  overlay: boolean;
  inputValues: Record<string, any>;
  visible: boolean;
  metadata?: PineScriptMetadata;
  executionResult?: PineExecutionResult;
  lastError?: string | null;
  updatedAt: number;
}

export interface PineAlert {
  id: string;
  indicatorId: string;
  indicatorName: string;
  symbol: string;
  timeframe: string;
  conditionName: string;
  messageTemplate: string;
  triggerType: 'once_per_bar' | 'once_per_bar_close';
  sound: boolean;
  popup: boolean;
  telegramWebhook?: string;
  active: boolean;
  createdAt: number;
  history: {
    time: number;
    message: string;
    price: number;
  }[];
}

export interface CompilerDiagnostic {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}
