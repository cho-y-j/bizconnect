/**
 * 문자 템플릿 관련 타입 정의
 */

export type TemplateCategory = 'general' | 'birthday' | 'anniversary' | 'greeting' | 'notice' | 'promotion'

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: '일반',
  birthday: '생일',
  anniversary: '기념일',
  greeting: '인사',
  notice: '공지',
  promotion: '프로모션',
}

export interface MessageTemplate {
  id: string
  user_id: string
  name: string
  content: string
  category: TemplateCategory
  variables: string[]
  usage_count: number
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface TemplateFormData {
  name: string
  content: string
  category: TemplateCategory
  is_favorite: boolean
}

/**
 * 사용 가능한 변수 목록
 */
export const AVAILABLE_VARIABLES = [
  { key: '{고객명}', description: '고객 이름' },
  { key: '{날짜}', description: '오늘 날짜 (YYYY-MM-DD)' },
  { key: '{시간}', description: '현재 시간 (HH:MM)' },
  { key: '{전화번호}', description: '고객 전화번호' },
  { key: '{업종}', description: '고객 업종' },
  { key: '{그룹명}', description: '고객 그룹 이름' },
  { key: '{태그}', description: '첫 번째 태그' },
  { key: '{생일}', description: '고객 생일' },
  { key: '{기념일}', description: '고객 기념일' },
  { key: '{요일}', description: '오늘 요일' },
] as const

export type VariableKey = typeof AVAILABLE_VARIABLES[number]['key']

