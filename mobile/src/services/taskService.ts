import { supabase } from '../../lib/supabaseClient';
import { Task } from '../lib/types/task';
import { smsQueue } from '../lib/smsQueue';
import { sendSms } from '../lib/smsSender';
import { checkDailyLimit, isLimitExceeded } from '../lib/dailyLimit';

/**
 * 작업 서비스 - 큐와 발송을 통합 관리
 */
class TaskService {
  private userId: string | null = null;
  private subscription: any = null;

  /**
   * 사용자 ID 설정
   */
  setUserId(userId: string): void {
    this.userId = userId;
    this.setupQueue();
    this.subscribeToTasks();
  }

  /**
   * 큐 설정
   */
  private setupQueue(): void {
    // 큐 처리 함수 설정
    smsQueue.onProcess = async (task: Task) => {
      // 한도 체크
      if (this.userId) {
        const limitExceeded = await isLimitExceeded(this.userId);
        if (limitExceeded) {
          throw new Error('일일 한도가 초과되었습니다.');
        }
      }

      // SMS 발송
      await sendSms(
        task,
        () => {
          console.log('SMS sent successfully:', task.id);
        },
        (error) => {
          console.error('SMS send failed:', error);
          throw new Error(error);
        }
      );
    };

    // 실패 처리 함수 설정
    smsQueue.onFailure = async (task: Task, error: string) => {
      console.error('Task failed after retries:', task.id, error);
      // tasks 테이블 상태 업데이트는 sendSms에서 이미 처리됨
    };
  }

  /**
   * Supabase 실시간 구독 설정
   */
  private subscribeToTasks(): void {
    if (!this.userId) return;

    // 기존 구독 해제
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
    }

    // 새 구독 생성
    const channel = supabase
      .channel('tasks-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${this.userId}`,
        },
        async (payload) => {
          console.log('New task received:', payload);
          const newTask = payload.new as Task;

          // pending 상태이고 예약이 아니거나 예약 시간이 된 작업만 처리
          if (newTask.status === 'pending') {
            const now = new Date();
            const scheduledAt = newTask.scheduled_at
              ? new Date(newTask.scheduled_at)
              : null;

            if (!scheduledAt || scheduledAt <= now) {
              await this.addTaskToQueue(newTask);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${this.userId}`,
        },
        async (payload) => {
          const updatedTask = payload.new as Task;
          const oldTask = payload.old as Task;

          // 상태가 pending으로 변경되었거나 예약 시간이 된 경우
          if (
            updatedTask.status === 'pending' &&
            oldTask.status !== 'pending'
          ) {
            const now = new Date();
            const scheduledAt = updatedTask.scheduled_at
              ? new Date(updatedTask.scheduled_at)
              : null;

            if (!scheduledAt || scheduledAt <= now) {
              await this.addTaskToQueue(updatedTask);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    this.subscription = channel;
  }

  /**
   * 작업을 큐에 추가
   */
  async addTaskToQueue(task: Task): Promise<void> {
    if (!this.userId) return;

    // 한도 체크
    const { canSend } = await checkDailyLimit(this.userId);
    if (!canSend) {
      console.warn('Daily limit exceeded, task not added to queue:', task.id);
      // tasks 테이블 상태를 'failed'로 업데이트
      await supabase
        .from('tasks')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', task.id);
      return;
    }

    // 큐에 추가
    await smsQueue.add(task, task.priority || 0);

    // tasks 테이블 상태를 'queued'로 업데이트
    await supabase
      .from('tasks')
      .update({ status: 'queued', updated_at: new Date().toISOString() })
      .eq('id', task.id);
  }

  /**
   * 대기 중인 작업 로드 (앱 시작 시)
   */
  async loadPendingTasks(): Promise<void> {
    if (!this.userId) return;

    try {
      const now = new Date().toISOString();

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', this.userId)
        .in('status', ['pending', 'queued'])
        .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading pending tasks:', error);
        return;
      }

      if (tasks) {
        for (const task of tasks) {
          await this.addTaskToQueue(task);
        }
      }
    } catch (error) {
      console.error('Error in loadPendingTasks:', error);
    }
  }

  /**
   * 구독 해제
   */
  unsubscribe(): void {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }
  }

  /**
   * 큐 상태 가져오기
   */
  getQueueStatus() {
    return smsQueue.getStatus();
  }

  /**
   * 큐 가져오기
   */
  getQueue() {
    return smsQueue.getQueue();
  }
}

// 싱글톤 인스턴스
export const taskService = new TaskService();

