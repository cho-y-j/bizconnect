package com.bizconnectmobile

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * SMS 승인/취소 버튼 클릭을 처리하는 BroadcastReceiver
 */
class SmsApprovalReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsApprovalReceiver"
        const val ACTION_APPROVE = "com.bizconnectmobile.ACTION_APPROVE_SMS"
        const val ACTION_CANCEL = "com.bizconnectmobile.ACTION_CANCEL_SMS"
        const val EXTRA_TASK_ID = "task_id"
        const val EXTRA_NOTIFICATION_ID = "notification_id"

        // 승인/취소 결과를 저장 (앱이 다시 열릴 때 처리)
        var lastApprovedTaskId: String? = null
        var lastCancelledTaskId: String? = null
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        Log.d(TAG, "onReceive called: ${intent?.action}")

        if (context == null || intent == null) {
            Log.e(TAG, "Context or intent is null")
            return
        }

        val taskId = intent.getStringExtra(EXTRA_TASK_ID)
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, -1)

        Log.d(TAG, "Task ID: $taskId, Notification ID: $notificationId")

        if (taskId == null) {
            Log.e(TAG, "Task ID is null")
            return
        }

        // 알림 제거
        if (notificationId != -1) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
            Log.d(TAG, "Notification cancelled: $notificationId")
        }

        when (intent.action) {
            ACTION_APPROVE -> {
                Log.d(TAG, "SMS Approved: $taskId")
                lastApprovedTaskId = taskId
                lastCancelledTaskId = null

                // 앱을 포그라운드로 가져오기
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                launchIntent?.let {
                    it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    it.putExtra("approved_task_id", taskId)
                    context.startActivity(it)
                }
            }
            ACTION_CANCEL -> {
                Log.d(TAG, "SMS Cancelled: $taskId")
                lastCancelledTaskId = taskId
                lastApprovedTaskId = null

                // 앱을 포그라운드로 가져오기
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                launchIntent?.let {
                    it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    it.putExtra("cancelled_task_id", taskId)
                    context.startActivity(it)
                }
            }
        }
    }
}
