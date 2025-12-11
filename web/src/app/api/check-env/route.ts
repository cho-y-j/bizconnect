import { NextResponse } from 'next/server'

/**
 * 환경 변수 확인 API (개발 환경 전용)
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return NextResponse.json({
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    url: supabaseUrl || 'NOT SET',
    keyPreview: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET',
  })
}

