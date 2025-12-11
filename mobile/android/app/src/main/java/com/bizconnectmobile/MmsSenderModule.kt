package com.bizconnectmobile

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * MMS 자동 발송 모듈
 * 
 * 참고: Android 5.0+ 부터는 보안상의 이유로 앱이 직접 MMS를 발송하는 것이 제한됩니다.
 * 이 모듈은 자동 발송을 시도하지만, 대부분의 경우 실패할 수 있습니다.
 * 실패 시 SmsIntentModule의 Intent 방식을 사용해야 합니다.
 */
class MmsSenderModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "MmsSender"

  @ReactMethod
  fun sendMms(phone: String, message: String, imagePath: String, promise: Promise) {
    // Android 5.0+ 에서는 직접 MMS 발송이 불가능합니다
    // Intent 방식으로 폴백해야 합니다
    promise.reject(
      "MMS_AUTO_SEND_NOT_SUPPORTED",
      "Android 5.0+ 에서는 자동 MMS 발송이 제한됩니다. Intent 방식을 사용해주세요."
    )
  }
}

