export interface Task {
  id: string;
  user_id: string;
  customer_id?: string | null;
  customer_phone: string;
  customer_name?: string | null;
  message_content: string;
  type: string; // 'send_sms', 'callback', 'anniversary', 'birthday'
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  priority: number;
  scheduled_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  completed_at?: string | null;
}

export interface QueueItem {
  task: Task;
  retryCount: number;
  addedAt: number; // timestamp
}



