import { Platform } from 'react-native';
import CallDetectorManager from 'react-native-call-detection';
import { handleCallEnded } from '../lib/callbackManager';
import { useAuth } from '../contexts/AuthContext';

let callDetector: CallDetectorManager | null = null;

/**
 * 통화 감지 서비스 초기화
 */
export function initializeCallDetection(userId: string): void {
  if (Platform.OS !== 'android') {
    console.log('Call detection is only available on Android');
    return;
  }

  try {
    // 기존 감지기 제거
    if (callDetector) {
      // CallDetectorManager는 직접 제거 메서드가 없으므로 새로 생성
    }

    callDetector = new CallDetectorManager(
      (event: string, phoneNumber: string) => {
        console.log('Call event:', event, phoneNumber);

        if (event === 'Disconnected') {
          // 통화 종료 시 콜백 처리
          handleCallEnded(userId, phoneNumber).catch((error) => {
            console.error('Error handling call ended:', error);
          });
        }
      },
      true, // read phone number
      () => {
        console.warn('Call detection permission denied');
      },
      {
        title: '전화 상태 권한',
        message: '통화 종료 후 자동으로 콜백 문자를 보내기 위해 전화 상태 접근 권한이 필요합니다.',
      }
    );

    console.log('Call detection initialized');
  } catch (error) {
    console.error('Error initializing call detection:', error);
  }
}

/**
 * 통화 감지 중지
 */
export function stopCallDetection(): void {
  // CallDetectorManager는 직접 중지 메서드가 없지만
  // 앱이 종료되면 자동으로 중지됨
  callDetector = null;
}



