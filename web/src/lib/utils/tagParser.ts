/**
 * 태그 파서 유틸리티
 * "골프, 분당" → ["#골프", "#분당"] 변환
 */

/**
 * 입력 텍스트를 태그 배열로 변환
 * @param input "골프, 분당" 또는 "#골프 #분당" 또는 "골프 분당"
 * @returns ["#골프", "#분당"]
 */
export function parseTags(input: string): string[] {
  if (!input || !input.trim()) return []

  // 쉼표 또는 공백으로 분리
  const parts = input
    .split(/[,\s]+/)
    .map(part => part.trim())
    .filter(part => part.length > 0)

  // #이 없으면 추가, 있으면 그대로
  return parts.map(part => {
    if (part.startsWith('#')) {
      return part
    }
    return `#${part}`
  })
}

/**
 * 태그 배열을 입력 텍스트로 변환 (표시용)
 * @param tags ["#골프", "#분당"]
 * @returns "골프, 분당"
 */
export function tagsToText(tags: string[]): string {
  return tags
    .map(tag => tag.replace(/^#/, ''))
    .join(', ')
}

/**
 * 태그명 추출 (# 제거)
 * @param tag "#골프"
 * @returns "골프"
 */
export function getTagName(tag: string): string {
  return tag.replace(/^#/, '')
}

