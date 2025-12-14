import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, QueueItem } from './types/task';

const QUEUE_STORAGE_KEY = '@BizConnect:queue';
const PROCESSING_STORAGE_KEY = '@BizConnect:processing';

class SmsQueue {
  private queue: QueueItem[] = [];
  private processing: QueueItem | null = null;
  private isProcessing: boolean = false;
  private throttleInterval: number = 5000; // 5초 간격
  private processTimer: NodeJS.Timeout | null = null;
  private isFirstTask: boolean = true; // 첫 번째 작업 플래그

  constructor() {
    this.loadQueue();
  }

  /**
   * 큐에 작업 추가
   */
  async add(task: Task, priority: number = 0): Promise<void> {
    // 중복 체크: 이미 큐에 있거나 처리 중인 작업은 추가하지 않음
    const isDuplicate = this.queue.some(item => item.task.id === task.id) ||
                        (this.processing?.task.id === task.id);

    if (isDuplicate) {
      console.log('⏭️ Task already in queue, skipping:', task.id);
      return;
    }

    const queueItem: QueueItem = {
      task: { ...task, priority },
      retryCount: 0,
      addedAt: Date.now(),
    };

    // 우선순위에 따라 정렬하여 추가
    this.queue.push(queueItem);
    this.queue.sort((a, b) => (b.task.priority || 0) - (a.task.priority || 0));

    await this.saveQueue();

    console.log('✅ Task added to queue:', task.id, 'Queue length:', this.queue.length);

    // 큐 처리 시작 (이미 처리 중이면 자동으로 다음 작업 처리됨)
    this.startProcessing();
  }

  /**
   * 큐에서 다음 작업 가져오기
   */
  private getNext(): QueueItem | null {
    if (this.queue.length === 0) return null;

    // 예약 발송 확인
    const now = Date.now();
    const scheduledItems = this.queue.filter((item) => {
      if (!item.task.scheduled_at) return true;
      const scheduledTime = new Date(item.task.scheduled_at).getTime();
      return scheduledTime <= now;
    });

    if (scheduledItems.length > 0) {
      const item = scheduledItems[0];
      this.queue = this.queue.filter((i) => i.task.id !== item.task.id);
      return item;
    }

    // 예약이 아닌 경우 첫 번째 항목 반환
    return this.queue.shift() || null;
  }

  /**
   * 큐 처리 시작
   */
  startProcessing(): void {
    // 이미 처리 중이면 무시 (하지만 큐에 작업이 있으면 계속 처리)
    if (this.isProcessing && this.processing) {
      console.log('Queue already processing a task, will continue after completion');
      return;
    }

    if (this.queue.length === 0) {
      console.log('Queue is empty, nothing to process');
      this.isProcessing = false;
      return;
    }

    console.log('🚀 Starting queue processing, queue length:', this.queue.length);
    this.isProcessing = true;
    // 즉시 처리 시작 (비동기이므로 await 없이 호출)
    this.processNext().catch((error) => {
      console.error('Error in processNext:', error);
      this.isProcessing = false;
    });
  }

