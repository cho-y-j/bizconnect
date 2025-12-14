package com.bizconnectmobile

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsApprovalModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SmsApprovalModule"
        const val ACTION_APPROVE = "com.bizconnectmobile.ACTION_APPROVE_SMS"
        const val ACTION_CANCEL = "com.bizconnectmobile.ACTION_CANCEL_SMS"
        const val EXTRA_TASK_ID = "task_id"
        const val EXTRA_NOTIFICATION_ID = "notification_id"
        private var notificationIdCounter = 1000

        // 자동 승인 설정 저장
        private var autoApproveEnabled = false
    }

    private val approvalReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "BroadcastReceiver onReceive: ${intent?.action}")

            val taskId = intent?.getStringExtra(EXTRA_TASK_ID) ?: return
            val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, -1)

            Log.d(TAG, "Task ID: $taskId, Notification ID: $notificationId")

            // 알림 제거
            if (notificationId != -1) {
                val notificationManager = context?.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                notificationManager?.cancel(notificationId)
            }

            when (intent.action) {
                ACTION_APPROVE -> {
                    Log.d(TAG, "SMS Approved: $taskId")
                    sendEventToJS("onSmsApproved", taskId)
                }
                ACTION_CANCEL -> {
                    Log.d(TAG, "SMS Cancelled: $taskId")
                    sendEventToJS("onSmsCancelled", taskId)
                }
            }
        }
    }

    init {
        val filter = IntentFilter().apply {
            addAction(ACTION_APPROVE)
            addAction(ACTION_CANCEL)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(approvalReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(approvalReceiver, filter)
        }
        Log.d(TAG, "SmsApprovalModule initialized")
    }

    override fun getName(): String = "SmsApprovalModule"

    private fun sendEventToJS(eventName: String, taskId: String) {
        Log.d(TAG, "Sending event to JS: $eventName, taskId: $taskId")
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, taskId)
    }

    @ReactMethod
    fun showApprovalNotification(taskId: String, phoneNumber: String, message: String, promise: Promise) {
        Log.d(TAG, "showApprovalNotification called: taskId=$taskId, phone=$phoneNumber")

        try {
            // 자동 승인이 활성화되어 있으면 바로 승인 이벤트 발송
            if (autoApproveEnabled) {
                Log.d(TAG, "Auto-approve enabled, sending approval event directly")
                sendEventToJS("onSmsApproved", taskId)
                promise.resolve(mapOf("autoApproved" to true))
                return
            }

            val context = reactApplicationContext
            val notificationId = notificationIdCounter++

            // 승인 버튼 인텐트
            val approveIntent = Intent(ACTION_APPROVE).apply {
                setPackage(context.packageName)
                putExtra(EXTRA_TASK_ID, taskId)
                putExtra(EXTRA_NOTIFICATION_ID, notificationId)
            }
            val approvePendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId * 2,
                approveIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // 취소 버튼 인텐트
            val cancelIntent = Intent(ACTION_CANCEL).apply {
                setPackage(context.packageName)
                putExtra(EXTRA_TASK_ID, taskId)
                putExtra(EXTRA_NOTIFICATION_ID, notificationId)
            }
            val cancelPendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId * 2 + 1,
                cancelIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // 알림 생성
            val notification = NotificationCompat.Builder(context, "sms-approval")
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setContentTitle("📱 문자 발송 요청")
                .setContentText("$phoneNumber 에게 문자를 보내시겠습니까?")
                .setStyle(NotificationCompat.BigTextStyle()
                    .bigText("수신자: $phoneNumber\n\n메시지:\n${message.take(100)}${if (message.length > 100) "..." else ""}"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .addAction(android.R.drawable.ic_menu_send, "✅ 승인", approvePendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "❌ 취소", cancelPendingIntent)
                .setVibrate(longArrayOf(0, 500, 200, 500))
                .build()

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(notificationId, notification)

            Log.d(TAG, "Notification shown with ID: $notificationId")
            promise.resolve(notificationId)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show notification", e)
            promise.reject("NOTIFICATION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setAutoApprove(enabled: Boolean, promise: Promise) {
        Log.d(TAG, "setAutoApprove: $enabled")
        autoApproveEnabled = enabled

        // SharedPreferences에 저장
        val prefs = reactApplicationContext.getSharedPreferences("bizconnect_prefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("auto_approve_sms", enabled).apply()

        promise.resolve(enabled)
    }

    @ReactMethod
    fun getAutoApprove(promise: Promise) {
        val prefs = reactApplicationContext.getSharedPreferences("bizconnect_prefs", Context.MODE_PRIVATE)
        autoApproveEnabled = prefs.getBoolean("auto_approve_sms", false)
        promise.resolve(autoApproveEnabled)
    }

    @ReactMethod
    fun cancelNotification(notificationId: Int, promise: Promise) {
        try {
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_ERROR", e.message)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built-in Event Emitter
        Log.d(TAG, "addListener: $eventName")
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built-in Event Emitter
        Log.d(TAG, "removeListeners: $count")
    }
}
