package com.bizconnectmobile

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsApprovalModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

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

    init {
        reactContext.addLifecycleEventListener(this)
        // 초기화 시 자동 승인 설정 로드
        val prefs = reactContext.getSharedPreferences("bizconnect_prefs", Context.MODE_PRIVATE)
        autoApproveEnabled = prefs.getBoolean("auto_approve_sms", false)
        Log.d(TAG, "SmsApprovalModule initialized, autoApproveEnabled: $autoApproveEnabled")
    }

    override fun getName(): String = "SmsApprovalModule"

    // 앱이 포그라운드로 돌아올 때 pending approval 확인
    override fun onHostResume() {
        Log.d(TAG, "onHostResume - checking for pending approvals")
        // 약간의 딜레이를 주어 이벤트 리스너가 설정될 시간을 줌
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            checkPendingApprovals()
        }, 1000) // 1초 딜레이
    }

    override fun onHostPause() {}
    override fun onHostDestroy() {}

    private fun checkPendingApprovals() {
        // 단일 승인된 작업 확인
        SmsApprovalReceiver.lastApprovedTaskId?.let { taskId ->
            Log.d(TAG, "Found pending approved task: $taskId")
            sendEventToJS("onSmsApproved", taskId)
            SmsApprovalReceiver.lastApprovedTaskId = null
        }

        // 단일 취소된 작업 확인
        SmsApprovalReceiver.lastCancelledTaskId?.let { taskId ->
            Log.d(TAG, "Found pending cancelled task: $taskId")
            sendEventToJS("onSmsCancelled", taskId)
            SmsApprovalReceiver.lastCancelledTaskId = null
        }

        // 배치 승인된 작업 확인
        SmsApprovalReceiver.lastApprovedBatchTaskIds?.let { taskIds ->
            Log.d(TAG, "Found pending approved batch tasks: ${taskIds.size}")
            taskIds.forEach { taskId ->
                sendEventToJS("onSmsApproved", taskId)
            }
            SmsApprovalReceiver.lastApprovedBatchTaskIds = null
        }

        // 배치 취소된 작업 확인
        SmsApprovalReceiver.lastCancelledBatchTaskIds?.let { taskIds ->
            Log.d(TAG, "Found pending cancelled batch tasks: ${taskIds.size}")
            taskIds.forEach { taskId ->
                sendEventToJS("onSmsCancelled", taskId)
            }
            SmsApprovalReceiver.lastCancelledBatchTaskIds = null
        }
    }

    private fun sendEventToJS(eventName: String, taskId: String) {
        Log.d(TAG, "Sending event to JS: $eventName, taskId: $taskId")
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, taskId)
    }

    /**
     * 정보 알림 표시 (자동 승인 시 사용)
     * 버튼 없음, 탭 불가, 확인용
     */
    private fun showInfoNotification(context: Context, title: String, message: String) {
        try {
            val notificationId = notificationIdCounter++
            val notification = NotificationCompat.Builder(context, "sms-info")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setAutoCancel(true)
                .setTimeoutAfter(5000) // 5초 후 자동 사라짐
                .build()

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(notificationId, notification)
            Log.d(TAG, "Info notification shown: $title")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show info notification", e)
        }
    }

    /**
     * ReactMethod: 정보 알림 표시 (자동 승인 시 발송 완료 알림)
     */
    @ReactMethod
    fun showInfoNotification(title: String, message: String, promise: Promise) {
        Log.d(TAG, "showInfoNotification called: $title")
        try {
            val context = reactApplicationContext
            showInfoNotification(context, title, message)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show info notification", e)
            promise.reject("ERROR", "Failed to show info notification", e)
        }
    }

    @ReactMethod
    fun showApprovalNotification(taskId: String, phoneNumber: String, message: String, promise: Promise) {
        Log.d(TAG, "showApprovalNotification called: taskId=$taskId, phone=$phoneNumber")

        try {
            // 자동 승인이 활성화되어 있으면 바로 승인 이벤트 발송
            if (autoApproveEnabled) {
                Log.d(TAG, "Auto-approve enabled, sending approval event directly")
                
                // 정보 알림 표시
                val context = reactApplicationContext
                showInfoNotification(
                    context,
                    "자동 승인되어 문자 발송",
                    "${phoneNumber}에게 문자를 발송했습니다"
                )
                
                sendEventToJS("onSmsApproved", taskId)
                // WritableMap으로 변환하여 Promise 해결
                val result = Arguments.createMap()
                result.putBoolean("autoApproved", true)
                promise.resolve(result)
                return
            }

            val context = reactApplicationContext
            val notificationId = notificationIdCounter++

            // 승인 버튼 인텐트 (명시적 Intent로 BroadcastReceiver 타겟팅)
            val approveIntent = Intent(context, SmsApprovalReceiver::class.java).apply {
                action = SmsApprovalReceiver.ACTION_APPROVE
                putExtra(EXTRA_TASK_ID, taskId)
                putExtra(EXTRA_NOTIFICATION_ID, notificationId)
            }
            val approvePendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId * 2,
                approveIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // 취소 버튼 인텐트 (명시적 Intent로 BroadcastReceiver 타겟팅)
            val cancelIntent = Intent(context, SmsApprovalReceiver::class.java).apply {
                action = SmsApprovalReceiver.ACTION_CANCEL
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

    /**
     * 배치 승인 알림 표시 (다량 SMS)
     * "N건의 문자 발송 요청" 형태로 1개 알림
     */
    @ReactMethod
    fun showBatchApprovalNotification(taskIdsJson: String, count: Int, promise: Promise) {
        Log.d(TAG, "showBatchApprovalNotification called: count=$count")

        try {
            // 자동 승인이 활성화되어 있으면 바로 승인 이벤트 발송
            if (autoApproveEnabled) {
                Log.d(TAG, "Auto-approve enabled, sending batch approval events directly")
                
                // 배치 승인은 정보 알림 1번만 표시 (개별 알림 없음)
                val context = reactApplicationContext
                showInfoNotification(
                    context,
                    "자동 승인되어 문자 발송",
                    "${count}건의 문자를 발송했습니다"
                )
                
                // taskIds 파싱해서 각각 승인 이벤트 발송 (알림은 1번만 표시됨)
                try {
                    val taskIds = org.json.JSONArray(taskIdsJson)
                    for (i in 0 until taskIds.length()) {
                        val taskId = taskIds.getString(i)
                        sendEventToJS("onSmsApproved", taskId)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse taskIds for auto-approve", e)
                }
                // WritableMap으로 변환하여 Promise 해결
                val result = Arguments.createMap()
                result.putBoolean("autoApproved", true)
                promise.resolve(result)
                return
            }

            val context = reactApplicationContext
            val notificationId = notificationIdCounter++

            // 승인 버튼 인텐트 (배치 승인)
            val approveIntent = Intent(context, SmsApprovalReceiver::class.java).apply {
                action = SmsApprovalReceiver.ACTION_APPROVE_BATCH
                putExtra(EXTRA_TASK_ID, taskIdsJson)  // JSON 문자열로 전달
                putExtra(EXTRA_NOTIFICATION_ID, notificationId)
            }
            val approvePendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId * 2,
                approveIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // 취소 버튼 인텐트 (배치 취소)
            val cancelIntent = Intent(context, SmsApprovalReceiver::class.java).apply {
                action = SmsApprovalReceiver.ACTION_CANCEL_BATCH
                putExtra(EXTRA_TASK_ID, taskIdsJson)  // JSON 문자열로 전달
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
                .setContentTitle("📱 ${count}건의 문자 발송 요청")
                .setContentText("웹에서 ${count}건의 문자 발송 요청이 있습니다.")
                .setStyle(NotificationCompat.BigTextStyle()
                    .bigText("웹에서 ${count}건의 문자 발송 요청이 있습니다.\n\n승인 버튼을 누르면 모든 문자가 순차적으로 발송됩니다."))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .addAction(android.R.drawable.ic_menu_send, "✅ 모두 승인", approvePendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "❌ 취소", cancelPendingIntent)
                .setVibrate(longArrayOf(0, 500, 200, 500))
                .build()

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(notificationId, notification)

            Log.d(TAG, "Batch notification shown with ID: $notificationId, count: $count")
            promise.resolve(notificationId)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show batch notification", e)
            promise.reject("NOTIFICATION_ERROR", e.message)
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
