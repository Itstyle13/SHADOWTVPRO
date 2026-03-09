package com.shadowtv.pro

import android.app.Application

class ShadowTvApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialization hook — para futuros SDKs (analytics, crash reporting, etc.)
    }
}
