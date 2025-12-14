import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { supabase } from '../../lib/supabaseClient';

const { SmsApprovalModule } = NativeModules;

// 이벤트 에미터 생성
const eventEmitter = Platform.OS === 'android' && SmsApprovalModule
  ? new NativeEventEmitter(SmsApprovalModule)
  : null;

/**
 * SMS 승인 모듈 래퍼
 */
class SmsApprovalService {
  private approveCallback: ((taskId: string) => void) | null = null;
  private cancelCallback: ((taskId: string) => void) | null = null;
  private subscriptions: any[] = [];

  constructor() {
    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners() {
    if (!eventEmitter) {
      console.warn('[SmsApproval] Not available on this platform');
      return;
    }

    // 승인 이벤트
    const approveSubscription = eventEmitter.addListener('onSmsApproved', (taskId: string) => {
      console.log('📱 [SmsApproval] SMS Approved:', taskId);
      if (this.approveCallback) {
        this.approveCallback(taskId);
      }
    });

    // 취소 이벤트
    const cancelSubscription = eventEmitter.addListener('onSmsCancelled', (taskId: string) => {
      console.log('📱 [SmsApproval] SMS Cancelled:', taskId);
      if (this.cancelCallback) {
        this.cancelCallback(taskId);
      }
    });

    this.subscriptions.push(approveSubscription, cancelSubscription);
    console.log('📱 [SmsApproval] Event listeners set up');
  }

  /**
   * 승인/취소 콜백 설정
   */
  setCallbacks(
    onApprove: (taskId: string) => void,
    onCancel: (taskId: string) => void
  ) {
    this.approveCallback = onApprove;
    this.cancelCallback = onCancel;
  }

  /**
   * 승인 알림 표시
   */
  async showApprovalNotification(
    taskId: string,
    phoneNumber: string,
    message: string
  ): Promise<number | { autoApproved: boolean }> {
    if (Platform.OS !== 'android' || !SmsApprovalModule) {
      console.warn('[SmsApproval] Not available on this platform');
      return -1;
    }

    try {
      console.log('📱 [SmsApproval] Showing notification:', { taskId, phoneNumber });
      const result = await SmsApprovalModule.showApprovalNotification(taskId, phoneNumber, message);
      console.log('📱 [SmsApproval] Notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ [SmsApproval] Failed to show notification:', error);
      throw error;
    }
  }

  /**
   * 자동 승인 설정
   */
  async setAutoApprove(enabled: boolean): Promise<boolean> {
    if (Platform.OS !== 'android' || !SmsApprovalModule) {
      console.warn('[SmsApproval] Not available on this platform');
      return false;
    }

    try {
      console.log('📱 [SmsApproval] Setting auto-approve:', enabled);
      const result = await SmsApprovalModule.setAutoApprove(enabled);
      return result;
    } catch (error) {
      console.error('❌ [SmsApproval] Failed to set auto-approve:', error);
      return false;
    }
  }

  /**
   * 자동 승인 상태 확인
   */
  async getAutoApprove(): Promise<boolean> {
    if (Platform.OS !== 'android' || !SmsApprovalModule) {
      return false;
    }

    try {
      const result = await SmsApprovalModule.getAutoApprove();
      return result;
    } catch (error) {
      console.error('❌ [SmsApproval] Failed to get auto-approve:', error);
      return false;
    }
  }

  /**
   * 알림 취소
   */
  async cancelNotification(notificationId: number): Promise<void> {
    if (Platform.OS !== 'android' || !SmsApprovalModule) {
      return;
    }

    try {
      await SmsApprovalModule.cancelNotification(notificationId);
    } catch (error) {
      console.error('❌ [SmsApproval] Failed to cancel notification:', error);
    }
  }

  /**
   * 작업 상태 업데이트 (취소)
   */
  async cancelTask(taskId: string): Promise<void> {
    try {
      console.log('📱 [SmsApproval] Cancelling task:', taskId);
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'cancelled',
          error_message: '사용자가 취소함',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        console.error('❌ [SmsApproval] Failed to cancel task:', error);
      } else {
        console.log('✅ [SmsApproval] Task cancelled:', taskId);
      }
    } catch (error) {
      console.error('❌ [SmsApproval] Error cancelling task:', error);
    }
  }

  /**
   * 배치 승인 알림 표시 (다량 SMS)
   * "N건의 문자 발송 요청" 형태로 1개 알림
   */
  async showBatchApprovalNotification(
    taskIds: string[],
    count: number
  ): Promise<number | { autoApproved: boolean }> {
    if (Platform.OS !== 'android' || !SmsApprovalModule) {
      console.warn('[SmsApproval] Not available on this platform');
      return -1;
    }

    try {
      console.log('📱 [SmsApproval] Showing batch notification:', { count, taskIds: taskIds.length });

      // taskIds를 JSON 문자열로 전달
      const taskIdsJson = JSON.stringify(taskIds);
      const result = await SmsApprovalModule.showBatchApprovalNotification(taskIdsJson, count);
      console.log('📱 [SmsApproval] Batch notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ [SmsApproval] Failed to show batch notification:', error);
      throw error;
    }
  }

  /**
   * 정리
   */
  cleanup() {
    this.subscriptions.forEach(sub => sub.remove());
    this.subscriptions = [];
    this.approveCallback = null;
    this.cancelCallback = null;
  }
}

export const smsApprovalService = new SmsApprovalService();
