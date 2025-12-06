import BackgroundActions from 'react-native-background-actions';
import { taskService } from './taskService';
import { checkDailyLimit } from '../lib/dailyLimit';
import { pushNotificationService } from './pushNotificationService';

const sleep = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));

/**
 * 백그라운드 작업 옵션
 */
const backgroundTaskOptions = {
  taskName: 'BizConnect SMS Queue',
  taskTitle: 'SMS 발송 중...',
  taskDesc: '대기 중인 메시지를 발송하고 있습니다.',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#2563EB',
  linkingURI: 'bizconnect://',
  parameters: {
    delay: 1000,
  },
};

/**
 * 백그라운드에서 큐 처리
 */
async function processQueueInBackground(taskData: any) {
  const { delay } = taskData;
  
  try {
    while (BackgroundActions.isRunning()) {
      // 큐 처리
      const queue = taskService.getQueue();
      
      if (queue.length > 0) {
        // 일일 한도 체크
        const { canSend, used, limit } = await checkDailyLimit();
        
        if (!canSend) {
          // 한도 초과 - 알림 발송
          pushNotificationService.notifyLimitExceeded();
          await sleep(60000); // 1분 대기 후 재확인
          continue;
        }

        // 한도 경고 (80% 이상)
        if (used / limit >= 0.8) {
          pushNotificationService.notifyLimitWarning(used, limit);
        }

        // 큐 처리 (taskService가 자동으로 처리)
        // 여기서는 주기적으로 체크만 함
      }

      await sleep(delay || 5000); // 5초마다 체크
    }
  } catch (error) {
    console.error('Background task error:', error);
  }
}

/**
 * 백그라운드 서비스 관리
 */
class BackgroundService {
  private isRunning = false;

  /**
   * 백그라운드 작업 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Background service already running');
      return;
    }

    try {
      await BackgroundActions.start(processQueueInBackground, backgroundTaskOptions);
      this.isRunning = true;
      console.log('Background service started');
    } catch (error) {
      console.error('Failed to start background service:', error);
    }
  }

  /**
   * 백그라운드 작업 중지
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await BackgroundActions.stop();
      this.isRunning = false;
      console.log('Background service stopped');
    } catch (error) {
      console.error('Failed to stop background service:', error);
    }
  }

  /**
   * 백그라운드 작업 상태 확인
   */
  isServiceRunning(): boolean {
    return this.isRunning && BackgroundActions.isRunning();
  }

  /**
   * 포그라운드 알림 업데이트
   */
  async updateNotification(title: string, description: string): Promise<void> {
    if (!this.isRunning) return;

    try {
      await BackgroundActions.updateNotification({
        taskTitle: title,
        taskDesc: description,
      });
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  }
}

export const backgroundService = new BackgroundService();



