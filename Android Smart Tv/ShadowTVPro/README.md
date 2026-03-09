# Shadow TV PRO — Android Smart TV

App Android nativa para Smart TV basada en el web app Shadow TV PRO.
Usa **ExoPlayer Media3** para reproducción de streams HLS/IPTV.

## Requisitos
- Android Studio Hedgehog o superior
- JDK 17
- Android SDK 35 instalado

## Abrir el proyecto
1. Abre **Android Studio**
2. File → Open → selecciona esta carpeta (`ShadowTVPro/`)
3. Espera que Gradle sincronice (`Sync Project with Gradle Files`)

## Compilar el APK
### Debug (para probar):
```
Build → Build Bundle(s)/APK(s) → Build APK(s)
```
El APK queda en: `app/build/outputs/apk/debug/app-debug.apk`

### Release (para distribución) — recomendado:
```
Build → Generate Signed Bundle/APK → APK → (crear/usar keystore) → release
```

## Instalar en Smart TV
1. En la Smart TV: Ajustes → Fuentes desconocidas → Activar
2. Copia el APK a un USB
3. Abre el APK desde el Administrador de archivos de la TV

### Via ADB:
```bash
adb connect <IP_TV>:5555
adb install -r app-debug.apk
```

## Arquitectura
```
ui/
├── screens/         SplashScreen, LoginScreen, MainScreen, PlayerScreen
├── components/      CategorySidebar, ChannelGrid, PlayerControls, FocusableCard
├── viewmodels/      LoginViewModel, ContentViewModel, PlayerViewModel
└── theme/           Color, Theme, Type

data/
├── models/          Models.kt (LiveStream, VodStream, Series, EPG...)
├── network/         ApiService.kt, RetrofitClient.kt
├── repository/      IptvRepository.kt
└── local/           PreferencesManager.kt (DataStore)
```

## Backend
La app se conecta al mismo backend web: `https://shadow-tv-backend.onrender.com`
No se requieren cambios en el backend.

## Navegación por control remoto
- **D-pad**: navegar entre elementos
- **OK/Enter**: seleccionar canal/película
- **Back**: volver al listado desde el player
- **←/→ en el player**: canal anterior/siguiente (TV en vivo)
- **▲/▼**: mostrar controles del player
