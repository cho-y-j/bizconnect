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
    console.log('📊 Incrementing sent count for user:', userId, 'date:', today);

    // 먼저 RPC 함수 시도 (increment_daily_sent_count)
    const { data: rpcData, error: rpcError } = await supabase.rpc('increment_daily_sent_count', {
      p_user_id: userId,
      p_date: today,
    });

    if (!rpcError && rpcData !== null) {
      console.log('✅ RPC increment_daily_sent_count succeeded, new count:', rpcData);
      return true;
    }

    // RPC 함수가 없거나 실패하면 직접 업데이트
    console.log('⚠️ RPC failed, trying direct update. Error:', rpcError?.message);

    // 먼저 현재 값 조회
    const { data: currentLimit, error: fetchError } = await supabase
      .from('daily_limits')
      .select('sent_count')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116은 "no rows returned" 에러 (정상)
      console.error('❌ Error fetching daily limit:', fetchError);
      return false;
    }

    // 레코드가 없으면 생성
    if (!currentLimit) {
      console.log('📊 Daily limit not found, creating new record...');
      const { data: newLimit, error: createError } = await supabase
        .from('daily_limits')
        .insert({
          user_id: userId,
          date: today,
          sent_count: 1,
          limit_mode: 'safe',
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating daily limit:', createError);
        return false;
      }

      console.log('✅ Daily limit created with count 1');
      return true;
    }

    // 레코드가 있으면 +1 업데이트
    const newCount = (currentLimit.sent_count || 0) + 1;
    console.log('📊 Updating count from', currentLimit.sent_count, 'to', newCount);

    const { error: updateError } = await supabase
      .from('daily_limits')
      .update({ 
        sent_count: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('date', today);

    if (updateError) {
      console.error('❌ Error updating sent count:', updateError);
      return false;
    }

    console.log('✅ Sent count updated successfully to', newCount);
    return true;
  } catch (error) {
    console.error('❌ Exception in incrementSentCount:', error);
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




