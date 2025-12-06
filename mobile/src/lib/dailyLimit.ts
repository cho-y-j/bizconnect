import { supabase } from '../../lib/supabaseClient';

export interface DailyLimit {
  id: string;
  user_id: string;
  date: string;
  sent_count: number;
  limit_mode: 'safe' | 'max';
  created_at: string;
  updated_at: string;
}

/**
 * 일일 한도 조회
 */
export async function getDailyLimit(userId: string): Promise<DailyLimit | null> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116은 "no rows returned" 에러
      console.error('Error fetching daily limit:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getDailyLimit:', error);
    return null;
  }
}

/**
 * 일일 한도 생성 또는 업데이트
 */
export async function createOrUpdateDailyLimit(
  userId: string,
  limitMode: 'safe' | 'max' = 'safe'
): Promise<DailyLimit | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const limit = limitMode === 'safe' ? 199 : 499; // 안전 모드: 199건, 최대 모드: 499건 (월 10회)

    const { data, error } = await supabase
      .from('daily_limits')
      .upsert(
        {
          user_id: userId,
          date: today,
          sent_count: 0,
          limit_mode: limitMode,
        },
        {
          onConflict: 'user_id,date',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error creating/updating daily limit:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createOrUpdateDailyLimit:', error);
    return null;
  }
}

/**
 * 발송 카운트 증가
 */
export async function incrementSentCount(userId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('increment_daily_limit', {
      p_user_id: userId,
      p_date: today,
    });

    if (error) {
      // RPC 함수가 없으면 직접 업데이트
      const { error: updateError } = await supabase
        .from('daily_limits')
        .update({ sent_count: supabase.raw('sent_count + 1') })
        .eq('user_id', userId)
        .eq('date', today);

      if (updateError) {
        console.error('Error incrementing sent count:', updateError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in incrementSentCount:', error);
    return false;
  }
}

/**
 * 한도 체크
 */
export async function checkDailyLimit(userId: string): Promise<{
  canSend: boolean;
  remaining: number;
  limit: number;
  limitMode: 'safe' | 'max';
}> {
  try {
    // 사용자 설정 조회
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('limit_mode')
      .eq('user_id', userId)
      .single();

    const limitMode = (userSettings?.limit_mode as 'safe' | 'max') || 'safe';
    const limit = limitMode === 'safe' ? 199 : 499;

    // 오늘 한도 조회
    let dailyLimit = await getDailyLimit(userId);

    if (!dailyLimit) {
      // 한도가 없으면 생성
      dailyLimit = await createOrUpdateDailyLimit(userId, limitMode);
      if (!dailyLimit) {
        return { canSend: false, remaining: 0, limit, limitMode };
      }
    }

    const remaining = limit - dailyLimit.sent_count;
    const canSend = remaining > 0;

    return { canSend, remaining, limit, limitMode };
  } catch (error) {
    console.error('Error in checkDailyLimit:', error);
    return { canSend: false, remaining: 0, limit: 199, limitMode: 'safe' };
  }
}

/**
 * 한도 초과 여부 확인
 */
export async function isLimitExceeded(userId: string): Promise<boolean> {
  const { canSend } = await checkDailyLimit(userId);
  return !canSend;
}



