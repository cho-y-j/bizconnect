import { supabase } from '../../lib/supabaseClient';

export interface TodayStats {
  sent: number;
  failed: number;
  successRate: number;
  pendingTasks: number;
}

/**
 * 오늘 발송 통계 조회
 */
export async function getTodayStats(userId: string): Promise<TodayStats> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    // 오늘 발송된 SMS 조회
    const { data: smsLogs, error: smsError } = await supabase
      .from('sms_logs')
      .select('status')
      .eq('user_id', userId)
      .gte('sent_at', todayStart);

    if (smsError) {
      console.error('Error fetching SMS logs:', smsError);
    }

    const sent = smsLogs?.filter((log) => log.status === 'sent').length || 0;
    const failed = smsLogs?.filter((log) => log.status === 'failed').length || 0;
    const total = sent + failed;
    const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;

    // 발송 대기 중인 작업 수
    const { count: pendingCount, error: taskError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['pending', 'queued']);

    if (taskError) {
      console.error('Error fetching pending tasks:', taskError);
    }

    return {
      sent,
      failed,
      successRate,
      pendingTasks: pendingCount || 0,
    };
  } catch (error) {
    console.error('Error in getTodayStats:', error);
    return {
      sent: 0,
      failed: 0,
      successRate: 0,
      pendingTasks: 0,
    };
  }
}




