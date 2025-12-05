/**
 * 템플릿 변수 치환 유틸리티
 */

import type { Customer } from '@/lib/types/customer'
import type { CustomerGroup } from '@/lib/types/customer'

export interface VariableContext {
  customer?: Customer & {
    group?: CustomerGroup
    tags?: Array<{ tag_name: string }>
  }
  date?: Date
}

/**
 * 템플릿 내용에서 변수를 실제 값으로 치환
 */
export function replaceTemplateVariables(
  template: string,
  context: VariableContext
): string {
  let result = template
  const date = context.date || new Date()

  // {고객명}
  if (context.customer?.name) {
    result = result.replace(/{고객명}/g, context.customer.name)
  }

  // {날짜}
  const dateStr = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\./g, '-').replace(/\s/g, '').slice(0, -1)
  result = result.replace(/{날짜}/g, dateStr)

  // {시간}
  const timeStr = date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  result = result.replace(/{시간}/g, timeStr)

  // {전화번호}
  if (context.customer?.phone) {
    const phone = context.customer.phone.replace(/\D/g, '')
    const formattedPhone = phone.length === 11
      ? `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
      : phone
    result = result.replace(/{전화번호}/g, formattedPhone)
  }

  // {업종}
  if (context.customer?.industry_type) {
    const industryLabels: Record<string, string> = {
      general: '일반',
      automotive: '자동차',
      insurance: '보험',
      real_estate: '부동산',
      construction: '건설',
      store: '매장관리',
    }
    result = result.replace(/{업종}/g, industryLabels[context.customer.industry_type] || context.customer.industry_type)
  }

  // {그룹명}
  if (context.customer?.group?.name) {
    result = result.replace(/{그룹명}/g, context.customer.group.name)
  }

  // {태그}
  if (context.customer?.tags && context.customer.tags.length > 0) {
    result = result.replace(/{태그}/g, context.customer.tags[0].tag_name)
  }

  // {생일}
  if (context.customer?.birthday) {
    const birthday = new Date(context.customer.birthday)
    const birthdayStr = birthday.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\./g, '-').replace(/\s/g, '').slice(0, -1)
    result = result.replace(/{생일}/g, birthdayStr)
  }

  // {기념일}
  if (context.customer?.anniversary) {
    const anniversary = new Date(context.customer.anniversary)
    const anniversaryStr = anniversary.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\./g, '-').replace(/\s/g, '').slice(0, -1)
    result = result.replace(/{기념일}/g, anniversaryStr)
  }

  // {요일}
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const weekday = weekdays[date.getDay()]
  result = result.replace(/{요일}/g, weekday)

  return result
}

/**
 * 템플릿에서 사용된 변수 목록 추출
 */
export function extractVariables(template: string): string[] {
  const variablePattern = /\{([^}]+)\}/g
  const matches = template.matchAll(variablePattern)
  const variables = Array.from(matches, m => `{${m[1]}}`)
  return [...new Set(variables)] // 중복 제거
}

