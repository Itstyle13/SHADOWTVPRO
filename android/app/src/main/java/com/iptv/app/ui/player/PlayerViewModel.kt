package com.iptv.app.ui.player

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iptv.app.data.api.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val sessionManager: com.iptv.app.util.SessionManager
) : ViewModel() {

    private val _streamUrl = MutableLiveData<String>()
    val streamUrl: LiveData<String> = _streamUrl

    fun loadChannel(channelDetails: String) {
        // channelDetails podría ser "streamId.extension" o solo "streamId"
        // Asumimos que viene con formato "id.ext" o manejamos lógica.
        // Para series/peliculas suele ser: /api/stream/series/ID.ext?token=...
        
        val token = sessionManager.getToken() ?: ""
        // NOTA: Aquí hay un problema de diseño en la App original: 
        // No sabemos si es live, movie o series solo con el ID.
        // Deberíamos pasar el TIPO también. 
        // Asumiré por ahora que es SERIES para probar, o que viene en el ID.
        
        // CORRECCIÓN TEMPORAL: Hardcodeamos para probar SERIES si el ID no tiene punto
        // O mejor, asumimos que la UI pasará algo como "type:id.ext" o simplificamos.
        
        // Vamos a construir la URL apuntando a nuestro backend.
        // IP hardcodeada temporal del emulador (10.0.2.2) o dispositivo
        val baseUrl = "http://10.0.2.2:3000" 
        
        // Supongamos que channelDetails es EL ID de la serie/episodio.
        // Si es una serie, necesitamos reproducir un episodio.
        // PERO el player suele recibir URL directa.
        // Si el usuario hace click en una SERIE, debería ir a una lista de episodios.
        // Si hace click en un EPISODIO, se reproduce.
        
        // Asumamos que estamos probando reproducción de un episodio especifico o canal
        val url = "$baseUrl/api/stream/series/$channelDetails?token=$token"
        
        _streamUrl.value = url
    }
}
