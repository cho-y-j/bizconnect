import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * 접속 로그 기록 미들웨어
 * 모든 요청에 대해 접속 로그를 기록합니다.
 */
export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  // 정적 파일과 API 라우트는 제외 (선택적)
  const pathname = request.nextUrl.pathname
  
  // 정적 파일 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/') && pathname.includes('/_next')
  ) {
    return NextResponse.next()
  }

  // 응답 생성
  const response = NextResponse.next()

  // 비동기로 접속 로그 기록 (응답을 블로킹하지 않음)
  logAccess(request, response, startTime).catch((error) => {
    // 에러가 발생해도 요청 처리는 계속됨
    console.error('Failed to log access:', error)
  })

  return response
}

/**
 * 접속 로그 기록 함수
 */
async function logAccess(
  request: NextRequest,
  response: NextResponse,
  startTime: number
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })

    // 사용자 ID 가져오기 (세션이 있는 경우)
    let userId: string | null = null
    try {
      const authHeader = request.headers.get('authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        userId = user?.id || null
      } else {
        // 쿠키에서 세션 확인
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          const { data: { session } } = await supabase.auth.getSession()
          userId = session?.user?.id || null
        }
      }
    } catch (error) {
      // 인증 실패는 무시 (비로그인 사용자도 로그 기록)
      console.debug('Auth check failed in middleware:', error)
    }

    // IP 주소 가져오기
    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // User-Agent 가져오기
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // 경로와 메서드
    const route = request.nextUrl.pathname
    const method = request.method

    // 응답 시간 계산
    const responseTime = Date.now() - startTime

    // 상태 코드는 응답에서 가져올 수 없으므로 기본값 사용
    // 실제로는 API 라우트에서 직접 기록하는 것이 더 정확함
    const statusCode = 200 // 기본값

    // 접속 로그 기록
    const { error } = await supabase
      .from('access_logs')
      .insert({
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        route,
        method,
        status_code: statusCode,
        response_time: responseTime,
      })

    if (error) {
      console.error('Failed to insert access log:', error)
    }
  } catch (error) {
    // 에러가 발생해도 요청 처리는 계속됨
    console.error('Error in logAccess:', error)
  }
}

/**
 * 미들웨어가 실행될 경로 설정
 */
export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 매칭:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

