import messaging from '@react-native-firebase/messaging';
import { supabase } from '../../lib/supabaseClient';
import { taskService } from './taskService';
import { smsApprovalService } from '../lib/smsApproval';

/**
 * FCM 푸시 알림 서비스
 * 웹에서 문자 발송 요청 시 DATA-ONLY 푸시를 받아
 * 앱에서 직접 승인/취소 알림을 표시
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
        console.log('📩 [FCM] 포그라운드 메시지 수신');
        await this.handleMessage(remoteMessage);
      });

      // 알림 탭 이벤트 (앱이 백그라운드에서 알림을 탭해서 열릴 때)
      messaging().onNotificationOpenedApp(async (remoteMessage) => {
        console.log('📩 [FCM] 알림 탭으로 앱 열림');
        // 알림을 탭해서 열린 경우 이미 처리됨
      });

      // 앱이 종료된 상태에서 알림 탭으로 앱이 열릴 때
      messaging()
        .getInitialNotification()
        .then(async (remoteMessage) => {
          if (remoteMessage) {
            console.log('📩 [FCM] 종료 상태에서 알림 탭으로 앱 열림');
            // 앱이 열릴 때 pending tasks 로드로 처리
          }
        });

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
    console.log('📱 [FCM] Getting FCM token...');
    try {
      const token = await messaging().getToken();
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
      if (!user) return;

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
        console.error('❌ [FCM] 토큰 저장 실패:', error.message);
      } else {
        console.log('✅ [FCM] 토큰 저장 완료');
      }
    } catch (error) {
      console.error('❌ [FCM] 토큰 저장 중 오류:', error);
    }
  }

  /**
   * FCM 메시지 처리 (DATA-ONLY)
   * 웹에서 보낸 data를 기반으로 직접 승인 알림 표시
   */
  private async handleMessage(remoteMessage: any): Promise<void> {
    console.log('📨 [FCM] ===== MESSAGE RECEIVED =====');

    try {
      const data = remoteMessage.data;
      if (!data) {
        console.log('ℹ️ [FCM] No data in message');
        return;
      }

      const messageType = data.type;
      console.log('📨 [FCM] Type:', messageType, 'Count:', data.count);

      // 단일 SMS
      if (messageType === 'send_sms' || messageType === 'send_mms') {
        const taskId = data.taskId;
        // taskId가 있고, taskIds가 비어있을 때만 단일 처리 (배치와 구분)
        if (taskId && (!data.taskIds || data.taskIds === '')) {
          await this.showApprovalFromData(taskId, data);
        } else if (!taskId && data.taskIds) {
          // taskId가 없고 taskIds가 있으면 배치로 처리 (단일이지만 taskIds로 온 경우)
          console.log('⚠️ [FCM] Single task but taskIds provided, treating as batch');
          try {
            const taskIds = JSON.parse(data.taskIds) as string[];
            if (taskIds.length === 1) {
              // 단일이지만 taskIds로 온 경우
              await this.showApprovalFromData(taskIds[0], data);
            } else {
              await this.showBatchApproval(taskIds, taskIds.length);
            }
          } catch (e) {
            console.error('❌ [FCM] taskIds 파싱 실패:', e);
          }
        }
      }
      // 다량 SMS (배치)
      else if (messageType === 'send_sms_batch') {
        const count = parseInt(data.count || '0', 10);
        const taskIdsJson = data.taskIds;

        if (taskIdsJson && count > 0) {
          try {
            const taskIds = JSON.parse(taskIdsJson) as string[];
            await this.showBatchApproval(taskIds, count);
          } catch (e) {
            console.error('❌ [FCM] taskIds 파싱 실패:', e);
          }
        }
      }
    } catch (error) {
      console.error('❌ [FCM] 메시지 처리 실패:', error);
    }

    console.log('📨 [FCM] ===== MESSAGE PROCESSING COMPLETE =====');
  }

  /**
   * FCM data를 기반으로 승인 알림 표시 (단일)
   */
  private async showApprovalFromData(taskId: string, data: any): Promise<void> {
    console.log('📱 [FCM] Showing approval for task:', taskId);

    // 중복 방지: 먼저 체크하고 표시
    if (taskService.isNotified(taskId)) {
      console.log('⏭️ [FCM] Task already notified, skipping:', taskId);
      return;
    }

    // DB에서 전체 task 정보 가져오기
    try {
      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error || !task) {
        console.error('❌ [FCM] 작업 조회 실패:', error?.message || 'Task not found');
        return;
      }

      // pending 또는 queued 상태인 경우에만 처리
      if (task.status !== 'pending' && task.status !== 'queued') {
        console.log('ℹ️ [FCM] 작업이 처리 가능한 상태가 아님:', task.status);
        return;
      }

      // 중복 방지: 표시 전에 다시 한 번 체크 (Realtime과의 경쟁 조건 방지)
      if (taskService.isNotified(taskId)) {
        console.log('⏭️ [FCM] Task already notified (race condition), skipping:', taskId);
        return;
      }

      // 중복 방지: 표시 직전에 마킹
      taskService.markAsNotified(taskId);

      // 승인 알림 표시
      await taskService.requestApproval(task);
      console.log('✅ [FCM] Approval notification shown for:', taskId);
    } catch (error) {
      console.error('❌ [FCM] 승인 요청 실패:', error);
    }
  }

  /**
   * 다량 SMS 승인 알림 표시 (배치)
   * "N건의 문자 발송 요청" 형태로 1개 알림
   */
  private async showBatchApproval(taskIds: string[], count: number): Promise<void> {
    console.log('📱 [FCM] Showing batch approval for', count, 'tasks');

    // 모든 taskId를 미리 등록 (중복 방지)
    taskIds.forEach(id => taskService.markAsNotified(id));
    
    // 배치 승인 시작 (모든 taskId를 batchApprovalInProgress에 추가)
    taskService.startBatchApproval(taskIds);

    try {
      // 배치 승인 알림 표시
      const result = await smsApprovalService.showBatchApprovalNotification(
        taskIds,
        count
      );

      console.log('✅ [FCM] Batch approval notification shown, result:', result);
    } catch (error) {
      console.error('❌ [FCM] 배치 승인 요청 실패:', error);
    }
  }
}

export const fcmService = new FCMService();
