/**
 * 고객 관련 타입 정의
 * 그룹(Group)과 태그(Tag) 기반 고객 관리
 */

export interface CustomerGroup {
  id: string
  user_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CustomerTag {
  id: string
  customer_id: string
  tag_name: string
  created_at: string
}

export interface Customer {
  id: string
  user_id: string
  group_id: string | null
  name: string
  phone: string
  birthday?: string | null
  anniversary?: string | null
  industry_type?: string | null // 추후 업종별 특화용 (현재는 사용 안함)
  notes?: string | null
  address?: string | null // 주소 (AI 참고용)
  occupation?: string | null // 직업 (AI 참고용)
  age?: number | null // 나이 (AI 참고용)
  birth_year?: number | null // 출생년도
  created_at: string
  updated_at: string
  // 조인 데이터
  group?: CustomerGroup
  tags?: CustomerTag[]
}

export interface CustomerFormData {
  name: string
  phone: string
  group_id?: string | null
  birthday?: string
  anniversary?: string
  tags?: string[] // 태그 배열 (예: ['#골프', '#분당'])
  notes?: string
  address?: string // 주소
  occupation?: string // 직업
  age?: number | null // 나이
  birth_year?: number | null // 출생년도
}

/**
 * 기본 그룹 색상 팔레트
 */
export const DEFAULT_GROUP_COLORS = [
  '#3B82F6', // 파란색
  '#EF4444', // 빨간색
  '#10B981', // 초록색
  '#F59E0B', // 주황색
  '#8B5CF6', // 보라색
  '#EC4899', // 분홍색
  '#6B7280', // 회색
  '#14B8A6', // 청록색
]
