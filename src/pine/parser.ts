/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CompilerDiagnostic,
  PineAlertConditionDef,
  PineHlineDef,
  PineInputDef,
  PinePlotDef,
  PineScriptMetadata,
  PineShapeDef,
} from './types';

export class PineScriptParser {
  /**
   * Parses Pine Script source code to extract metadata, inputs, plots, and diagnostics
   */
  public static parse(source: string): {
    metadata: PineScriptMetadata;
    diagnostics: CompilerDiagnostic[];
  } {
    const diagnostics: CompilerDiagnostic[] = [];
    const lines = source.split(/\r?\n/);

    let version = 5;
    let title = 'Custom Pine Indicator';
    let shorttitle = 'Pine';
    let overlay = false;
    const inputs: PineInputDef[] = [];
    const plots: PinePlotDef[] = [];
    const shapes: PineShapeDef[] = [];
    const hlines: PineHlineDef[] = [];
    const alertConditions: PineAlertConditionDef[] = [];

    // Track declared variable names
    const declaredVars = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Check comments
      if (trimmed.startsWith('//')) {
        const vMatch = trimmed.match(/\/\/\s*@version\s*=\s*([0-9]+)/);
        if (vMatch) {
          version = parseInt(vMatch[1], 10);
        }
        continue;
      }

      if (!trimmed) continue;

      // 1. indicator() / strategy() declaration
      if (trimmed.startsWith('indicator(') || trimmed.startsWith('strategy(')) {
        const argsStr = this.extractArgsString(trimmed);
        const titleMatch = argsStr.match(/(?:title\s*=\s*)?["']([^"']+)["']/);
        if (titleMatch) {
          title = titleMatch[1];
          shorttitle = titleMatch[1];
        }

        const shortTitleMatch = argsStr.match(/shorttitle\s*=\s*["']([^"']+)["']/);
        if (shortTitleMatch) {
          shorttitle = shortTitleMatch[1];
        }

        const overlayMatch = argsStr.match(/overlay\s*=\s*(true|false)/);
        if (overlayMatch) {
          overlay = overlayMatch[1] === 'true';
        }
        continue;
      }

      // 2. inputs: var_name = input.type(...) or input(...)
      const inputAssignMatch = trimmed.match(
        /^(?:var\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(input(?:\.[a-zA-Z_]+)?)\((.*)\)/
      );
      if (inputAssignMatch) {
        const varName = inputAssignMatch[1];
        const inputMethod = inputAssignMatch[2];
        const argsStr = inputAssignMatch[3];

        declaredVars.add(varName);

        const inputDef = this.parseInputDef(varName, inputMethod, argsStr);
        inputs.push(inputDef);
        continue;
      }

      // 3. plot(...)
      if (trimmed.startsWith('plot(')) {
        const argsStr = this.extractArgsString(trimmed);
        const plotDef = this.parsePlotDef(plots.length, argsStr);
        plots.push(plotDef);
        continue;
      }

      // 4. plotshape(...)
      if (trimmed.startsWith('plotshape(')) {
        const argsStr = this.extractArgsString(trimmed);
        const shapeDef = this.parseShapeDef(shapes.length, argsStr);
        shapes.push(shapeDef);
        continue;
      }

      // 5. hline(...)
      if (trimmed.startsWith('hline(')) {
        const argsStr = this.extractArgsString(trimmed);
        const hlineDef = this.parseHlineDef(argsStr);
        if (hlineDef) {
          hlines.push(hlineDef);
        }
        continue;
      }

      // 6. alertcondition(...)
      if (trimmed.startsWith('alertcondition(')) {
        const argsStr = this.extractArgsString(trimmed);
        const alertDef = this.parseAlertConditionDef(alertConditions.length, argsStr);
        if (alertDef) {
          alertConditions.push(alertDef);
        }
        continue;
      }

      // Detect syntax typos / unmatched brackets
      const openParens = (trimmed.match(/\(/g) || []).length;
      const closeParens = (trimmed.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        diagnostics.push({
          line: lineNum,
          column: trimmed.length,
          message: 'أقواس غير متطابقة (Unmatched parentheses)',
          severity: 'error',
        });
      }
    }

    if (version < 5) {
      diagnostics.push({
        line: 1,
        column: 1,
        message: `تم اكتشاف Pine Script v${version}. يُنصح بالترقية إلى //@version=5 أو //@version=6 للحصول على أفضل توافقية.`,
        severity: 'warning',
      });
    }

    const metadata: PineScriptMetadata = {
      title,
      shorttitle,
      overlay,
      version,
      inputs,
      plots,
      shapes,
      hlines,
      alertConditions,
    };

    return { metadata, diagnostics };
  }

  private static extractArgsString(line: string): string {
    const firstParen = line.indexOf('(');
    const lastParen = line.lastIndexOf(')');
    if (firstParen !== -1 && lastParen !== -1 && lastParen > firstParen) {
      return line.slice(firstParen + 1, lastParen);
    }
    return '';
  }

  private static parseInputDef(varName: string, method: string, argsStr: string): PineInputDef {
    let type: 'int' | 'float' | 'bool' | 'string' | 'color' | 'source' = 'float';
    if (method.includes('.int')) type = 'int';
    else if (method.includes('.bool')) type = 'bool';
    else if (method.includes('.string')) type = 'string';
    else if (method.includes('.color')) type = 'color';
    else if (method.includes('.source')) type = 'source';

    // Parse arguments: default value, title/name, minval, maxval, step, options
    const args = this.splitArgs(argsStr);
    let defaultVal: any = type === 'int' ? 14 : type === 'bool' ? true : type === 'color' ? '#f0b429' : 14.0;
    let name = varName;
    let min: number | undefined;
    let max: number | undefined;
    let step: number | undefined;
    let options: string[] | undefined;

    if (args.length > 0 && args[0].trim()) {
      const firstArg = args[0].trim();
      if (type === 'bool') {
        defaultVal = firstArg === 'true';
      } else if (type === 'int') {
        defaultVal = parseInt(firstArg, 10) || 14;
      } else if (type === 'float') {
        defaultVal = parseFloat(firstArg) || 14.0;
      } else if (type === 'color') {
        defaultVal = this.parseColorValue(firstArg);
      } else if (type === 'source') {
        defaultVal = firstArg;
      } else {
        defaultVal = firstArg.replace(/["']/g, '');
      }
    }

    if (args.length > 1 && args[1].trim()) {
      const secondArg = args[1].trim();
      const titleMatch = secondArg.match(/["']([^"']+)["']/);
      if (titleMatch) {
        name = titleMatch[1];
      }
    }

    // Check named params: title="...", minval=..., maxval=..., step=...
    argsStr.replace(/title\s*=\s*["']([^"']+)["']/g, (_, t) => {
      name = t;
      return '';
    });
    argsStr.replace(/defval\s*=\s*([^,]+)/g, (_, val) => {
      const v = val.trim();
      if (type === 'bool') defaultVal = v === 'true';
      else if (type === 'int') defaultVal = parseInt(v, 10);
      else if (type === 'float') defaultVal = parseFloat(v);
      else if (type === 'color') defaultVal = this.parseColorValue(v);
      return '';
    });
    argsStr.replace(/minval\s*=\s*([0-9.-]+)/g, (_, val) => {
      min = parseFloat(val);
      return '';
    });
    argsStr.replace(/maxval\s*=\s*([0-9.-]+)/g, (_, val) => {
      max = parseFloat(val);
      return '';
    });
    argsStr.replace(/step\s*=\s*([0-9.-]+)/g, (_, val) => {
      step = parseFloat(val);
      return '';
    });

    return {
      id: varName,
      name,
      type,
      default: defaultVal,
      min,
      max,
      step,
      options,
    };
  }

  private static parsePlotDef(index: number, argsStr: string): PinePlotDef {
    let title = `Plot ${index + 1}`;
    let color = '#4aa3ff';
    let lineWidth = 1.5;
    let style: 'line' | 'histogram' | 'cross' | 'circles' | 'area' | 'columns' = 'line';

    const titleMatch = argsStr.match(/(?:title\s*=\s*)?["']([^"']+)["']/);
    if (titleMatch) title = titleMatch[1];

    const colorMatch = argsStr.match(/color\s*=\s*([a-zA-Z0-9_.#]+)/);
    if (colorMatch) color = this.parseColorValue(colorMatch[1]);

    const widthMatch = argsStr.match(/linewidth\s*=\s*([0-9]+)/);
    if (widthMatch) lineWidth = parseInt(widthMatch[1], 10);

    if (argsStr.includes('plot.style_histogram')) style = 'histogram';
    else if (argsStr.includes('plot.style_cross')) style = 'cross';
    else if (argsStr.includes('plot.style_circles')) style = 'circles';
    else if (argsStr.includes('plot.style_area')) style = 'area';
    else if (argsStr.includes('plot.style_columns')) style = 'columns';

    return {
      id: `plot_${index}`,
      title,
      color,
      lineWidth,
      style,
    };
  }

  private static parseShapeDef(index: number, argsStr: string): PineShapeDef {
    let title = `Shape ${index + 1}`;
    let style: 'triangleup' | 'triangledown' | 'circle' | 'square' | 'labelup' | 'labeldown' | 'cross' | 'flag' =
      'triangleup';
    let location: 'abovebar' | 'belowbar' | 'top' | 'bottom' | 'absolute' = 'belowbar';
    let color = '#26a69a';
    let size: 'auto' | 'tiny' | 'small' | 'normal' | 'large' | 'huge' = 'small';
    let text: string | undefined;

    const titleMatch = argsStr.match(/title\s*=\s*["']([^"']+)["']/);
    if (titleMatch) title = titleMatch[1];

    if (argsStr.includes('shape.triangledown')) style = 'triangledown';
    else if (argsStr.includes('shape.circle')) style = 'circle';
    else if (argsStr.includes('shape.labelup')) style = 'labelup';
    else if (argsStr.includes('shape.labeldown')) style = 'labeldown';
    else if (argsStr.includes('shape.flag')) style = 'flag';

    if (argsStr.includes('location.abovebar')) location = 'abovebar';
    else if (argsStr.includes('location.top')) location = 'top';
    else if (argsStr.includes('location.bottom')) location = 'bottom';

    const colorMatch = argsStr.match(/color\s*=\s*([a-zA-Z0-9_.#]+)/);
    if (colorMatch) color = this.parseColorValue(colorMatch[1]);

    const textMatch = argsStr.match(/text\s*=\s*["']([^"']+)["']/);
    if (textMatch) text = textMatch[1];

    return {
      id: `shape_${index}`,
      title,
      style,
      location,
      color,
      size,
      text,
    };
  }

  private static parseHlineDef(argsStr: string): PineHlineDef | null {
    const args = this.splitArgs(argsStr);
    if (!args.length) return null;

    const price = parseFloat(args[0]) || 0;
    let title = `${price}`;
    let color = '#7d8b9a';
    let linestyle: 'solid' | 'dashed' | 'dotted' = 'dashed';
    let lineWidth = 1;

    if (args.length > 1) {
      const tm = args[1].match(/["']([^"']+)["']/);
      if (tm) title = tm[1];
    }

    const colorMatch = argsStr.match(/color\s*=\s*([a-zA-Z0-9_.#]+)/);
    if (colorMatch) color = this.parseColorValue(colorMatch[1]);

    if (argsStr.includes('hline.style_solid')) linestyle = 'solid';
    else if (argsStr.includes('hline.style_dotted')) linestyle = 'dotted';

    return {
      price,
      title,
      color,
      linestyle,
      lineWidth,
    };
  }

  private static parseAlertConditionDef(index: number, argsStr: string): PineAlertConditionDef | null {
    const args = this.splitArgs(argsStr);
    if (!args.length) return null;

    const conditionVar = args[0].trim();
    let title = `Alert Condition ${index + 1}`;
    let message = 'Alert triggered on {{ticker}}';

    if (args.length > 1) {
      const tm = args[1].match(/["']([^"']+)["']/);
      if (tm) title = tm[1];
    }
    if (args.length > 2) {
      const mm = args[2].match(/["']([^"']+)["']/);
      if (mm) message = mm[1];
    }

    return {
      id: `alert_cond_${index}`,
      conditionVar,
      title,
      message,
    };
  }

  private static splitArgs(argsStr: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    let parenDepth = 0;

    for (let i = 0; i < argsStr.length; i++) {
      const c = argsStr[i];
      if ((c === '"' || c === "'") && (i === 0 || argsStr[i - 1] !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = c;
        } else if (c === quoteChar) {
          inQuote = false;
        }
      }
      if (!inQuote) {
        if (c === '(' || c === '[') parenDepth++;
        else if (c === ')' || c === ']') parenDepth--;
        else if (c === ',' && parenDepth === 0) {
          result.push(current.trim());
          current = '';
          continue;
        }
      }
      current += c;
    }
    if (current.trim()) result.push(current.trim());
    return result;
  }

  public static parseColorValue(str: string): string {
    const s = str.trim().toLowerCase();
    if (s.startsWith('#')) return s;
    if (s.includes('color.green')) return '#26a69a';
    if (s.includes('color.red')) return '#ef5350';
    if (s.includes('color.blue')) return '#4aa3ff';
    if (s.includes('color.yellow')) return '#f0b429';
    if (s.includes('color.purple')) return '#b57cff';
    if (s.includes('color.orange')) return '#ff9f43';
    if (s.includes('color.aqua') || s.includes('color.teal')) return '#00d2d3';
    if (s.includes('color.gray') || s.includes('color.silver')) return '#7d8b9a';
    if (s.includes('color.white')) return '#ffffff';
    if (s.includes('color.black')) return '#10151c';
    return '#f0b429';
  }
}
