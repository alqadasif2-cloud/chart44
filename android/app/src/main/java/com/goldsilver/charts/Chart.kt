package com.goldsilver.charts

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.util.Locale
import kotlin.math.abs

val UpColor = Color(0xFF26A69A)
val DownColor = Color(0xFFEF5350)
private val GridColor = Color(0x1FFFFFFF)
private val SmaColor = Color(0xFF42A5F5)

fun fmt(v: Double): String =
    if (abs(v) >= 1000) String.format(Locale.US, "%.2f", v) else String.format(Locale.US, "%.3f", v)

fun shortTime(t: String): String = when {
    t.length >= 16 -> t.substring(5, 16)
    t.length >= 10 -> t.substring(5)
    else -> t
}

private fun indexAt(x: Float, plotW: Float, n: Int): Int =
    ((x / plotW) * n).toInt().coerceIn(0, n - 1)

@Composable
fun CandleChart(
    candles: List<Candle>,
    showSma: Boolean,
    selected: Int?,
    onSelect: (Int?) -> Unit,
    modifier: Modifier = Modifier,
) {
    val measurer = rememberTextMeasurer()
    val density = LocalDensity.current
    val rightPad = with(density) { 58.dp.toPx() }
    val bottomPad = with(density) { 20.dp.toPx() }
    val labelStyle = remember { TextStyle(color = Color(0xFF9AA0A6), fontSize = 10.sp) }

    Canvas(
        modifier = modifier.pointerInput(candles) {
            if (candles.isEmpty()) return@pointerInput
            val plotW = size.width - rightPad
            detectDragGestures(
                onDragStart = { onSelect(indexAt(it.x, plotW, candles.size)) },
                onDrag = { change, _ ->
                    change.consume()
                    onSelect(indexAt(change.position.x, plotW, candles.size))
                },
                onDragEnd = { onSelect(null) },
                onDragCancel = { onSelect(null) },
            )
        },
    ) {
        if (candles.isEmpty()) return@Canvas
        val n = candles.size
        val plotW = size.width - rightPad
        val plotH = size.height - bottomPad

        var hi = candles.maxOf { it.high }
        var lo = candles.minOf { it.low }
        val pad = (hi - lo).coerceAtLeast(1e-6) * 0.06
        hi += pad
        lo -= pad
        fun y(p: Double): Float = ((hi - p) / (hi - lo) * plotH).toFloat()
        val slot = plotW / n

        // الشبكة وتسميات الأسعار
        for (i in 0..4) {
            val p = lo + (hi - lo) * i / 4
            val yy = y(p)
            drawLine(GridColor, Offset(0f, yy), Offset(plotW, yy), strokeWidth = 1f)
            val t = measurer.measure(fmt(p), labelStyle)
            drawText(t, topLeft = Offset(plotW + 6f, yy - t.size.height / 2f))
        }

        // تسميات الوقت
        for (i in 0..3) {
            val idx = (i * (n - 1)) / 3
            val t = measurer.measure(shortTime(candles[idx].time), labelStyle)
            val cx = slot * (idx + 0.5f)
            val x = (cx - t.size.width / 2f).coerceIn(0f, plotW - t.size.width)
            drawText(t, topLeft = Offset(x, plotH + 4f))
        }

        // الشموع
        candles.forEachIndexed { i, c ->
            val cx = slot * (i + 0.5f)
            val col = if (c.close >= c.open) UpColor else DownColor
            drawLine(col, Offset(cx, y(c.high)), Offset(cx, y(c.low)), strokeWidth = 1.5f)
            val top = y(maxOf(c.open, c.close))
            val bot = y(minOf(c.open, c.close))
            drawRect(
                col,
                topLeft = Offset(cx - slot * 0.35f, top),
                size = Size(slot * 0.7f, (bot - top).coerceAtLeast(1.5f)),
            )
        }

        // المتوسط المتحرك SMA 20
        if (showSma && n >= 20) {
            val path = Path()
            var started = false
            for (i in 19 until n) {
                var sum = 0.0
                for (k in i - 19..i) sum += candles[k].close
                val px = slot * (i + 0.5f)
                val py = y(sum / 20)
                if (!started) {
                    path.moveTo(px, py)
                    started = true
                } else {
                    path.lineTo(px, py)
                }
            }
            drawPath(path, SmaColor, style = Stroke(width = 2.5f))
        }

        // خط آخر سعر
        val last = candles.last()
        val lastCol = if (last.close >= last.open) UpColor else DownColor
        val ly = y(last.close)
        drawLine(
            lastCol, Offset(0f, ly), Offset(plotW, ly),
            strokeWidth = 1f,
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f)),
        )
        val lt = measurer.measure(fmt(last.close), labelStyle.copy(color = Color.White))
        drawRect(
            lastCol,
            topLeft = Offset(plotW + 2f, ly - lt.size.height / 2f - 2f),
            size = Size(lt.size.width + 8f, lt.size.height + 4f),
        )
        drawText(lt, topLeft = Offset(plotW + 6f, ly - lt.size.height / 2f))

        // مؤشر التحديد
        if (selected != null && selected in 0 until n) {
            val sx = slot * (selected + 0.5f)
            val sy = y(candles[selected].close)
            drawLine(Color(0x99FFFFFF), Offset(sx, 0f), Offset(sx, plotH), strokeWidth = 1f)
            drawLine(Color(0x99FFFFFF), Offset(0f, sy), Offset(plotW, sy), strokeWidth = 1f)
        }
    }
}
