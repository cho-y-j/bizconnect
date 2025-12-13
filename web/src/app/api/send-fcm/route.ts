import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Firebase 서비스 계정 정보 (환경 변수에서)
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'call-93289';
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;

// PRIVATE_KEY 처리: \n 문자열 또는 공백으로 구분된 형식 모두 지원
function formatPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;

  // 이미 줄바꿈이 있으면 그대로 사용
  if (key.includes('\n') && !key.includes('\\n')) {
    return key;
  }

  // \n 문자열을 실제 줄바꿈으로 변환
  let formatted = key.replace(/\\n/g, '\n');

  // 공백으로 구분된 경우 (BEGIN/END 사이의 base64 부분)
  // "-----BEGIN PRIVATE KEY----- MIIE... -----END PRIVATE KEY-----" 형식 처리
  if (!formatted.includes('\n')) {
    formatted = formatted
      .replace('-----BEGIN PRIVATE KEY----- ', '-----BEGIN PRIVATE KEY-----\n')
      .replace(' -----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
      .replace(/(.{64})/g, '$1\n')  // 64자마다 줄바꿈
      .replace(/\n\n/g, '\n');  // 중복 줄바꿈 제거
  }

  return formatted;
}

const FIREBASE_PRIVATE_KEY = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

/**
 * JWT 토큰 생성 (Google OAuth2용)
 */
async function createJWT(): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    sub: FIREBASE_CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Payload}`;

  // Node.js crypto로 서명
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(FIREBASE_PRIVATE_KEY!, 'base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * OAuth2 액세스 토큰 얻기
 */
async function getAccessToken(): Promise<string> {
  const jwt = await createJWT();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await response.json();

  if (!data.access_token) {
    console.error('[FCM] Failed to get access token:', data);
    throw new Error('Failed to get access token');
  }

  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const { userId, taskId, type = 'send_sms' } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // 환경 변수 확인
    if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      console.error('[FCM] Firebase credentials not configured');
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
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

    // OAuth2 액세스 토큰 얻기
    const accessToken = await getAccessToken();

    // FCM v1 API로 푸시 발송
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            data: {
              type: type,
              taskId: taskId || '',
              timestamp: new Date().toISOString(),
            },
            notification: {
              title: '문자 발송 요청',
              body: '웹에서 문자 발송 요청이 있습니다.',
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channelId: 'bizconnect-default',
              },
            },
          },
        }),
      }
    );

    const fcmResult = await fcmResponse.json();
    console.log('[FCM v1] Push result:', fcmResult);

    if (fcmResponse.ok) {
      return NextResponse.json({ success: true, message: 'FCM push sent', result: fcmResult });
    } else {
      return NextResponse.json({
        success: false,
        message: 'FCM push failed',
        error: fcmResult
      });
    }
  } catch (error) {
    console.error('[FCM] Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