  /**
   * 다음 작업 처리
   */
  private async processNext(): Promise<void> {
    // 이미 처리 중인 작업이 있으면 대기
    if (this.processing) {
      console.log('⏳ Task already processing, waiting for completion...');
      if (this.processTimer) {
        clearTimeout(this.processTimer);
      }
      this.processTimer = setTimeout(() => {
        this.processNext().catch((error) => {
          console.error('Error in delayed processNext:', error);
        });
      }, this.throttleInterval);
      return;
    }

    const nextItem = this.getNext();
    if (!nextItem) {
      // 큐가 비어있으면 처리 중지
      console.log('✅ Queue is empty, stopping processing');
      this.isProcessing = false;
      if (this.processTimer) {
        clearTimeout(this.processTimer);
        this.processTimer = null;
      }
      await this.saveQueue();
      return;
    }

    this.processing = nextItem;
    await this.saveProcessing();

    console.log('📤 Processing task:', nextItem.task.id, 'type:', nextItem.task.type, 'phone:', nextItem.task.customer_phone);

    // 작업 처리 (외부에서 처리 함수를 주입받음)
    if (this.onProcess) {
      try {
        console.log('🚀 Calling onProcess handler for task:', nextItem.task.id);
        await this.onProcess(nextItem.task);
        // 성공 시 큐에서 제거
        await this.remove(nextItem.task.id);
        console.log('✅ Task processed successfully:', nextItem.task.id);
      } catch (error: any) {
        console.error('❌ Task processing failed:', nextItem.task.id, error);
        console.error('Error details:', error.message, error.stack);
        // 실패 시 재시도 로직
        await this.handleFailure(nextItem);
      }
    } else {
      console.error('❌ onProcess handler not set! Cannot process task:', nextItem.task.id);
      // 처리 함수가 없으면 큐에서 제거하고 실패 상태로 업데이트
      await this.remove(nextItem.task.id);
      // Supabase에 실패 상태 업데이트
      const { supabase } = require('../../lib/supabaseClient');
      await supabase
        .from('tasks')
        .update({ 
          status: 'failed', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', nextItem.task.id);
    }

    // 스로틀링 로직 개선:
    // - 단일 건 발송: 즉시 처리 (딜레이 없음)
    // - 대량 발송 (큐에 2개 이상): 스팸 방지를 위해 딜레이 적용
    const hasMore = this.queue.length > 0;
    // 큐에 남은 작업이 있을 때만 딜레이 (대량 발송 시)
    // 첫 번째 작업이거나 단일 건이면 즉시 처리
    const isBulkSend = hasMore; // 큐에 더 있으면 대량 발송
    const delay = (this.isFirstTask || !isBulkSend) ? 0 : this.throttleInterval;
    this.isFirstTask = false; // 첫 번째 작업 처리 후 플래그 해제

    console.log(`📊 Queue status: hasMore=${hasMore}, delay=${delay}ms, isFirstTask=${this.isFirstTask}`);

    if (hasMore) {
      if (delay > 0) {
        console.log(`⏱️ Waiting ${delay}ms before next task (bulk send throttling)`);
        this.processTimer = setTimeout(() => {
          this.processing = null;
          this.saveProcessing();
          this.processNext();
        }, delay);
      } else {
        // 단일 건 또는 첫 번째 작업은 즉시 처리
        console.log('⚡ Processing next task immediately');
        this.processing = null;
        this.saveProcessing();
        this.processNext();
      }
    } else {
      console.log('✅ Queue empty, all tasks processed');
      this.processing = null;
      this.isProcessing = false;
      this.processTimer = null;
      this.isFirstTask = true; // 큐가 비면 첫 번째 플래그 리셋
      await this.saveProcessing();
    }
  }

  /**
   * 작업 실패 처리
   */
  private async handleFailure(item: QueueItem): Promise<void> {
    const maxRetries = 3;
    const retryDelay = 5 * 60 * 1000; // 5분

    if (item.retryCount < maxRetries) {
      item.retryCount++;
      // 5분 후 재시도하도록 큐에 다시 추가
      setTimeout(() => {
        this.queue.push(item);
        this.saveQueue();
        this.startProcessing();
      }, retryDelay);
    } else {
      // 최대 재시도 횟수 초과 - 실패 처리
      await this.remove(item.task.id);
      if (this.onFailure) {
        this.onFailure(item.task, '최대 재시도 횟수 초과');
      }
    }
  }

  /**
   * 큐에서 작업 제거
   */
  async remove(taskId: string): Promise<void> {
    this.queue = this.queue.filter((item) => item.task.id !== taskId);
    if (this.processing?.task.id === taskId) {
      this.processing = null;
    }
    await this.saveQueue();
    await this.saveProcessing();
  }

  /**
   * 큐 상태 가져오기
   */
  getStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentTask: Task | null;
  } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing || this.processing !== null,
      currentTask: this.processing?.task || null,
    };
  }

  /**
   * 현재 큐 가져오기
   */
  getQueue(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * 큐 비우기
   */
  async clear(): Promise<void> {
    this.queue = [];
    this.processing = null;
    this.isProcessing = false;
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    await AsyncStorage.removeItem(PROCESSING_STORAGE_KEY);
  }

  /**
   * 큐 저장
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  }

  /**
   * 처리 중인 작업 저장
   */
  private async saveProcessing(): Promise<void> {
    try {
      if (this.processing) {
        await AsyncStorage.setItem(
          PROCESSING_STORAGE_KEY,
          JSON.stringify(this.processing)
        );
      } else {
        await AsyncStorage.removeItem(PROCESSING_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save processing task:', error);
    }
  }

  /**
   * 큐 로드 (앱 재시작 시 복구)
   */
  private async loadQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (queueData) {
        this.queue = JSON.parse(queueData);
      }

      const processingData = await AsyncStorage.getItem(PROCESSING_STORAGE_KEY);
      if (processingData) {
        this.processing = JSON.parse(processingData);
        // 처리 중이던 작업을 큐 앞에 다시 추가
        if (this.processing) {
          this.queue.unshift(this.processing);
          this.processing = null;
        }
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  }

  /**
   * 처리 함수 (외부에서 주입)
   */
  onProcess: ((task: Task) => Promise<void>) | null = null;

  /**
   * 실패 처리 함수 (외부에서 주입)
   */
  onFailure: ((task: Task, error: string) => void) | null = null;

  /**
   * 스로틀링 간격 설정
   */
  setThrottleInterval(interval: number): void {
    this.throttleInterval = interval;
  }
}

// 싱글톤 인스턴스
export const smsQueue = new SmsQueue();




