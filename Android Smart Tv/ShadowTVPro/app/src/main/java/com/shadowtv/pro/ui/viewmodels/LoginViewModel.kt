package com.shadowtv.pro.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.shadowtv.pro.data.local.PreferencesManager
import com.shadowtv.pro.data.repository.IptvRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class LoginState {
    object Idle : LoginState()
    object Loading : LoginState()
    data class Success(val token: String) : LoginState()
    data class Error(val message: String) : LoginState()
}

class LoginViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = PreferencesManager(application)
    private val repo = IptvRepository()

    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState.asStateFlow()

    private val _hasSavedSession = MutableStateFlow(false)
    val hasSavedSession: StateFlow<Boolean> = _hasSavedSession.asStateFlow()

    init {
        // Verificar si ya hay sesión guardada
        viewModelScope.launch {
            prefs.tokenFlow.collect { token ->
                _hasSavedSession.value = !token.isNullOrBlank()
            }
        }
    }

    fun login(username: String, password: String) {
        if (username.isBlank() || password.isBlank()) {
            _loginState.value = LoginState.Error("Ingresa usuario y contraseña")
            return
        }

        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            repo.login(username, password)
                .onSuccess { response ->
                    prefs.saveToken(response.token)
                    prefs.saveUserInfo(response.userInfo)
                    _loginState.value = LoginState.Success(response.token)
                }
                .onFailure { e ->
                    val message = when {
                        e.message?.contains("401") == true -> "Usuario o contraseña incorrectos"
                        e.message?.contains("timeout") == true -> "Tiempo de espera agotado"
                        else -> "No se pudo conectar. ¿Hay internet?"
                    }
                    _loginState.value = LoginState.Error(message)
                }
        }
    }

    fun resetState() {
        _loginState.value = LoginState.Idle
    }
}
