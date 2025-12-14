/**
 * @format
 */

import {AppRegistry, NativeModules} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

const {SmsApprovalModule} = NativeModules;

// FCM 백그라운드 메시지 핸들러 등록
// DATA-ONLY FCM이므로 앱에서 직접 알림을 표시해야 함
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📩 [FCM Background] ===== BACKGROUND MESSAGE RECEIVED =====');

  try {
    const data = remoteMessage.data;
    console.log('📩 [FCM Background] Type:', data?.type, 'Count:', data?.count);

    // SMS 발송 요청인 경우 승인 알림 표시
    if (data?.type === 'send_sms' || data?.type === 'send_mms') {
      const taskId = data.taskId;
      const phone = data.phone || '알 수 없음';
      const messagePreview = data.messagePreview || '';

      console.log('📤 [FCM Background] Showing approval notification');
      console.log('📤 [FCM Background] TaskId:', taskId);
      console.log('📤 [FCM Background] Phone:', phone);

      // 네이티브 모듈로 승인 알림 표시
      if (SmsApprovalModule && taskId) {
        try {
          await SmsApprovalModule.showApprovalNotification(
            taskId,
            phone,
            messagePreview || '문자 내용을 확인하려면 탭하세요'
          );
          console.log('✅ [FCM Background] Approval notification shown');
        } catch (error) {
          console.error('❌ [FCM Background] Failed to show notification:', error);
        }
      }
    }
    // 배치 SMS 발송 요청인 경우
    else if (data?.type === 'send_sms_batch') {
      const count = parseInt(data.count || '0', 10);
      const taskIdsJson = data.taskIds;

      console.log('📤 [FCM Background] Showing batch approval notification');
      console.log('📤 [FCM Background] Count:', count);

      if (SmsApprovalModule && taskIdsJson && count > 0) {
        try {
          await SmsApprovalModule.showBatchApprovalNotification(taskIdsJson, count);
          console.log('✅ [FCM Background] Batch approval notification shown');
        } catch (error) {
          console.error('❌ [FCM Background] Failed to show batch notification:', error);
        }
      }
    }
  } catch (error) {
    console.error('❌ [FCM Background] Error:', error);
  }

  console.log('📩 [FCM Background] ===== PROCESSING COMPLETE =====');
});

AppRegistry.registerComponent(appName, () => App);
