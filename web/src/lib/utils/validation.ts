/**
 * 입력 검증 유틸리티
 */

/**
 * UUID 형식 검증
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * 전화번호 형식 검증 및 정규화
 */
export function normalizePhoneNumber(phone: string): string | null {
  // 숫자만 추출
  const digits = phone.replace(/\D/g, '')
  
  // 한국 전화번호 형식 검증 (10자리 또는 11자리)
  if (digits.length < 10 || digits.length > 11) {
    return null
  }
  
  // 010으로 시작하는지 확인 (모바일)
  if (digits.length === 11 && digits.startsWith('010')) {
    return digits
  }
  
  // 10자리 지역번호 (02, 031, 032 등)
  if (digits.length === 10) {
    return digits
  }
  
  return null
}

/**
 * 파일명 안전성 검증 (경로 탐색 공격 방지)
 */
export function sanitizeFileName(fileName: string): string {
  // 경로 탐색 문자 제거
  return fileName
    .replace(/\.\./g, '') // .. 제거
    .replace(/\//g, '_') // / 제거
    .replace(/\\/g, '_') // \ 제거
    .replace(/[^a-zA-Z0-9가-힣._-]/g, '_') // 특수문자 제거
    .substring(0, 255) // 길이 제한
}

/**
 * 이미지 파일 확장자 검증
 */
export function isValidImageExtension(extension: string): boolean {
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  return allowedExtensions.includes(extension.toLowerCase())
}

/**
 * 이메일 형식 검증
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}


