import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * 연결 테스트 API (개발 환경 전용)
 * 프로덕션에서는 비활성화
 */
export async function GET() {
  // 프로덕션 환경에서는 비활성화
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
  };

  try {
    // 1. 기본 연결 테스트
    const { error: healthError } = await supabase
      .from('customers')
      .select('count')
      .limit(0);
    
    results.tests.push({
      name: '기본 연결',
      status: healthError && healthError.code !== 'PGRST116' ? 'failed' : 'success',
      message: healthError ? healthError.message : '연결 성공',
    });

    // 2. 테이블 존재 확인
    const tables = ['customers', 'tasks', 'sms_logs', 'daily_limits', 'user_settings'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(0);
      results.tests.push({
        name: `테이블: ${table}`,
        status: error ? 'failed' : 'success',
        message: error ? error.message : '존재함',
      });
    }

    // 3. RLS 정책 확인
    const { error: rlsError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);
    
    results.tests.push({
      name: 'RLS 정책',
      status: rlsError?.code === 'PGRST301' ? 'success' : 'warning',
      message: rlsError?.code === 'PGRST301' 
        ? 'RLS 정책 작동 중 (인증 필요)' 
        : rlsError?.message || 'RLS 확인 필요',
    });

    // 4. Auth 서비스 확인
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    results.tests.push({
      name: 'Auth 서비스',
      status: authError ? 'failed' : 'success',
      message: authError ? authError.message : '정상',
      session: session ? '로그인됨' : '로그인 안됨',
    });

    // 5. 환경 변수 확인
    results.tests.push({
      name: '환경 변수',
      status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'success' : 'failed',
      message: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? `URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` 
        : '환경 변수 없음',
    });

    const allSuccess = results.tests.every((t: any) => t.status === 'success' || t.status === 'warning');
    
    return NextResponse.json({
      ...results,
      overall: allSuccess ? 'success' : 'failed',
    }, { status: allSuccess ? 200 : 500 });

  } catch (error: any) {
    return NextResponse.json({
      ...results,
      error: error.message,
      overall: 'failed',
    }, { status: 500 });
  }
}

