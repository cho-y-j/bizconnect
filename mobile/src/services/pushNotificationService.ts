import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabaseClient';

/**
 * 푸시 알림 서비스
 * FCM 설정 전까지 로컬 알림 사용
 */
class PushNotificationService {
  private initialized = false;

  /**
   * 푸시 알림 초기화
   */
  initialize(): void {
    if (this.initialized) return;

    PushNotification.configure({
      onRegister: async (token) => {
        console.log('Push notification token:', token);
        // Supabase에 토큰 저장 (나중에 구현)
        await this.saveTokenToSupabase(token.token);
      },
      onNotification: (notification) => {
        console.log('Notification received:', notification);
        // 알림 클릭 처리
        if (notification.userInteraction) {
          this.handleNotificationClick(notification);
        }
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // 채널 생성 (Android)
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'bizconnect-default',
          channelName: 'BizConnect 알림',
          channelDescription: '비즈커넥트 기본 알림 채널',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      );
    }

    this.initialized = true;
  }

  /**
   * 토큰을 Supabase에 저장
   */
  private async saveTokenToSupabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // user_settings 테이블에 토큰 저장 (나중에 구현)
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          fcm_token: token,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  /**
   * 알림 클릭 처리
   */
  private handleNotificationClick(notification: any): void {
    // 딥링크 처리 (나중에 구현)
    const data = notification.data;
    if (data?.screen) {
      // 네비게이션 처리
      console.log('Navigate to:', data.screen);
    }
  }

  /**
   * 로컬 알림 발송
   */
  showLocalNotification(
    title: string,
    message: string,
    data?: any
  ): void {
    PushNotification.localNotification({
      channelId: 'bizconnect-default',
      title,
      message,
      data,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      priority: 'high',
    });
  }

  /**
   * 생일/기념일 알림 스케줄링
   */
  scheduleBirthdayNotification(
    customerName: string,
    date: Date,
    type: 'birthday' | 'anniversary'
  ): void {
    const title = type === 'birthday' ? '생일 알림' : '기념일 알림';
    const message = `${customerName}님의 ${type === 'birthday' ? '생일' : '기념일'}입니다!`;

    PushNotification.localNotificationSchedule({
      channelId: 'bizconnect-default',
      title,
      message,
      date,
      playSound: true,
      soundName: 'default',
      data: {
        type,
        customerName,
        screen: 'Home',
      },
    });
  }

  /**
   * 작업 완료 알림
   */
  notifyTaskCompleted(count: number): void {
    this.showLocalNotification(
      '발송 완료',
      `${count}개의 메시지 발송이 완료되었습니다.`,
      {
        screen: 'Home',
        type: 'task_completed',
      }
    );
  }

  /**
   * 한도 경고 알림
   */
  notifyLimitWarning(used: number, limit: number): void {
    const percentage = Math.round((used / limit) * 100);
    this.showLocalNotification(
      '한도 경고',
      `일일 한도 ${percentage}% 사용 중입니다. (${used}/${limit})`,
      {
        screen: 'Home',
        type: 'limit_warning',
      }
    );
  }

  /**
   * 한도 초과 알림
   */
  notifyLimitExceeded(): void {
    this.showLocalNotification(
      '한도 초과',
      '일일 한도를 초과했습니다. 내일까지 발송이 중단됩니다.',
      {
        screen: 'Home',
        type: 'limit_exceeded',
      }
    );
  }

  /**
   * 모든 알림 취소
   */
  cancelAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
  }
}

export const pushNotificationService = new PushNotificationService();




