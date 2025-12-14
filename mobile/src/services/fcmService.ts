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
    console.log('📱 [FCM] ===== GETTING FCM TOKEN =====');
    try {
      const token = await messaging().getToken();
      console.log('📱 [FCM] 토큰 획득 성공');
      console.log('📱 [FCM] 토큰 (처음 20자):', token ? token.substring(0, 20) + '...' : 'null');
      console.log('📱 [FCM] 토큰 길이:', token?.length || 0);

      if (token) {
        console.log('💾 [FCM] 토큰을 Supabase에 저장 중...');
        await this.saveTokenToSupabase(token);
      } else {
        console.warn('⚠️ [FCM] 토큰이 null입니다');
      }

      console.log('✅ [FCM] 토큰 가져오기 및 저장 완료');
      return token;
    } catch (error) {
      console.error('❌ [FCM] 토큰 가져오기 실패:', error);
      console.error('❌ [FCM] Error details:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * 토큰을 Supabase에 저장
   */
  private async saveTokenToSupabase(token: string): Promise<void> {
    console.log('💾 [FCM] ===== SAVING TOKEN TO SUPABASE =====');
    try {
      console.log('💾 [FCM] Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ [FCM] 사용자 조회 실패:', userError);
        return;
      }
      
      if (!user) {
        console.warn('⚠️ [FCM] 사용자 없음, 토큰 저장 스킵');
        return;
      }

      console.log('💾 [FCM] User ID:', user.id);
      console.log('💾 [FCM] Upserting token to user_settings...');

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
        console.error('❌ [FCM] Error code:', error.code);
        console.error('❌ [FCM] Error message:', error.message);
        console.error('❌ [FCM] Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ [FCM] 토큰 저장 완료');
        console.log('✅ [FCM] User ID:', user.id);
      }
    } catch (error) {
      console.error('❌ [FCM] 토큰 저장 중 오류:', error);
      console.error('❌ [FCM] Error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ [FCM] Error stack:', error instanceof Error ? error.stack : 'No stack');
    }
  }

  /**
   * FCM 메시지 처리 (SMS 발송)
   */
  private async handleMessage(remoteMessage: any): Promise<void> {
    console.log('📨 [FCM] ===== FOREGROUND MESSAGE RECEIVED =====');
    console.log('📨 [FCM] Full message:', JSON.stringify(remoteMessage, null, 2));
    
    try {
      const data = remoteMessage.data;
      console.log('📨 [FCM] Message data:', data);
      console.log('📨 [FCM] Message type:', data?.type);
      console.log('📨 [FCM] Task ID:', data?.taskId);

      // 작업 타입 확인
      if (data?.type === 'send_sms' || data?.type === 'send_mms') {
        console.log('📤 [FCM] SMS 발송 작업 감지');

        // taskId가 있으면 해당 작업을 직접 처리
        if (data.taskId) {
          console.log('🔍 [FCM] Processing specific task:', data.taskId);
          await this.processTask(data.taskId);
        } else {
          // taskId가 없으면 대기 중인 작업 로드
          console.log('🔍 [FCM] No taskId, loading all pending tasks');
          await taskService.loadPendingTasks();
        }
        console.log('✅ [FCM] Message processing completed');
      } else {
        console.log('ℹ️ [FCM] Message type is not send_sms/send_mms:', data?.type);
      }
    } catch (error) {
      console.error('❌ [FCM] 메시지 처리 실패:', error);
      console.error('❌ [FCM] Error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ [FCM] Error stack:', error instanceof Error ? error.stack : 'No stack');
    }
    
    console.log('📨 [FCM] ===== FOREGROUND MESSAGE PROCESSING COMPLETE =====');
  }

  /**
   * 특정 작업 처리
   */
  private async processTask(taskId: string): Promise<void> {
    console.log('🔍 [FCM] ===== PROCESSING TASK =====');
    console.log('🔍 [FCM] Task ID:', taskId);
    
    try {
      console.log('🔍 [FCM] Querying task from database...');
      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) {
        console.error('❌ [FCM] 작업 조회 실패:', error);
        console.error('❌ [FCM] Error code:', error.code);
        console.error('❌ [FCM] Error message:', error.message);
        console.error('❌ [FCM] Error details:', JSON.stringify(error, null, 2));
        return;
      }

      if (!task) {
        console.warn('⚠️ [FCM] 작업을 찾을 수 없음:', taskId);
        return;
      }

      console.log('✅ [FCM] Task found:', {
        id: task.id,
        status: task.status,
        type: task.type,
        customer_phone: task.customer_phone,
        created_at: task.created_at
      });

      if (task.status !== 'pending') {
        console.log('ℹ️ [FCM] 작업이 pending 상태가 아님:', task.status);
        console.log('ℹ️ [FCM] Current status:', task.status);
        return;
      }

      console.log('📤 [FCM] 작업 큐에 추가 시작:', taskId);
      await taskService.addTaskToQueue(task);
      console.log('✅ [FCM] 작업 큐에 추가 완료:', taskId);
    } catch (error) {
      console.error('❌ [FCM] 작업 처리 실패:', error);
      console.error('❌ [FCM] Error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ [FCM] Error stack:', error instanceof Error ? error.stack : 'No stack');
    }
    
    console.log('🔍 [FCM] ===== TASK PROCESSING COMPLETE =====');
  }
}

export const fcmService = new FCMService();
