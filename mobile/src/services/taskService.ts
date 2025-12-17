import { supabase } from '../../lib/supabaseClient';
import { Task } from '../lib/types/task';
import { smsQueue } from '../lib/smsQueue';
import { sendSms } from '../lib/smsSender';
import { checkDailyLimit, isLimitExceeded } from '../lib/dailyLimit';
import { smsApprovalService } from '../lib/smsApproval';

/**
 * 작업 서비스 - 큐와 발송을 통합 관리
 */
const RECENT_MINUTES = 2; // 최근 2분 내 생성된 작업만 자동 처리 (FCM으로 온 작업은 이미 처리되므로 짧은 시간만 확인)
const MAX_TASK_AGE_MINUTES = 10; // 최대 10분 이내 작업만 처리 (오래된 작업 방지)

class TaskService {
  private userId: string | null = null;
  private subscription: any = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  // 웹에서 보낸 작업을 처리하기 위해 자동 구독 활성화
  private disableAutoProcessing = false;
  // 승인 대기 중인 작업 저장
  private pendingApprovalTasks: Map<string, Task> = new Map();
  // 이미 알림을 보낸 작업 ID (중복 알림 방지)
  private notifiedTaskIds: Set<string> = new Set();
  // 자동 승인된 작업 ID (중복 처리 방지)
  private autoApprovedTaskIds: Set<string> = new Set();
  // 배치 승인 처리 중인 작업 그룹 (배치 승인 시 여러 taskId가 연속으로 올 수 있음)
  private batchApprovalInProgress: Set<string> = new Set();

  /**
   * 사용자 ID 설정
   */
  async setUserId(userId: string): Promise<void> {
    try {
      console.log('🔧 ===== TASK SERVICE INITIALIZATION =====');
      console.log('🔧 Setting userId:', userId);
      this.userId = userId;

      // user_settings에서 throttle_interval 조회 및 적용
      try {
        const { data: userSettings, error: settingsError } = await supabase
          .from('user_settings')
          .select('throttle_interval')
          .eq('user_id', userId)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.warn('⚠️ Error loading throttle_interval:', settingsError);
        }

        const throttleInterval = userSettings?.throttle_interval || 15; // 기본값 15초
        smsQueue.setThrottleInterval(throttleInterval * 1000); // 초를 밀리초로 변환
        console.log(`⏱️ Throttle interval set to: ${throttleInterval} seconds (${throttleInterval * 1000}ms)`);
      } catch (error) {
        console.error('❌ Error loading throttle_interval, using default:', error);
        smsQueue.setThrottleInterval(15 * 1000); // 기본값 15초
      }

      console.log('🔧 Setting up queue...');
      this.setupQueue();
      console.log('🔧 Setting up approval callbacks...');
      this.setupApprovalCallbacks();
      console.log('🔧 Subscribing to tasks...');
      this.subscribeToTasks();
      console.log('🔧 ===== TASK SERVICE INITIALIZED =====');
    } catch (error) {
      console.error('❌ Error in setUserId:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      // 에러가 발생해도 앱이 크래시되지 않도록 처리
    }
  }

