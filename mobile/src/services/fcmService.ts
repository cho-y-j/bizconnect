import messaging from '@react-native-firebase/messaging';
import { supabase } from '../../lib/supabaseClient';
import { taskService } from './taskService';

/**
 * FCM 푸시 알림 서비스
 * 웹에서 문자 발송 요청 시 푸시를 받아 SMS 발송
 */
class FCMService {
  private initialized = false;

  /**
   * FCM 초기화
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 알림 권한 요청
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('❌ [FCM] 알림 권한이 거부되었습니다.');
        return;
      }

      console.log('✅ [FCM] 알림 권한 획득:', authStatus);

      // FCM 토큰 가져오기 및 저장
      await this.getAndSaveToken();

      // 토큰 갱신 리스너
      messaging().onTokenRefresh(async (newToken) => {
        console.log('🔄 [FCM] 토큰 갱신됨');
        await this.saveTokenToSupabase(newToken);
      });

      // 포그라운드 메시지 핸들러
      messaging().onMessage(async (remoteMessage) => {
        console.log('📩 [FCM] 포그라운드 메시지 수신:', JSON.stringify(remoteMessage, null, 2));
        await this.handleMessage(remoteMessage);
      });

      // 백그라운드 메시지 핸들러는 index.js에서 등록됨 (앱 시작 전에 등록 필요)

      this.initialized = true;
      console.log('✅ [FCM] 초기화 완료');
    } catch (error) {
      console.error('❌ [FCM] 초기화 실패:', error);
    }
  }

  /**
   * FCM 토큰 가져오기 및 저장
   */
  async getAndSaveToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('📱 [FCM] 토큰:', token);

      if (token) {
        await this.saveTokenToSupabase(token);
      }

      return token;
    } catch (error) {
      console.error('❌ [FCM] 토큰 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * 토큰을 Supabase에 저장
   */
  private async saveTokenToSupabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ [FCM] 사용자 없음, 토큰 저장 스킵');
        return;
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          fcm_token: token,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('❌ [FCM] 토큰 저장 실패:', error);
      } else {
        console.log('✅ [FCM] 토큰 저장 완료');
      }
    } catch (error) {
      console.error('❌ [FCM] 토큰 저장 중 오류:', error);
    }
  }

  /**
   * FCM 메시지 처리 (SMS 발송)
   */
  private async handleMessage(remoteMessage: any): Promise<void> {
    try {
      const data = remoteMessage.data;
      console.log('📨 [FCM] 메시지 데이터:', data);

      // 작업 타입 확인
      if (data?.type === 'send_sms' || data?.type === 'send_mms') {
        console.log('📤 [FCM] SMS 발송 작업 감지');

        // taskId가 있으면 해당 작업을 직접 처리
        if (data.taskId) {
          await this.processTask(data.taskId);
        } else {
          // taskId가 없으면 대기 중인 작업 로드
          await taskService.loadPendingTasks();
        }
      }
    } catch (error) {
      console.error('❌ [FCM] 메시지 처리 실패:', error);
    }
  }

  /**
   * 특정 작업 처리
   */
  private async processTask(taskId: string): Promise<void> {
    try {
      console.log('🔍 [FCM] 작업 조회:', taskId);

      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) {
        console.error('❌ [FCM] 작업 조회 실패:', error);
        return;
      }

      if (!task) {
        console.warn('⚠️ [FCM] 작업을 찾을 수 없음:', taskId);
        return;
      }

      if (task.status !== 'pending') {
        console.log('ℹ️ [FCM] 작업이 pending 상태가 아님:', task.status);
        return;
      }

      console.log('📤 [FCM] 작업 큐에 추가:', taskId);
      await taskService.addTaskToQueue(task);
    } catch (error) {
      console.error('❌ [FCM] 작업 처리 실패:', error);
    }
  }
}

export const fcmService = new FCMService();
