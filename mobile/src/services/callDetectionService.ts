import { Platform } from 'react-native';
import CallDetectorManager from 'react-native-call-detection';
import { handleCallEvent, CallEventType } from '../lib/callbackManager';

let callDetector: CallDetectorManager | null = null;

// 마지막 통화 상태 추적
let lastCallState: string | null = null;
let wasCallAnswered = false;
let wasIncoming = false; // 수신 전화인지 발신 전화인지 구분
let currentPhoneNumber: string | null = null;

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
      callDetector = null;
    }

    // 상태 초기화
    lastCallState = null;
    wasCallAnswered = false;
    wasIncoming = false;
    currentPhoneNumber = null;

    callDetector = new CallDetectorManager(
      (event: string, phoneNumber: string) => {
        try {
          console.log('=== Call Event ===');
          console.log('Event:', event);
          console.log('Phone:', phoneNumber);
          console.log('Last state:', lastCallState);
          console.log('Was answered:', wasCallAnswered);

          // 전화번호 저장
          if (phoneNumber) {
            currentPhoneNumber = phoneNumber;
          }

          // 이벤트 처리
          switch (event) {
            case 'Incoming':
              // 전화가 오고 있음 (수신 전화)
              lastCallState = 'Incoming';
              wasCallAnswered = false;
              wasIncoming = true; // 수신 전화로 표시
              console.log('📞 Incoming call detected');
              break;

            case 'Offhook':
              // 전화를 받음 (통화 중)
              // Offhook이 Incoming 없이 발생하면 발신 전화
              if (lastCallState === 'Incoming') {
                wasCallAnswered = true;
                console.log('✅ Call answered (incoming)');
              } else if (lastCallState === null) {
                // Incoming 없이 Offhook이 오면 발신 전화
                wasIncoming = false;
                console.log('📤 Outgoing call detected (Offhook without Incoming)');
              }
              lastCallState = 'Offhook';
              break;

            case 'Disconnected':
              // 전화가 끊김
              const eventType = determineCallEventType(lastCallState, wasCallAnswered, wasIncoming);
              console.log('📴 Call disconnected - Type:', eventType, {
                lastState: lastCallState,
                wasAnswered: wasCallAnswered,
                wasIncoming: wasIncoming
              });

              // 발신 전화는 콜백 발송 안 함
              if (!wasIncoming) {
                console.log('❌ Outgoing call - callback skipped');
              } else if (currentPhoneNumber && eventType) {
                handleCallEvent(userId, currentPhoneNumber, eventType).catch((error) => {
                  console.error('Error handling call event:', error);
                });
              }

              // 상태 초기화
              lastCallState = null;
              wasCallAnswered = false;
              wasIncoming = false;
              currentPhoneNumber = null;
              break;

            case 'Missed':
              // 부재중 (일부 기기에서 직접 전달)
              console.log('📞 Missed call detected directly');
              if (currentPhoneNumber && wasIncoming) {
                handleCallEvent(userId, currentPhoneNumber, 'missed').catch((error) => {
                  console.error('Error handling missed call:', error);
                });
              }
              lastCallState = null;
              wasCallAnswered = false;
              wasIncoming = false;
              currentPhoneNumber = null;
              break;
          }
        } catch (error) {
          console.error('Error in call event handler:', error);
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
  } catch (error: any) {
    console.error('Error initializing call detection:', error);
    callDetector = null;
  }
}

/**
 * 통화 이벤트 타입 결정
 */
function determineCallEventType(
  lastState: string | null,
  answered: boolean,
  wasIncoming: boolean
): CallEventType | null {
  console.log('Determining event type:', { lastState, answered, wasIncoming });

  // 발신 전화는 항상 null 반환 (콜백 안 보냄)
  if (!wasIncoming) {
    console.log('❌ Outgoing call - no callback');
    return null;
  }

  if (lastState === 'Offhook' && answered) {
    // 수신 전화를 받고 끊음 = 통화 종료
    console.log('✅ Call ended (answered)');
    return 'ended';
  } else if (lastState === 'Incoming' && !answered) {
    // 수신 전화가 왔는데 안 받고 끊김 = 부재중
    console.log('📞 Missed call (not answered)');
    return 'missed';
  } else if (lastState === 'Offhook' && !answered) {
    // Offhook이었는데 answered가 false면 이상한 케이스
    // 하지만 wasIncoming이 true면 수신 전화이므로 통화 종료로 처리
    console.log('⚠️ Unusual case: Offhook but not answered, treating as ended');
    return 'ended';
  }

  // 기본: 통화 종료로 처리 (수신 전화인 경우)
  console.log('✅ Default: Call ended');
  return 'ended';
}

/**
 * 통화 감지 중지
 */
export function stopCallDetection(): void {
  // CallDetectorManager는 직접 중지 메서드가 없지만
  // 앱이 종료되면 자동으로 중지됨
  callDetector = null;
}




