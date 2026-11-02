package com.goldsilver.charts

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.delay
import java.util.Locale

private val Bg = Color(0xFF0F1115)
private val CardBg = Color(0xFF181B21)
private val Gold = Color(0xFFFFC107)
private val Silver = Color(0xFFB0BEC5)
private val Muted = Color(0xFF9AA0A6)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
        )
        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Gold,
                    background = Bg,
                    surface = CardBg,
                    onSurface = Color.White,
                    onBackground = Color.White,
                ),
            ) {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    AppScreen()
                }
            }
        }
    }
}

@Composable
fun AppScreen(vm: MainViewModel = viewModel()) {
    val ui = vm.ui
    val market = MARKETS[ui.market]
    val accent = if (ui.market == 0) Gold else Silver

    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(lifecycle) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            while (true) {
                delay(60_000)
                vm.autoRefresh()
            }
        }
    }

    Scaffold(containerColor = Bg) { pad ->
        Column(
            modifier = Modifier
                .padding(pad)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // العنوان
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("الذهب والفضة", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = accent)
                TextButton(onClick = { vm.openKeyDialog() }) { Text("⚙ المفتاح", color = Muted) }
            }

            // التبويبات
            TabRow(
                selectedTabIndex = ui.market,
                containerColor = Color.Transparent,
                contentColor = accent,
            ) {
                MARKETS.forEachIndexed { i, m ->
                    Tab(
                        selected = ui.market == i,
                        onClick = { vm.selectMarket(i) },
                        text = { Text("${m.name} ${m.symbol}") },
                    )
                }
            }

            // بطاقة السعر
            val q = ui.quote
            Card(
                colors = CardDefaults.cardColors(containerColor = CardBg),
                shape = RoundedCornerShape(16.dp),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("${market.name} · ${market.symbol}", color = Muted, fontSize = 13.sp)
                    if (q != null) {
                        val up = q.change >= 0
                        val sign = if (up) "+" else ""
                        Text(fmt(q.price), fontSize = 36.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        Text(
                            "$sign${fmt(q.change)}  ($sign${String.format(Locale.US, "%.2f", q.percent)}%)",
                            color = if (up) UpColor else DownColor,
                            fontSize = 16.sp,
                        )
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Stat("الافتتاح", fmt(q.open))
                            Stat("الأعلى", fmt(q.high))
                            Stat("الأدنى", fmt(q.low))
                        }
                    } else {
                        Text("—", fontSize = 36.sp, color = Muted)
                    }
                }
            }

            // الفواصل الزمنية
            Row(
                Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                INTERVALS.forEachIndexed { i, iv ->
                    FilterChip(
                        selected = ui.interval == i,
                        onClick = { vm.selectInterval(i) },
                        label = { Text(iv.label) },
                    )
                }
                FilterChip(
                    selected = ui.showSma,
                    onClick = { vm.toggleSma() },
                    label = { Text("SMA 20") },
                )
            }

            // بيانات الشمعة المحددة
            val shown = ui.selected?.let { ui.candles.getOrNull(it) } ?: ui.candles.lastOrNull()
            if (shown != null) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(shortTime(shown.time), color = Muted, fontSize = 12.sp)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Stat("O", fmt(shown.open))
                        Stat("H", fmt(shown.high))
                        Stat("L", fmt(shown.low))
                        Stat("C", fmt(shown.close))
                    }
                }
            }

            // الشارت (يبقى من اليسار لليمين)
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(320.dp)
                    .background(CardBg, RoundedCornerShape(12.dp))
                    .padding(8.dp),
                contentAlignment = Alignment.Center,
            ) {
                if (ui.candles.isEmpty()) {
                    if (ui.loading) CircularProgressIndicator(color = accent)
                    else Text("لا توجد بيانات", color = Muted)
                } else {
                    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                        CandleChart(
                            candles = ui.candles,
                            showSma = ui.showSma,
                            selected = ui.selected,
                            onSelect = { vm.select(it) },
                            modifier = Modifier.fillMaxSize(),
                        )
                    }
                }
            }
            Text("اسحب بإصبعك على الشارت لعرض بيانات كل شمعة", color = Muted, fontSize = 11.sp)

            ui.error?.let { Text(it, color = DownColor, fontSize = 13.sp) }

            // التحديث
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Button(onClick = { vm.refresh(force = true) }) { Text("تحديث") }
                if (ui.loading) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = accent)
                if (ui.updated.isNotEmpty()) Text("آخر تحديث ${ui.updated}", color = Muted, fontSize = 12.sp)
            }

            Text(
                "المصدر: Twelve Data. قد تكون الأسعار متأخرة حسب خطة الاشتراك. المعلومات للاطلاع وليست نصيحة استثمارية.",
                color = Muted,
                fontSize = 11.sp,
            )
        }
    }

    if (ui.showKeyDialog) {
        var text by remember { mutableStateOf(ui.apiKey) }
        AlertDialog(
            onDismissRequest = { vm.dismissKeyDialog() },
            title = { Text("مفتاح Twelve Data API") },
            text = {
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    singleLine = true,
                    label = { Text("API Key") },
                )
            },
            confirmButton = { TextButton(onClick = { vm.saveKey(text) }) { Text("حفظ") } },
            dismissButton = { TextButton(onClick = { vm.dismissKeyDialog() }) { Text("إلغاء") } },
        )
    }
}

@Composable
private fun Stat(label: String, value: String) {
    Column {
        Text(label, color = Muted, fontSize = 11.sp)
        Text(value, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}
