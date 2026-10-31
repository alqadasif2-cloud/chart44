/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DrawingItem, DrawingPoint } from '../types/chart';

export interface ChartCoordinateMapper {
  timeToX: (t: number) => number;
  priceToY: (p: number) => number;
  xToTime: (x: number) => number;
  yToPrice: (y: number) => number;
  chartWidth: number;
  chartHeight: number;
}

const FIB_RETRACEMENT_LEVELS = [
  { level: 0, color: '#787b86', label: '0.0%' },
  { level: 0.236, color: '#f23645', label: '23.6%' },
  { level: 0.382, color: '#ff9800', label: '38.2%' },
  { level: 0.5, color: '#4caf50', label: '50.0%' },
  { level: 0.618, color: '#089981', label: '61.8%' },
  { level: 0.786, color: '#00bcd4', label: '78.6%' },
  { level: 1.0, color: '#787b86', label: '100.0%' },
  { level: 1.618, color: '#2962ff', label: '161.8%' },
];

export function renderDrawing(
  ctx: CanvasRenderingContext2D,
  item: DrawingItem,
  mapper: ChartCoordinateMapper,
  isSelected: boolean
): void {
  if (item.visible === false || item.points.length === 0) return;

  const { timeToX, priceToY, chartWidth, chartHeight } = mapper;
  const p1 = item.points[0];
  const x1 = timeToX(p1.t);
  const y1 = priceToY(p1.p);

  ctx.save();
  ctx.strokeStyle = item.color || '#f0b429';
  ctx.fillStyle = item.color || '#f0b429';
  ctx.lineWidth = item.lineWidth || 1.5;
  ctx.font = '11px system-ui, sans-serif';

  switch (item.type) {
    case 'hline': {
      ctx.beginPath();
      ctx.moveTo(0, y1);
      ctx.lineTo(chartWidth, y1);
      ctx.stroke();

      // Price Tag on Right Axis
      ctx.fillRect(chartWidth, y1 - 9, 62, 18);
      ctx.fillStyle = '#10151c';
      ctx.textAlign = 'left';
      ctx.fillText(p1.p.toFixed(2), chartWidth + 4, y1 + 4);
      break;
    }

    case 'vline': {
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, chartHeight);
      ctx.stroke();

      // Date Tag on Bottom Axis
      const d = new Date(p1.t * 1000);
      const str = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      ctx.fillStyle = '#222d3a';
      ctx.fillRect(x1 - 35, chartHeight - 16, 70, 16);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(str, x1, chartHeight - 4);
      break;
    }

    case 'trend':
    case 'ray':
    case 'extended': {
      if (item.points.length < 2) break;
      const p2 = item.points[1];
      const x2 = timeToX(p2.t);
      const y2 = priceToY(p2.p);

      ctx.beginPath();
      if (item.type === 'trend') {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      } else if (item.type === 'ray') {
        const dx = x2 - x1;
        const dy = y2 - y1;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + dx * 100, y1 + dy * 100);
      } else {
        // Extended both ways
        const dx = x2 - x1;
        const dy = y2 - y1;
        ctx.moveTo(x1 - dx * 100, y1 - dy * 100);
        ctx.lineTo(x2 + dx * 100, y2 + dy * 100);
      }
      ctx.stroke();
      break;
    }

    case 'rect':
    case 'zone': {
      if (item.points.length < 2) break;
      const p2 = item.points[1];
      const x2 = timeToX(p2.t);
      const y2 = priceToY(p2.p);

      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1);
      const rh = Math.abs(y2 - y1);

      ctx.globalAlpha = item.type === 'zone' ? 0.25 : 0.15;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.globalAlpha = 1;
      ctx.strokeRect(rx, ry, rw, rh);
      break;
    }

    case 'channel': {
      if (item.points.length < 2) break;
      const p2 = item.points[1];
      const x2 = timeToX(p2.t);
      const y2 = priceToY(p2.p);

      const channelOffset = item.extra?.channelHeight || 40;

      // Base Line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Parallel Top Line
      ctx.beginPath();
      ctx.moveTo(x1, y1 - channelOffset);
      ctx.lineTo(x2, y2 - channelOffset);
      ctx.stroke();

      // Midline dashed
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1 - channelOffset / 2);
      ctx.lineTo(x2, y2 - channelOffset / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fill Channel
      ctx.globalAlpha = 0.08;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y2 - channelOffset);
      ctx.lineTo(x1, y1 - channelOffset);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }

    case 'fibRetracement': {
      if (item.points.length < 2) break;
      const p2 = item.points[1];
      const x2 = timeToX(p2.t);
      const priceDiff = p2.p - p1.p;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);

      FIB_RETRACEMENT_LEVELS.forEach((fib) => {
        const targetPrice = p1.p + priceDiff * fib.level;
        const targetY = priceToY(targetPrice);

        ctx.strokeStyle = fib.color;
        ctx.fillStyle = fib.color;
        ctx.beginPath();
        ctx.moveTo(minX, targetY);
        ctx.lineTo(maxX + 120, targetY);
        ctx.stroke();

        ctx.fillText(`${fib.label} (${targetPrice.toFixed(2)})`, maxX + 10, targetY - 3);
      });
      break;
    }

    case 'longPosition':
    case 'shortPosition': {
      if (item.points.length < 2) break;
      const entryPrice = p1.p;
      const targetPoint = item.points[1];
      const stopPrice = item.extra?.stopPrice ?? (item.type === 'longPosition' ? entryPrice * 0.98 : entryPrice * 1.02);
      const targetPrice = targetPoint.p;

      const entryY = priceToY(entryPrice);
      const targetY = priceToY(targetPrice);
      const stopY = priceToY(stopPrice);
      const x2 = timeToX(targetPoint.t);
      const leftX = Math.min(x1, x2);
      const width = Math.max(80, Math.abs(x2 - x1));

      const risk = Math.abs(entryPrice - stopPrice);
      const reward = Math.abs(targetPrice - entryPrice);
      const rrRatio = risk > 0 ? (reward / risk).toFixed(2) : '0';

      // Profit Target Box (Green)
      ctx.fillStyle = 'rgba(38, 166, 154, 0.25)';
      ctx.strokeStyle = '#26a69a';
      const targetBoxTop = Math.min(entryY, targetY);
      const targetBoxH = Math.abs(entryY - targetY);
      ctx.fillRect(leftX, targetBoxTop, width, targetBoxH);
      ctx.strokeRect(leftX, targetBoxTop, width, targetBoxH);

      // Stop Loss Box (Red)
      ctx.fillStyle = 'rgba(239, 83, 80, 0.25)';
      ctx.strokeStyle = '#ef5350';
      const stopBoxTop = Math.min(entryY, stopY);
      const stopBoxH = Math.abs(entryY - stopY);
      ctx.fillRect(leftX, stopBoxTop, width, stopBoxH);
      ctx.strokeRect(leftX, stopBoxTop, width, stopBoxH);

      // Info Badge
      ctx.fillStyle = '#18202a';
      ctx.fillRect(leftX, entryY - 12, width, 24);
      ctx.strokeStyle = '#2a3542';
      ctx.strokeRect(leftX, entryY - 12, width, 24);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${item.type === 'longPosition' ? 'Long' : 'Short'} R:R ${rrRatio}`,
        leftX + width / 2,
        entryY + 4
      );
      break;
    }

    case 'priceRange': {
      if (item.points.length < 2) break;
      const p2 = item.points[1];
      const x2 = timeToX(p2.t);
      const y2 = priceToY(p2.p);

      const diff = p2.p - p1.p;
      const percent = ((diff / (p1.p || 1)) * 100).toFixed(2);
      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.max(30, Math.abs(x2 - x1));
      const rh = Math.abs(y2 - y1);

      ctx.fillStyle = diff >= 0 ? 'rgba(38, 166, 154, 0.2)' : 'rgba(239, 83, 80, 0.2)';
      ctx.strokeStyle = diff >= 0 ? '#26a69a' : '#ef5350';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${percent}%)`,
        rx + rw / 2,
        ry + rh / 2
      );
      break;
    }

    case 'dateRange': {
      if (item.points.length < 2) break;
      const p2 = item.points[1];
      const x2 = timeToX(p2.t);
      const rx = Math.min(x1, x2);
      const rw = Math.abs(x2 - x1);
      const secDiff = Math.abs(p2.t - p1.t);
      const days = (secDiff / 86400).toFixed(1);
      const hours = (secDiff / 3600).toFixed(1);

      ctx.fillStyle = 'rgba(74, 163, 255, 0.15)';
      ctx.fillRect(rx, 0, rw, chartHeight);
      ctx.strokeStyle = '#4aa3ff';
      ctx.strokeRect(rx, 0, rw, chartHeight);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`${days} days (${hours}h)`, rx + rw / 2, chartHeight / 2);
      break;
    }

    case 'text': {
      const text = item.text || 'ملاحظة تحليلية';
      ctx.fillStyle = '#18202a';
      ctx.strokeStyle = '#f0b429';
      const textWidth = ctx.measureText(text).width + 16;
      ctx.fillRect(x1, y1 - 20, textWidth, 26);
      ctx.strokeRect(x1, y1 - 20, textWidth, 26);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(text, x1 + 8, y1 - 3);
      break;
    }

    case 'arrow': {
      if (item.points.length < 2) break;
      const p2 = item.points[1];
      const x2 = timeToX(p2.t);
      const y2 = priceToY(p2.p);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 12;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
      break;
    }
  }

  // Anchor selection handles
  if (isSelected) {
    item.points.forEach((pt) => {
      const hx = timeToX(pt.t);
      const hy = priceToY(pt.p);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  ctx.restore();
}

export function loadSavedDrawings(symbol: string, tf: string): DrawingItem[] {
  try {
    const raw = localStorage.getItem(`cchart_drawings_${symbol}_${tf}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function persistDrawings(symbol: string, tf: string, drawings: DrawingItem[]): void {
  try {
    localStorage.setItem(`cchart_drawings_${symbol}_${tf}`, JSON.stringify(drawings));
  } catch {
    // ignore
  }
}
