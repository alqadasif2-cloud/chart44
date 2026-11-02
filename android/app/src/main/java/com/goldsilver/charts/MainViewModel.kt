package com.goldsilver.charts

import android.app.Application
import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class Market(val name: String, val symbol: String)
data class Interval(val label: String, val api: String)

val MARKETS = listOf(Market("الذهب", "XAU/USD"), Market("الفضة", "XAG/USD"))
val INTERVALS = listOf(
    Interval("5د", "5min"),
    Interval("15د", "15min"),
    Interval("ساعة", "1h"),
    Interval("4س", "4h"),
    Interval("يوم", "1day"),
)

data class UiState(
    val market: Int = 0,
    val interval: Int = 2,
    val loading: Boolean = false,
    val error: String? = null,
    val candles: List<Candle> = emptyList(),
    val quote: Quote? = null,
    val updated: String = "",
    val selected: Int? = null,
    val showSma: Boolean = false,
    val showKeyDialog: Boolean = false,
    val apiKey: String = "",
)

class MainViewModel(app: Application) : AndroidViewModel(app) {
    private val prefs = app.getSharedPreferences("settings", Context.MODE_PRIVATE)
    private var job: Job? = null
    private val cache = HashMap<String, Pair<Long, List<Candle>>>()
    private val quotes = HashMap<String, Pair<Long, Quote>>()

    var ui by mutableStateOf(UiState(apiKey = prefs.getString("api_key", "") ?: ""))
        private set

    private fun key(): String = ui.apiKey.ifBlank { BuildConfig.TWELVE_DATA_KEY }

    init {
        if (key().isBlank()) ui = ui.copy(showKeyDialog = true) else refresh()
    }

    fun selectMarket(i: Int) {
        ui = ui.copy(market = i, candles = emptyList(), quote = null, selected = null)
        refresh()
    }

    fun selectInterval(i: Int) {
        ui = ui.copy(interval = i, candles = emptyList(), selected = null)
        refresh()
    }

    fun select(i: Int?) {
        ui = ui.copy(selected = i)
    }

    fun toggleSma() {
        ui = ui.copy(showSma = !ui.showSma)
    }

    fun openKeyDialog() {
        ui = ui.copy(showKeyDialog = true)
    }

    fun dismissKeyDialog() {
        ui = ui.copy(showKeyDialog = false)
    }

    fun saveKey(k: String) {
        val clean = k.trim()
        prefs.edit().putString("api_key", clean).apply()
        cache.clear()
        quotes.clear()
        ui = ui.copy(apiKey = clean, showKeyDialog = false, error = null)
        refresh(force = true)
    }

    fun autoRefresh() {
        if (key().isNotBlank()) refresh(force = true)
    }

    fun refresh(force: Boolean = false) {
        val k = key()
        if (k.isBlank()) {
            ui = ui.copy(error = "أدخل مفتاح Twelve Data API من زر الإعدادات", showKeyDialog = true)
            return
        }
        job?.cancel()
        val market = MARKETS[ui.market]
        val interval = INTERVALS[ui.interval]
        job = viewModelScope.launch {
            ui = ui.copy(loading = true, error = null)
            val now = System.currentTimeMillis()
            val ck = "${market.symbol}|${interval.api}"
            try {
                var candles = cache[ck]?.takeIf { !force && now - it.first < 60_000 }?.second
                if (candles == null) {
                    candles = TwelveData.timeSeries(k, market.symbol, interval.api)
                    cache[ck] = now to candles
                }
                ui = ui.copy(candles = candles)

                var q = quotes[market.symbol]?.takeIf { !force && now - it.first < 60_000 }?.second
                if (q == null) {
                    q = TwelveData.quote(k, market.symbol)
                    quotes[market.symbol] = now to q
                }
                ui = ui.copy(
                    quote = q,
                    updated = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date()),
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                ui = ui.copy(error = e.message ?: "تعذر جلب البيانات")
            }
            ui = ui.copy(loading = false)
        }
    }
}
