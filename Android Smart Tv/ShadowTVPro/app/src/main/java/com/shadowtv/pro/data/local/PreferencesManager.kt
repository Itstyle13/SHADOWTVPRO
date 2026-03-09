package com.shadowtv.pro.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.shadowtv.pro.data.models.LiveStream
import com.shadowtv.pro.data.models.UserInfo
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "shadow_tv_prefs")

class PreferencesManager(private val context: Context) {

    private val gson = Gson()

    companion object {
        val TOKEN_KEY = stringPreferencesKey("auth_token")
        val USER_INFO_KEY = stringPreferencesKey("user_info")
        val LAST_STREAM_KEY = stringPreferencesKey("last_stream")
        val LAST_TYPE_KEY = stringPreferencesKey("last_type")
        val LAST_LIVE_KEY = stringPreferencesKey("last_live_stream")
    }

    // Token
    val tokenFlow: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[TOKEN_KEY]
    }

    suspend fun saveToken(token: String) {
        context.dataStore.edit { it[TOKEN_KEY] = token }
    }

    suspend fun clearToken() {
        context.dataStore.edit { it.remove(TOKEN_KEY) }
    }

    // User Info
    val userInfoFlow: Flow<UserInfo?> = context.dataStore.data.map { prefs ->
        prefs[USER_INFO_KEY]?.let { gson.fromJson(it, UserInfo::class.java) }
    }

    suspend fun saveUserInfo(userInfo: UserInfo) {
        context.dataStore.edit { it[USER_INFO_KEY] = gson.toJson(userInfo) }
    }

    // Last Watched Stream
    suspend fun saveLastStream(stream: LiveStream, type: String) {
        context.dataStore.edit {
            it[LAST_STREAM_KEY] = gson.toJson(stream)
            it[LAST_TYPE_KEY] = type
        }
    }

    suspend fun saveLastLiveStream(stream: LiveStream) {
        context.dataStore.edit { it[LAST_LIVE_KEY] = gson.toJson(stream) }
    }

    val lastStreamFlow: Flow<Pair<LiveStream?, String>> = context.dataStore.data.map { prefs ->
        val stream = prefs[LAST_STREAM_KEY]?.let { gson.fromJson(it, LiveStream::class.java) }
        val type = prefs[LAST_TYPE_KEY] ?: "live"
        Pair(stream, type)
    }

    val lastLiveStreamFlow: Flow<LiveStream?> = context.dataStore.data.map { prefs ->
        prefs[LAST_LIVE_KEY]?.let { gson.fromJson(it, LiveStream::class.java) }
    }

    suspend fun clearAll() {
        context.dataStore.edit { it.clear() }
    }
}
