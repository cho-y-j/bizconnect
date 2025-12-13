import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 서버 사이드에서 service role key 사용
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { userId, taskId, type = 'send_sms' } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // user_settings에서 FCM 토큰 조회
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('fcm_token')
      .eq('user_id', userId)
      .single();

    if (settingsError || !userSettings?.fcm_token) {
      console.log('[FCM] No FCM token found for user:', userId);
      return NextResponse.json({
        success: false,
        message: 'FCM token not found. App may not be registered.'
      });
    }

    const fcmToken = userSettings.fcm_token;
    const fcmServerKey = process.env.FCM_SERVER_KEY;

    if (!fcmServerKey) {
      console.error('[FCM] FCM_SERVER_KEY not configured');
      return NextResponse.json({ error: 'FCM not configured' }, { status: 500 });
    }

    // FCM 푸시 발송
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: fcmToken,
        priority: 'high',
        data: {
          type: type,
          taskId: taskId || '',
          timestamp: new Date().toISOString(),
        },
        notification: {
          title: '문자 발송 요청',
          body: '웹에서 문자 발송 요청이 있습니다.',
          sound: 'default',
        },
      }),
    });

    const fcmResult = await fcmResponse.json();
    console.log('[FCM] Push result:', fcmResult);

    if (fcmResult.success === 1) {
      return NextResponse.json({ success: true, message: 'FCM push sent' });
    } else {
      return NextResponse.json({
        success: false,
        message: 'FCM push failed',
        error: fcmResult
      });
    }
  } catch (error) {
    console.error('[FCM] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
