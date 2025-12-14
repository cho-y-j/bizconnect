package com.bizconnectmobile

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONArray

/**
 * SMS 승인/취소 버튼 클릭을 처리하는 BroadcastReceiver
 */
class SmsApprovalReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsApprovalReceiver"
        const val ACTION_APPROVE = "com.bizconnectmobile.ACTION_APPROVE_SMS"
        const val ACTION_CANCEL = "com.bizconnectmobile.ACTION_CANCEL_SMS"
        const val ACTION_APPROVE_BATCH = "com.bizconnectmobile.ACTION_APPROVE_SMS_BATCH"
        const val ACTION_CANCEL_BATCH = "com.bizconnectmobile.ACTION_CANCEL_SMS_BATCH"
        const val EXTRA_TASK_ID = "task_id"
        const val EXTRA_NOTIFICATION_ID = "notification_id"

        // 승인/취소 결과를 저장 (앱이 다시 열릴 때 처리)
        var lastApprovedTaskId: String? = null
        var lastCancelledTaskId: String? = null

        // 배치 승인/취소 결과를 저장
        var lastApprovedBatchTaskIds: List<String>? = null
        var lastCancelledBatchTaskIds: List<String>? = null
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        Log.d(TAG, "onReceive called: ${intent?.action}")

        if (context == null || intent == null) {
            Log.e(TAG, "Context or intent is null")
            return
        }

        val taskIdOrJson = intent.getStringExtra(EXTRA_TASK_ID)
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, -1)

        Log.d(TAG, "Task ID/JSON: $taskIdOrJson, Notification ID: $notificationId")

        if (taskIdOrJson == null) {
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
                Log.d(TAG, "SMS Approved: $taskIdOrJson")
                lastApprovedTaskId = taskIdOrJson
                lastCancelledTaskId = null
                lastApprovedBatchTaskIds = null
                lastCancelledBatchTaskIds = null

                // 앱을 포그라운드로 가져오기
                bringAppToForeground(context, taskIdOrJson, isApproved = true)
            }
            ACTION_CANCEL -> {
                Log.d(TAG, "SMS Cancelled: $taskIdOrJson")
                lastCancelledTaskId = taskIdOrJson
                lastApprovedTaskId = null
                lastApprovedBatchTaskIds = null
                lastCancelledBatchTaskIds = null

                // 앱을 포그라운드로 가져오기
                bringAppToForeground(context, taskIdOrJson, isApproved = false)
            }
            ACTION_APPROVE_BATCH -> {
                Log.d(TAG, "SMS Batch Approved")
                val taskIds = parseTaskIds(taskIdOrJson)
                Log.d(TAG, "Batch taskIds count: ${taskIds.size}")

                lastApprovedBatchTaskIds = taskIds
                lastCancelledBatchTaskIds = null
                lastApprovedTaskId = null
                lastCancelledTaskId = null

                // 앱을 포그라운드로 가져오기
                bringAppToForeground(context, taskIdOrJson, isApproved = true, isBatch = true)
            }
            ACTION_CANCEL_BATCH -> {
                Log.d(TAG, "SMS Batch Cancelled")
                val taskIds = parseTaskIds(taskIdOrJson)
                Log.d(TAG, "Batch taskIds count: ${taskIds.size}")

                lastCancelledBatchTaskIds = taskIds
                lastApprovedBatchTaskIds = null
                lastApprovedTaskId = null
                lastCancelledTaskId = null

                // 앱을 포그라운드로 가져오기
                bringAppToForeground(context, taskIdOrJson, isApproved = false, isBatch = true)
            }
        }
    }

    private fun parseTaskIds(json: String): List<String> {
        return try {
            val jsonArray = JSONArray(json)
            val list = mutableListOf<String>()
            for (i in 0 until jsonArray.length()) {
                list.add(jsonArray.getString(i))
            }
            list
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse taskIds JSON", e)
            emptyList()
        }
    }

    private fun bringAppToForeground(context: Context, taskIdOrJson: String, isApproved: Boolean, isBatch: Boolean = false) {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        launchIntent?.let {
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            if (isBatch) {
                if (isApproved) {
                    it.putExtra("approved_batch_task_ids", taskIdOrJson)
                } else {
                    it.putExtra("cancelled_batch_task_ids", taskIdOrJson)
                }
            } else {
                if (isApproved) {
                    it.putExtra("approved_task_id", taskIdOrJson)
                } else {
                    it.putExtra("cancelled_task_id", taskIdOrJson)
                }
            }
            context.startActivity(it)
        }
    }
}
