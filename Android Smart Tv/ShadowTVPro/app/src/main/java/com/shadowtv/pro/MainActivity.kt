package com.shadowtv.pro

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import com.shadowtv.pro.data.local.PreferencesManager
import com.shadowtv.pro.ui.screens.*
import com.shadowtv.pro.ui.theme.ShadowTvTheme
import com.shadowtv.pro.ui.viewmodels.ContentViewModel
import com.shadowtv.pro.ui.viewmodels.LoginViewModel
import com.shadowtv.pro.ui.viewmodels.PlayerViewModel
import kotlinx.coroutines.launch


class MainActivity : ComponentActivity() {

    private val loginViewModel: LoginViewModel by viewModels()
    private val contentViewModel: ContentViewModel by viewModels()
    private val playerViewModel: PlayerViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Mantener pantalla encendida y modo fullscreen para Smart TV
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContent {
            ShadowTvTheme {
                AppNavigation(
                    loginViewModel = loginViewModel,
                    contentViewModel = contentViewModel,
                    playerViewModel = playerViewModel,
                    onLogout = {
                        lifecycleScope.launch {
                            PreferencesManager(applicationContext).clearAll()
                        }
                    }
                )
            }
        }
    }
}

/** Enum para navegación simple entre pantallas */
enum class Screen { SPLASH, LOGIN, MAIN, PLAYER }

@Composable
private fun AppNavigation(
    loginViewModel: LoginViewModel,
    contentViewModel: ContentViewModel,
    playerViewModel: PlayerViewModel,
    onLogout: () -> Unit
) {
    var currentScreen by remember { mutableStateOf(Screen.SPLASH) }
    val hasSavedSession by loginViewModel.hasSavedSession.collectAsStateWithLifecycle()

    when (currentScreen) {
        Screen.SPLASH -> {
            SplashScreen(
                onComplete = {
                    currentScreen = if (hasSavedSession) Screen.MAIN else Screen.LOGIN
                }
            )
        }

        Screen.LOGIN -> {
            LoginScreen(
                viewModel = loginViewModel,
                onLoginSuccess = {
                    currentScreen = Screen.MAIN
                }
            )
        }

        Screen.MAIN -> {
            MainScreen(
                contentViewModel = contentViewModel,
                playerViewModel = playerViewModel,
                onNavigateToPlayer = {
                    currentScreen = Screen.PLAYER
                },
                onLogout = {
                    onLogout()
                    currentScreen = Screen.LOGIN
                }
            )
        }

        Screen.PLAYER -> {
            PlayerScreen(
                viewModel = playerViewModel,
                onBack = {
                    playerViewModel.stop()
                    currentScreen = Screen.MAIN
                }
            )
        }
    }
}
