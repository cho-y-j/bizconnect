/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';

// FCM 백그라운드 메시지 핸들러 등록
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📩 [FCM] Background message received:', JSON.stringify(remoteMessage, null, 2));
  // 백그라운드에서는 앱이 포그라운드로 돌아올 때 처리됨
});

AppRegistry.registerComponent(appName, () => App);




