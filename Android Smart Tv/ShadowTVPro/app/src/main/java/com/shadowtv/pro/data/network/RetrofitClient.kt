package com.shadowtv.pro.data.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    const val BASE_URL = "https://shadow-tv-backend.onrender.com/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(loggingInterceptor)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val apiService: ApiService = retrofit.create(ApiService::class.java)

    /** Genera la URL del stream para ExoPlayer */
    fun getLiveStreamUrl(token: String, streamId: Int): String =
        "${BASE_URL}api/stream/live/$streamId?token=$token"

    fun getVodStreamUrl(token: String, streamId: Int): String =
        "${BASE_URL}api/stream/vod/$streamId?token=$token"

    fun getEpisodeStreamUrl(token: String, episodeId: String): String =
        "${BASE_URL}api/stream/series/$episodeId?token=$token"

    /** URL del proxy de iconos del backend */
    fun getIconUrl(token: String, originalUrl: String, name: String = ""): String =
        "${BASE_URL}api/proxy-icon?url=${android.net.Uri.encode(originalUrl)}&name=${android.net.Uri.encode(name)}&token=$token"
}
