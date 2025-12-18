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
  if (!formatted.includes('\n')) {
    formatted = formatted
      .replace('-----BEGIN PRIVATE KEY----- ', '-----BEGIN PRIVATE KEY-----\n')
      .replace(' -----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
      .replace(/(.{64})/g, '$1\n')
      .replace(/\n\n/g, '\n');
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

/**
 * FCM 푸시 발송 API
 *
 * DATA-ONLY 방식: notification 필드 없이 data만 전송
 * 앱에서 직접 승인/취소 버튼이 있는 알림을 표시함
 *
 * 단일 문자: { userId, taskId, type, phone, message, hasImage }
 * 다량 문자: { userId, taskIds[], type }
 */
export async function POST(request: Request) {
  console.log('[FCM API] ===== FCM PUSH REQUEST =====');

  try {
    const body = await request.json();
    const { userId, taskId, taskIds, type = 'send_sms', phone, message, hasImage } = body;

    // 다량 문자인지 확인
    // taskIds가 배열이고 길이가 1보다 클 때만 배치로 처리
    // taskIds가 undefined이거나 빈 배열이면 단일로 처리
    const isBatch = Array.isArray(taskIds) && taskIds.length > 1;
    const count = isBatch ? taskIds.length : 1;
    // 단일 문자일 때는 taskId만 사용, 배치일 때만 taskIds 사용
    const finalTaskIds = isBatch ? taskIds : (taskId ? [taskId] : []);
    
    console.log('[FCM API] Batch check:', { 
      taskId, 
      taskIds, 
      taskIdsType: typeof taskIds,
      taskIdsIsArray: Array.isArray(taskIds),
      isBatch,
      count,
      finalTaskIdsLength: finalTaskIds.length
    });

    console.log('[FCM API] Request:', { userId, isBatch, count, type, hasImage });

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // 환경 변수 확인
    if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      console.error('[FCM API] Firebase credentials not configured');
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }

    // user_settings에서 FCM 토큰 조회
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('fcm_token')
      .eq('user_id', userId)
      .single();

    if (settingsError || !userSettings?.fcm_token) {
      console.warn('[FCM API] No FCM token found for user:', userId);
      return NextResponse.json({
        success: false,
        message: 'FCM token not found. App may not be registered.'
      });
    }

    const fcmToken = userSettings.fcm_token;
    console.log('[FCM API] FCM token found');

    // OAuth2 액세스 토큰 얻기
    const accessToken = await getAccessToken();

    // DATA-ONLY FCM 메시지
    // notification 필드 제거 - 앱에서 직접 승인 알림 표시
    const messagePayload = {
      message: {
        token: fcmToken,
        // DATA ONLY - 시스템 알림 없음, 앱에서 직접 처리
        data: {
          type: isBatch ? 'send_sms_batch' : type,
          // 단일 문자: taskId만 전송, taskIds는 빈 문자열
          // 배치: taskId는 빈 문자열, taskIds만 전송
          taskId: isBatch ? '' : (taskId || ''), // 배치가 아닐 때만 taskId 전송
          taskIds: isBatch ? JSON.stringify(finalTaskIds) : '', // 배치일 때만 taskIds 전송 (단일일 때는 빈 문자열)
          count: String(count),
          userId: userId || '', // ⚡ 앱에서 DB 조회 없이 사용
          phone: phone || '', // ⚡ 앱에서 DB 조회 없이 사용
          message: message || '', // ⚡ 전체 메시지 (앱에서 DB 조회 없이 즉시 발송)
          hasImage: hasImage ? 'true' : 'false',
          timestamp: new Date().toISOString(),
        },
        // Android: 높은 우선순위, notification 없음
        android: {
          priority: 'high',
        },
        // iOS: background fetch로 앱 깨우기
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'background',
          },
          payload: {
            aps: {
              'content-available': 1,
            },
          },
        },
      },
    };

    console.log('[FCM API] Sending DATA-ONLY push (no system notification)');

    // FCM v1 API로 푸시 발송
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const fcmResult = await fcmResponse.json();
    console.log('[FCM API] Response:', fcmResponse.status, fcmResult.name ? 'OK' : fcmResult);

    if (fcmResponse.ok) {
      return NextResponse.json({ success: true, message: 'FCM push sent', result: fcmResult });
    } else {
      return NextResponse.json({
        success: false,
        message: 'FCM push failed',
        error: fcmResult
      }, { status: fcmResponse.status });
    }
  } catch (error) {
    console.error('[FCM API] Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
