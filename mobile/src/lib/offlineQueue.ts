import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from './types/task';
import { supabase } from '../lib/supabaseClient';

const OFFLINE_QUEUE_KEY = '@bizconnect:offline_queue';
const SYNC_QUEUE_KEY = '@bizconnect:sync_queue';

/**
 * 오프라인 큐 관리
 */
class OfflineQueue {
  /**
   * 오프라인 작업 추가
   */
  async addOfflineTask(task: Task): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      queue.push({
        ...task,
        offline: true,
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error adding offline task:', error);
    }
  }

  /**
   * 오프라인 큐 조회
   */
  async getOfflineQueue(): Promise<Task[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  /**
   * 오프라인 큐 비우기
   */
  async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (error) {
      console.error('Error clearing offline queue:', error);
    }
  }

  /**
   * 동기화 대기 작업 추가
   */
  async addSyncTask(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      const syncQueue = await this.getSyncQueue();
      syncQueue.push({
        taskId,
        updates,
        timestamp: new Date().toISOString(),
      });
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
    } catch (error) {
      console.error('Error adding sync task:', error);
    }
  }

  /**
   * 동기화 대기 큐 조회
   */
  async getSyncQueue(): Promise<Array<{ taskId: string; updates: Partial<Task>; timestamp: string }>> {
    try {
      const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  /**
   * 온라인 복구 시 동기화
   */
  async syncWhenOnline(): Promise<void> {
    try {
      // 오프라인 큐 동기화
      const offlineQueue = await this.getOfflineQueue();
      for (const task of offlineQueue) {
        try {
          const { error } = await supabase.from('tasks').insert(task);
          if (!error) {
            // 성공한 작업은 큐에서 제거
            await this.removeFromOfflineQueue(task.id);
          }
        } catch (error) {
          console.error('Error syncing offline task:', error);
        }
      }

      // 동기화 큐 처리
      const syncQueue = await this.getSyncQueue();
      for (const syncTask of syncQueue) {
        try {
          const { error } = await supabase
            .from('tasks')
            .update(syncTask.updates)
            .eq('id', syncTask.taskId);

          if (!error) {
            await this.removeFromSyncQueue(syncTask.taskId);
          }
        } catch (error) {
          console.error('Error syncing task update:', error);
        }
      }
    } catch (error) {
      console.error('Error in syncWhenOnline:', error);
    }
  }

  /**
   * 오프라인 큐에서 제거
   */
  private async removeFromOfflineQueue(taskId: string): Promise<void> {
    const queue = await this.getOfflineQueue();
    const filtered = queue.filter((t) => t.id !== taskId);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  }

  /**
   * 동기화 큐에서 제거
   */
  private async removeFromSyncQueue(taskId: string): Promise<void> {
    const syncQueue = await this.getSyncQueue();
    const filtered = syncQueue.filter((t) => t.taskId !== taskId);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  }
}

export const offlineQueue = new OfflineQueue();




