package com.bizconnectmobile

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.flipper.ReactNativeFlipper
import com.facebook.soloader.SoLoader
import com.bizconnectmobile.SmsIntentPackage

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // packages.add(new MyReactNativePackage());
          val packages = PackageList(this).packages.toMutableList()
          packages.add(SmsIntentPackage())
          return packages
        }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(this.applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)

    // FCM 알림 채널 생성
    createNotificationChannels()
  }

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(NotificationManager::class.java)

      // 기본 채널 (FCM에서 사용)
      val defaultChannel = NotificationChannel(
        "bizconnect-default",
        "BizConnect 알림",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "웹에서 문자 발송 요청 알림"
        enableVibration(true)
        setShowBadge(true)
      }
      notificationManager.createNotificationChannel(defaultChannel)

      // SMS 승인 요청 채널 (높은 우선순위)
      val smsApprovalChannel = NotificationChannel(
        "sms-approval",
        "문자 발송 승인",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "웹에서 요청한 문자 발송 승인 알림"
        enableVibration(true)
        setShowBadge(true)
      }
      notificationManager.createNotificationChannel(smsApprovalChannel)
    }
  }
}




