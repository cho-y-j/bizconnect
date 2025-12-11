import { NextResponse } from 'next/server'

/**
 * 프로덕션 환경에서 안전한 에러 메시지 생성
 */
export function getSafeErrorMessage(error: any, defaultMessage: string = '오류가 발생했습니다.'): string {
  // 개발 환경에서는 상세 에러 메시지 반환
  if (process.env.NODE_ENV === 'development') {
    return error?.message || defaultMessage
  }
  
  // 프로덕션 환경에서는 일반적인 메시지만 반환
  return defaultMessage
}

/**
 * 안전한 에러 응답 생성
 */
export function createErrorResponse(
  error: any,
  statusCode: number = 500,
  defaultMessage: string = '오류가 발생했습니다.'
): NextResponse {
  const message = getSafeErrorMessage(error, defaultMessage)
  
  // 개발 환경에서만 상세 정보 로깅
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', error)
  }
  
  return NextResponse.json(
    { error: message },
    { status: statusCode }
  )
}


