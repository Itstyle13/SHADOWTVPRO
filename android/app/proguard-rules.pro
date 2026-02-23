# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in C:\Users\ACER\AppData\Local\Android\Sdk/tools/proguard/proguard-android.txt
# or proguard-android-optimize.txt if build uses getDefaultProguardFile('proguard-android-optimize.txt')

# ExoPlayer / Media3
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# Retrofit
-keepattributes Signature
-keepattributes Exceptions
-dontwarn okhttp3.**
-dontwarn retrofit2.**
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# Gson (used by Retrofit converter)
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keep class com.iptv.app.data.api.** { *; }
-keep class com.iptv.app.data.model.** { *; }

# Hilt / Dagger
-keep class com.iptv.app.IPTVApplication { *; }
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keepnames class * extends android.app.Application

# ViewModels
-keep class * extends androidx.lifecycle.ViewModel { *; }

# Safety
-dontnote **
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
