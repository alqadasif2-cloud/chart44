package com.goldsilver.charts

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

data class Candle(
    val time: String,
    val open: Double,
    val high: Double,
    val low: Double,
    val close: Double,
)

data class Quote(
    val price: Double,
    val change: Double,
    val percent: Double,
    val open: Double,
    val high: Double,
    val low: Double,
)

class ApiException(message: String) : Exception(message)

object TwelveData {
    private const val BASE = "https://api.twelvedata.com"

    private suspend fun get(apiKey: String, path: String, params: Map<String, String>): JSONObject =
        withContext(Dispatchers.IO) {
            val query = (params + ("apikey" to apiKey)).entries.joinToString("&") {
                "${it.key}=${URLEncoder.encode(it.value, "UTF-8")}"
            }
            val conn = URL("$BASE/$path?$query").openConnection() as HttpURLConnection
            try {
                conn.connectTimeout = 15_000
                conn.readTimeout = 15_000
                val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
                val body = stream?.bufferedReader()?.use { it.readText() }
                    ?: throw ApiException("لا يوجد رد من الخادم")
                val json = JSONObject(body)
                if (json.optString("status") == "error") {
                    throw ApiException(json.optString("message", "خطأ غير معروف"))
                }
                json
            } catch (e: ApiException) {
                throw e
            } catch (e: java.io.IOException) {
                throw ApiException("تعذر الاتصال بالإنترنت")
            } finally {
                conn.disconnect()
            }
        }

    /** الشموع مرتبة من الأقدم إلى الأحدث */
    suspend fun timeSeries(apiKey: String, symbol: String, interval: String): List<Candle> {
        val j = get(
            apiKey, "time_series",
            mapOf("symbol" to symbol, "interval" to interval, "outputsize" to "90"),
        )
        val arr = j.optJSONArray("values") ?: throw ApiException("لا توجد بيانات لهذا الرمز")
        val list = ArrayList<Candle>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            val open = o.optString("open").toDoubleOrNull() ?: continue
            val high = o.optString("high").toDoubleOrNull() ?: continue
            val low = o.optString("low").toDoubleOrNull() ?: continue
            val close = o.optString("close").toDoubleOrNull() ?: continue
            list.add(Candle(o.optString("datetime"), open, high, low, close))
        }
        if (list.isEmpty()) throw ApiException("لا توجد بيانات لهذا الرمز")
        return list.reversed()
    }

    suspend fun quote(apiKey: String, symbol: String): Quote {
        val j = get(apiKey, "quote", mapOf("symbol" to symbol))
        val close = j.optString("close").toDoubleOrNull() ?: throw ApiException("تعذر قراءة السعر")
        return Quote(
            price = close,
            change = j.optString("change").toDoubleOrNull() ?: 0.0,
            percent = j.optString("percent_change").toDoubleOrNull() ?: 0.0,
            open = j.optString("open").toDoubleOrNull() ?: close,
            high = j.optString("high").toDoubleOrNull() ?: close,
            low = j.optString("low").toDoubleOrNull() ?: close,
        )
    }
}
