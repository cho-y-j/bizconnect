import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * API 라우트에서 접속 로그 기록
 * 더 정확한 상태 코드와 응답 시간을 기록하기 위해 사용
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      route,
      method,
      statusCode,
      responseTime,
      userId,
    } = body

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })

    // IP 주소 가져오기
    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // User-Agent 가져오기
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // 접속 로그 기록
    const { error } = await supabase
      .from('access_logs')
      .insert({
        user_id: userId || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        route: route || request.nextUrl.pathname,
        method: method || request.method,
        status_code: statusCode || 200,
        response_time: responseTime || 0,
      })

    if (error) {
      console.error('Failed to insert access log:', error)
      return NextResponse.json(
        { error: 'Failed to log access' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in log-access API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