  /**
   * 승인 콜백 설정
   */
  private setupApprovalCallbacks(): void {
    smsApprovalService.setCallbacks(
      // 승인 시
      async (taskId: string) => {
        console.log('✅ [TaskService] SMS Approved:', taskId);
        
        // ⚠️ 중복 처리 방지: 이미 자동 승인된 작업이면 즉시 무시
        if (this.autoApprovedTaskIds.has(taskId)) {
          console.log('⏭️ [TaskService] Task already auto-approved, skipping:', taskId);
          return;
        }
        
        // ⚠️ 원자적 처리: 먼저 마킹하여 동시 호출 방지
        this.autoApprovedTaskIds.add(taskId);
        this.notifiedTaskIds.delete(taskId);

        let task = this.pendingApprovalTasks.get(taskId);
        
        if (task) {
          // 맵에 있으면 바로 사용
          this.pendingApprovalTasks.delete(taskId);
          console.log('✅ [TaskService] Task found in pendingApprovalTasks, processing:', task.id);
        } else {
          // 맵에 없으면 DB에서 조회 (백그라운드 승인 시나 앱 재시작 등의 경우)
          console.log('⚠️ [TaskService] Task not in pendingApprovalTasks, querying DB:', taskId);
          const { data: dbTask, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

          if (error || !dbTask) {
            console.error('❌ [TaskService] Task not found in DB:', taskId, error?.message);
            return;
          }

          // pending, queued, 또는 processing 상태인 경우 처리
          // (queued = 승인 대기 중, processing = 이미 큐에 추가되었지만 아직 발송 전)
          if (dbTask.status === 'pending' || dbTask.status === 'queued' || dbTask.status === 'processing') {
            console.log('✅ [TaskService] Found task from DB, processing:', dbTask.id, 'status:', dbTask.status);
            task = dbTask;
          } else {
            console.warn('⚠️ [TaskService] Task status is not processable:', taskId, dbTask.status);
            return;
          }
        }

        // DB 상태 재확인 (중복 발송 방지)
        const { data: currentTask, error: checkError } = await supabase
          .from('tasks')
          .select('status')
          .eq('id', task.id)
          .single();

        if (checkError || !currentTask) {
          console.error('❌ [TaskService] Cannot verify task status:', taskId);
          return;
        }

        // 이미 완료되었거나 실패한 작업은 무시
        if (currentTask.status === 'completed' || currentTask.status === 'failed') {
          console.log('⏭️ [TaskService] Task already processed, skipping:', taskId, 'status:', currentTask.status);
          return;
        }

        // 배치 승인인지 확인 (batchApprovalInProgress에 있으면 배치)
        const isBatch = this.batchApprovalInProgress.has(taskId);
        
        if (isBatch) {
          // 배치 승인: 큐를 통해 시간차를 두고 발송
          console.log('📦 [TaskService] Batch approval detected, adding to queue:', task.id);
          
          // 상태를 'processing'으로 업데이트
          await supabase
            .from('tasks')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', task.id);
          
          // 큐에 추가 (우선순위 100, 옵션의 지연시간에 맞춰 순차적으로 발송)
          task.priority = 100;
          await this.addTaskToQueue(task);
          console.log('✅ [TaskService] Task added to queue for batch processing:', task.id);
        } else {
          // 단건 승인: 항상 즉시 발송 (수동/자동 모두)
          console.log('⚡ [TaskService] Single task approved - sending immediately (bypassing queue):', task.id);
          // autoApprovedTaskIds는 이미 위에서 추가됨
          
          // 타임아웃 설정 (1분)
          const timeoutId = setTimeout(async () => {
            const { data: timeoutTask } = await supabase
              .from('tasks')
              .select('status')
              .eq('id', task.id)
              .single();
            
            if (timeoutTask && timeoutTask.status !== 'completed' && timeoutTask.status !== 'failed') {
              console.error('❌ [TaskService] Task timeout (1min) - marking as failed:', task.id);
              await supabase
                .from('tasks')
                .update({ 
                  status: 'failed', 
                  error_message: '1분 이내 발송되지 않아 실패 처리되었습니다.',
                  updated_at: new Date().toISOString() 
                })
                .eq('id', task.id);
              this.autoApprovedTaskIds.delete(taskId);
            }
          }, 60000); // 1분

          try {
            // 한도 체크
            if (this.userId) {
              const limitExceeded = await isLimitExceeded(this.userId);
              if (limitExceeded) {
                clearTimeout(timeoutId);
                console.error('❌ Daily limit exceeded for user:', this.userId);
                await supabase
                  .from('tasks')
                  .update({ 
                    status: 'failed', 
                    error_message: '일일 한도가 초과되었습니다.',
                    updated_at: new Date().toISOString() 
                  })
                  .eq('id', task.id);
                this.autoApprovedTaskIds.delete(taskId);
                return;
              }
            }

            // 상태를 'processing'으로 업데이트
            await supabase
              .from('tasks')
              .update({ status: 'processing', updated_at: new Date().toISOString() })
              .eq('id', task.id);

              // 즉시 SMS 발송 (큐 우회)
              const result = await sendSms(
                task,
                async () => {
                  clearTimeout(timeoutId);
                  console.log('✅ [TaskService] Approved SMS sent successfully:', task.id);
                  this.autoApprovedTaskIds.delete(taskId);
                  
                  // 자동 승인 시 발송 완료 알림 표시
                  // 배치 승인 중이면 개별 알림 표시하지 않음 (배치 승인 시 이미 표시됨)
                  const isBatchApproval = this.batchApprovalInProgress.has(taskId);
                  if (!isBatchApproval) {
                    try {
                      await smsApprovalService.showInfoNotification(
                        '문자 발송 완료',
                        `${task.customer_phone}에게 문자를 발송했습니다`
                      );
                    } catch (error) {
                      console.error('❌ [TaskService] Failed to show completion notification:', error);
                    }
                  } else {
                    console.log('📦 [TaskService] Batch approval in progress, skipping individual notification:', taskId);
                  }
                },
                (error) => {
                  clearTimeout(timeoutId);
                  console.error('❌ [TaskService] Approved SMS send failed:', error);
                  this.autoApprovedTaskIds.delete(taskId);
                }
              );

            if (!result) {
              clearTimeout(timeoutId);
              console.error('❌ [TaskService] Approved SMS send returned false');
              // 실패 시 큐에 추가
              task.priority = 100;
              await this.addTaskToQueue(task);
              this.autoApprovedTaskIds.delete(taskId);
            }
          } catch (error: any) {
            clearTimeout(timeoutId);
            console.error('❌ [TaskService] Error sending approved SMS:', error);
            // 실패 시 큐에 추가하여 재시도
            console.log('⚠️ [TaskService] Adding to queue for retry:', task.id);
            task.priority = 100;
            await this.addTaskToQueue(task);
            this.autoApprovedTaskIds.delete(taskId);
          }
        }
      },
      // 취소 시
      async (taskId: string) => {
        console.log('❌ [TaskService] SMS Cancelled:', taskId);
        this.notifiedTaskIds.delete(taskId);
        this.pendingApprovalTasks.delete(taskId);
        this.autoApprovedTaskIds.delete(taskId);
        this.batchApprovalInProgress.delete(taskId);
        await smsApprovalService.cancelTask(taskId);
      }
    );
  }

  /**
   * 승인 알림 요청 (웹에서 보낸 작업 처리)
   */
  async requestApproval(task: Task): Promise<void> {
    // 이미 알림을 보낸 작업이면 무시 (중복 알림 방지)
    if (this.notifiedTaskIds.has(task.id)) {
      console.log('ℹ️ [TaskService] Already notified for task, skipping:', task.id);
      return;
    }

    console.log('📱 [TaskService] Requesting approval for task:', task.id);

    // 먼저 메모리에 등록하여 중복 방지 (네트워크 실패해도 중복 안 됨)
    this.notifiedTaskIds.add(task.id);
    this.pendingApprovalTasks.set(task.id, task);

    try {
      const result = await smsApprovalService.showApprovalNotification(
        task.id,
        task.customer_phone,
        task.message_content
      );

      // 자동 승인된 경우
      if (typeof result === 'object' && result.autoApproved) {
        console.log('✅ [TaskService] Auto-approved, processing task:', task.id);
        // 콜백이 이미 처리함
      } else {
        console.log('📱 [TaskService] Approval notification shown, ID:', result);
      }

      // 알림 표시 성공 후 DB 상태 업데이트 시도 (실패해도 OK)
      supabase
        .from('tasks')
        .update({ status: 'queued', updated_at: new Date().toISOString() })
        .eq('id', task.id)
        .eq('status', 'pending')
        .then(({ error }) => {
          if (error) {
            console.warn('⚠️ [TaskService] Failed to update status to queued (non-critical):', error.message);
          }
        });
    } catch (error) {
      console.error('❌ [TaskService] Failed to show approval notification:', error);
      // 알림 실패 시 메모리에서 제거 (다음 폴링에서 재시도)
      this.pendingApprovalTasks.delete(task.id);
      this.notifiedTaskIds.delete(task.id);
    }
  }

  /**
   * 작업을 알림 처리됨으로 표시 (FCM에서 호출)
   * 폴링에서 중복 처리 방지용
   */
  markAsNotified(taskId: string): void {
    this.notifiedTaskIds.add(taskId);
    console.log('✅ [TaskService] Task marked as notified:', taskId);
  }

  /**
   * 작업 알림 마킹 해제 (에러 발생 시 재시도 가능하도록)
   */
  unmarkAsNotified(taskId: string): void {
    this.notifiedTaskIds.delete(taskId);
    console.log('🔄 [TaskService] Task unmarked as notified:', taskId);
  }

  /**
   * 이미 알림을 보낸 작업인지 확인
   */
  isNotified(taskId: string): boolean {
    return this.notifiedTaskIds.has(taskId);
  }

  /**
   * 배치 승인 시작 (FCM에서 호출)
   * 배치 승인 시 모든 taskId를 batchApprovalInProgress에 추가
   */
  startBatchApproval(taskIds: string[]): void {
    taskIds.forEach(id => {
      this.batchApprovalInProgress.add(id);
      console.log('📦 [TaskService] Task added to batch approval:', id);
    });
    console.log('📦 [TaskService] Batch approval started for', taskIds.length, 'tasks');
  }

  /**
   * 큐 설정
   */
  private setupQueue(): void {
    // 큐 처리 함수 설정
    smsQueue.onProcess = async (task: Task) => {
      console.log('📨 setupQueue.onProcess called for task:', task.id);
      
      // 한도 체크
      if (this.userId) {
        const limitExceeded = await isLimitExceeded(this.userId);
        if (limitExceeded) {
          console.error('❌ Daily limit exceeded for user:', this.userId);
          throw new Error('일일 한도가 초과되었습니다.');
        }
        console.log('✅ Daily limit check passed');
      }

      // SMS 발송
      console.log('📤 Calling sendSms for task:', task.id);
      const result = await sendSms(
        task,
        () => {
          console.log('✅ SMS sent successfully callback:', task.id);
        },
        (error) => {
          console.error('❌ SMS send failed callback:', error);
          throw new Error(error);
        }
      );
      
      console.log('📨 sendSms result:', result);
      if (!result) {
        throw new Error('SMS 발송 실패');
      }
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
    if (this.disableAutoProcessing) {
      console.warn('⚠️ Auto processing disabled to prevent unintended sends.');
      return;
    }

    try {
      // 기존 구독 해제
      if (this.subscription) {
        try {
          supabase.removeChannel(this.subscription);
        } catch (error) {
          console.error('Error removing existing subscription:', error);
        }
        this.subscription = null;
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
          console.log('🔔 ===== NEW TASK RECEIVED FROM SUPABASE =====');
          console.log('🔔 Event type:', payload.eventType);
          console.log('🔔 Payload:', JSON.stringify(payload, null, 2));
          const newTask = payload.new as Task;
          console.log('🔔 New task:', JSON.stringify(newTask, null, 2));

          // 필수 필드 검증
          if (!newTask.user_id) {
            console.error('❌ Task missing user_id:', newTask);
            return;
          }
          if (!newTask.customer_phone) {
            console.error('❌ Task missing customer_phone:', newTask);
            return;
          }
          if (!newTask.message_content) {
            console.error('❌ Task missing message_content:', newTask);
            return;
          }

          // pending 상태이고 최근 RECENT_MINUTES 분 이내 생성된 작업만 처리
          const now = new Date();
          const createdAt = newTask.created_at ? new Date(newTask.created_at) : null;
          const thresholdTime = new Date(now.getTime() - RECENT_MINUTES * 60 * 1000);

          console.log('🔔 Task status:', newTask.status);
          console.log('🔔 Task created_at:', newTask.created_at);
          console.log('🔔 Threshold time:', thresholdTime.toISOString());
          console.log('🔔 Current time:', now.toISOString());

          // 너무 오래된 작업은 처리하지 않음 (이전 세션의 잔여 대기 작업으로 인한 폭주 방지)
          if (!createdAt || createdAt < thresholdTime) {
            console.log(`⏭️ Skipping old pending task (>${RECENT_MINUTES}m):`, newTask.id, newTask.created_at);
            return;
          }

          if (newTask.status === 'pending' && createdAt > thresholdTime) {
            // 이미 알림을 보낸 작업은 스킵 (FCM으로 이미 처리됨)
            if (this.notifiedTaskIds.has(newTask.id)) {
              console.log('⏭️ [Realtime] Task already notified (FCM), skipping:', newTask.id);
              return;
            }

            // 중복 방지: 표시 직전에 마킹 (FCM과의 경쟁 조건 방지)
            if (this.notifiedTaskIds.has(newTask.id)) {
              console.log('⏭️ [Realtime] Task already notified (race condition), skipping:', newTask.id);
              return;
            }

            // 먼저 마킹하여 중복 방지
            this.notifiedTaskIds.add(newTask.id);

            const scheduledAt = newTask.scheduled_at
              ? new Date(newTask.scheduled_at)
              : null;

            console.log('🔔 Scheduled at:', scheduledAt?.toISOString() || 'null');
            console.log('🔔 Now:', now.toISOString());

            if (!scheduledAt || scheduledAt <= now) {
              console.log('✅ Task ready, requesting approval:', newTask.id, newTask.type);
              await this.requestApproval(newTask);
            } else {
              console.log('⏰ Task scheduled for later:', newTask.id, scheduledAt);
              // 예약된 작업은 마킹 해제 (나중에 처리해야 함)
              this.notifiedTaskIds.delete(newTask.id);
            }
          } else {
            console.log('⏭️ Task not pending, skipping:', newTask.id, newTask.status);
          }
          console.log('🔔 ===== NEW TASK PROCESSING COMPLETE =====');
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
          const now = new Date();
          const createdAt = new Date(updatedTask.created_at);
          const thresholdTime = new Date(now.getTime() - RECENT_MINUTES * 60 * 1000);

          if (
            updatedTask.status === 'pending' &&
            oldTask.status !== 'pending' &&
            createdAt > thresholdTime
          ) {
            const scheduledAt = updatedTask.scheduled_at
              ? new Date(updatedTask.scheduled_at)
              : null;

            if (!scheduledAt || scheduledAt <= now) {
              console.log('🔄 Task status changed to pending, requesting approval:', updatedTask.id);
              await this.requestApproval(updatedTask);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 ===== SUBSCRIPTION STATUS CHANGED =====');
        console.log('📡 Status:', status);
        console.log('📡 User ID:', this.userId);
        if (status === 'SUBSCRIBED') {
          console.log('✅ ===== SUCCESSFULLY SUBSCRIBED =====');
          console.log('✅ User ID:', this.userId);
          console.log('✅ Filter: user_id=eq.' + this.userId);
          console.log('✅ Now listening for new tasks from web...');
          // 구독 성공 후 즉시 대기 중인 작업 확인
          this.loadPendingTasks().catch((error) => {
            console.error('❌ Error loading pending tasks after subscription:', error);
          });
          // 구독 성공해도 백업으로 빠른 폴링 시작 (1초 간격) - 웹에서 보낸 작업 즉시 처리
          this.startPolling(30); // 30초 간격 폴링 (FCM이 메인, 폴링은 백업)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('❌ ===== SUBSCRIPTION FAILED =====');
          console.error('❌ Status:', status);
          console.error('❌ This means realtime is not working!');
          console.error('❌ Starting polling fallback every 1 second...');
          // 구독 실패 시 빠른 폴링으로 보완 (1초 간격) - 웹에서 보낸 작업 즉시 처리
          this.startPolling(30); // 30초 간격 폴링 (FCM이 메인, 폴링은 백업)
        } else {
          console.log('📡 Subscription status:', status);
        }
        console.log('📡 ===== SUBSCRIPTION STATUS CHANGED =====');
      });

    this.subscription = channel;
    } catch (error) {
      console.error('Error in subscribeToTasks:', error);
      // 구독 실패 시 폴링으로 대체
      console.error('❌ Subscription setup failed, starting polling fallback...');
      this.startPolling(30); // 30초 간격 폴링 (FCM이 메인, 폴링은 백업)
    }
  }

  /**
   * 작업을 큐에 추가
   */
  async addTaskToQueue(task: Task): Promise<void> {
    // 중복 체크: 이미 큐에 있거나 처리 중인 작업은 추가하지 않음
    const queueStatus = smsQueue.getStatus();
    const queue = smsQueue.getQueue();
    const isInQueue = queue.some(item => item.task.id === task.id);
    const isProcessing = queueStatus.currentTask?.id === task.id;
    
    if (isInQueue || isProcessing) {
      console.log('⏭️ [TaskService] Task already in queue or processing, skipping:', task.id);
      return;
    }

    // DB 상태 확인 (이미 완료되었거나 실패한 작업은 큐에 추가하지 않음)
    const { data: dbTask } = await supabase
      .from('tasks')
      .select('status')
      .eq('id', task.id)
      .single();

    if (dbTask && (dbTask.status === 'completed' || dbTask.status === 'failed')) {
      console.log('⏭️ [TaskService] Task already processed, skipping:', task.id, 'status:', dbTask.status);
      return;
    }
    if (!this.userId) {
      console.error('Cannot add task to queue: userId not set');
      return;
    }

    // 작업 유효성 검증
    if (!task.customer_phone) {
      console.error('Task missing customer_phone:', task.id);
      await supabase
        .from('tasks')
        .update({ 
          status: 'failed', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', task.id);
      return;
    }

    if (!task.message_content) {
      console.error('Task missing message_content:', task.id);
      await supabase
        .from('tasks')
        .update({ 
          status: 'failed', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', task.id);
      return;
    }

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

    console.log('Adding task to SMS queue:', task.id, 'priority:', task.priority || 0);

    // 큐에 추가
    await smsQueue.add(task, task.priority || 0);

    // tasks 테이블 상태를 'queued'로 업데이트
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'queued', updated_at: new Date().toISOString() })
      .eq('id', task.id);

    if (error) {
      console.error('Error updating task status to queued:', error);
    } else {
      console.log('Task status updated to queued:', task.id);
    }

    // 큐 처리 시작 (작업이 추가되면 자동으로 처리 시작)
    console.log('🚀 Starting queue processing after adding task:', task.id);
    smsQueue.startProcessing();
  }

  /**
   * 대기 중인 작업 로드 (앱 시작 시 및 주기적 확인)
   */
  async loadPendingTasks(): Promise<void> {
    console.log('🔍 ===== LOADING PENDING TASKS =====');
    if (!this.userId) {
      console.log('⚠️ Cannot load pending tasks: userId not set');
      console.log('⚠️ Make sure taskService.setUserId() was called!');
      return;
    }

    try {
      const nowDate = new Date();
      const thresholdDate = new Date(nowDate.getTime() - RECENT_MINUTES * 60 * 1000); // 최근 5분만 처리
      const now = nowDate.toISOString();
      console.log('🔍 User ID:', this.userId);
      console.log('🔍 Current time:', now);
      console.log('🔍 Querying tasks table...');

      // 쿼리 조건 단순화: scheduled_at 조건을 별도로 처리
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'pending') // pending만 처리 (queued는 제외)
        .gte('created_at', thresholdDate.toISOString());
      
      // scheduled_at이 null이거나 현재 시간 이전인 것만 가져오기
      // Supabase의 or() 조건이 복잡하므로 필터링을 두 단계로 나눔
      const { data: tasks, error } = await query;
      
      // 클라이언트 측에서 scheduled_at 필터링 및 이미 알림 보낸 작업 제외
      const filteredTasks = tasks?.filter(task => {
        // 이미 알림을 보낸 작업은 제외 (FCM으로 이미 처리된 작업)
        if (this.notifiedTaskIds.has(task.id)) {
          console.log('⏭️ [loadPendingTasks] Task already notified, skipping:', task.id);
          return false;
        }
        // 자동 승인된 작업은 제외 (중복 처리 방지)
        if (this.autoApprovedTaskIds.has(task.id)) {
          console.log('⏭️ [loadPendingTasks] Task already auto-approved, skipping:', task.id);
          return false;
        }
        
        // 오래된 작업 필터링 (created_at 기준)
        const createdAt = new Date(task.created_at);
        const taskAge = nowDate.getTime() - createdAt.getTime();
        const maxAge = MAX_TASK_AGE_MINUTES * 60 * 1000;
        if (taskAge > maxAge) {
          console.log('⏭️ [loadPendingTasks] Task too old, skipping:', task.id, 'age:', Math.round(taskAge / 1000), 'seconds');
          return false;
        }
        
        // scheduled_at 필터링
        if (!task.scheduled_at) return true;
        const scheduledAt = new Date(task.scheduled_at);
        // scheduled_at이 현재 시간보다 미래면 제외
        if (scheduledAt > nowDate) {
          console.log('⏭️ [loadPendingTasks] Task scheduled for future, skipping:', task.id, 'scheduled_at:', task.scheduled_at);
          return false;
        }
        // scheduled_at이 너무 오래 전이면 제외 (24시간 이상)
        const scheduledAge = nowDate.getTime() - scheduledAt.getTime();
        const maxScheduledAge = 24 * 60 * 60 * 1000; // 24시간
        if (scheduledAge > maxScheduledAge) {
          console.log('⏭️ [loadPendingTasks] Scheduled task too old, skipping:', task.id, 'scheduled_age:', Math.round(scheduledAge / 1000), 'seconds');
          return false;
        }
        return true;
      }) || [];

      if (error) {
        console.error('❌ ===== ERROR LOADING PENDING TASKS =====');
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        console.error('❌ This might be an RLS policy issue!');
        console.error('❌ ===== ERROR LOADING PENDING TASKS =====');
        return;
      }

      console.log('🔍 Query result:', tasks?.length || 0, 'tasks found (before filtering)');
      console.log('🔍 Filtered result:', filteredTasks.length, 'tasks found (after scheduled_at and notified filter)');

      if (filteredTasks && filteredTasks.length > 0) {
        console.log(`✅ ===== FOUND ${filteredTasks.length} PENDING TASKS =====`);
        for (const task of filteredTasks) {
          console.log(`  - Task ${task.id}: ${task.type} to ${task.customer_phone}, status: ${task.status}, scheduled_at: ${task.scheduled_at || 'null'}`);
        }
        console.log('✅ Requesting approval for tasks...');
        for (const task of filteredTasks) {
          await this.requestApproval(task);
        }
        console.log('✅ ===== PENDING TASKS PROCESSED =====');
      } else {
        console.log('ℹ️ No pending tasks found for user:', this.userId);
        console.log('ℹ️ Query returned', tasks?.length || 0, 'tasks before filtering');
        console.log('ℹ️ Threshold date:', thresholdDate.toISOString());
        console.log('ℹ️ Current time:', nowDate.toISOString());
        console.log('ℹ️ This is normal if no tasks were created from web');
      }
    } catch (error: any) {
      console.error('❌ ===== EXCEPTION IN loadPendingTasks =====');
      console.error('❌ Error:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      console.error('❌ ===== EXCEPTION IN loadPendingTasks =====');
    }
  }

  /**
   * 주기적으로 대기 중인 작업 확인 (폴링)
   */
  startPolling(intervalSeconds: number = 10): void {
    if (!this.userId) return;

    // 이미 폴링 중이면 기존 타이머 제거 후 새로 시작
    if (this.pollingTimer) {
      console.log('🔄 Clearing existing polling timer');
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    console.log(`🔄 Starting task polling every ${intervalSeconds} seconds`);
    
    // 즉시 한 번 실행
    this.loadPendingTasks();

    // 주기적으로 실행
    this.pollingTimer = setInterval(() => {
      if (this.userId) {
        this.loadPendingTasks();
      }
    }, intervalSeconds * 1000);
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

