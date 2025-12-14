/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';
import {taskService} from './src/services/taskService';

// FCM 백그라운드 메시지 핸들러 등록
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📩 [FCM Background] ===== BACKGROUND MESSAGE RECEIVED =====');
  console.log('📩 [FCM Background] Message:', JSON.stringify(remoteMessage, null, 2));

  try {
    const data = remoteMessage.data;
    console.log('📩 [FCM Background] Message data:', data);
    
    if (data?.type === 'send_sms' || data?.type === 'send_mms') {
      console.log('📤 [FCM Background] SMS task detected, taskId:', data.taskId);
      console.log('ℹ️ [FCM Background] Task will be processed when app comes to foreground');
      // 백그라운드에서는 userId가 없어서 처리할 수 없음
      // 앱이 포그라운드로 돌아올 때 자동으로 pending tasks를 로드하도록 함
    } else {
      console.log('ℹ️ [FCM Background] Message type is not send_sms/send_mms:', data?.type);
    }
  } catch (error) {
    console.error('❌ [FCM Background] Error processing background message:', error);
    console.error('❌ [FCM Background] Error details:', error?.message, error?.stack);
  }
  
  console.log('📩 [FCM Background] ===== BACKGROUND MESSAGE PROCESSING COMPLETE =====');
});

AppRegistry.registerComponent(appName, () => App);




