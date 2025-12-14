export interface Task {
  id: string;
  user_id: string;
  customer_id?: string | null;
  customer_phone: string;
  customer_name?: string | null;
  message_content: string;
  type: string; // 'send_sms', 'send_mms', 'callback', 'anniversary', 'birthday'
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  priority: number;
  scheduled_at?: string | null;
  image_url?: string | null;
  image_name?: string | null;
  is_mms?: boolean;
  created_at: string;
  updated_at?: string | null;
  completed_at?: string | null;
}

export interface QueueItem {
  task: Task;
  retryCount: number;
  addedAt: number; // timestamp
}




