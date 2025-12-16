package com.bizconnectmobile

import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class SmsIntentModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SmsIntent"

  @ReactMethod
  fun sendMmsWithImage(phone: String, message: String, imagePath: String, promise: Promise) {
    try {
      val ctx = currentActivity ?: reactContext.currentActivity ?: reactContext

      // 1. 이미지 URI 준비
      val imageUri: Uri = when {
        imagePath.startsWith("content://") -> Uri.parse(imagePath)
        imagePath.startsWith("file://") -> {
          val file = File(Uri.parse(imagePath).path ?: imagePath.replace("file://", ""))
          FileProvider.getUriForFile(ctx, "${reactContext.packageName}.fileprovider", file)
        }
        imagePath.startsWith("/") -> {
          val file = File(imagePath)
          FileProvider.getUriForFile(ctx, "${reactContext.packageName}.fileprovider", file)
        }
        else -> {
          promise.reject("INVALID_PATH", "지원하지 않는 이미지 경로입니다: $imagePath")
          return
        }
      }

      // 2. Intent 생성 (이미지 첨부)
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/*"
        putExtra("address", phone)
        putExtra("sms_body", message)
        putExtra(Intent.EXTRA_STREAM, imageUri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      // 3. 권한 부여
      val resInfoList = ctx.packageManager.queryIntentActivities(intent, 0)
      for (resolveInfo in resInfoList) {
        val packageName = resolveInfo.activityInfo.packageName
        ctx.grantUriPermission(
          packageName,
          imageUri,
          Intent.FLAG_GRANT_READ_URI_PERMISSION
        )
      }

      // 4. 실행 (사용자가 메시지 앱에서 전송)
      val chooser = Intent.createChooser(intent, "MMS 보내기")
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(chooser)

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("MMS_INTENT_ERROR", e.message, e)
    }
  }
}












