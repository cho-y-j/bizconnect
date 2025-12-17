/**
 * UUID를 Base62로 인코딩하여 짧은 URL 코드 생성
 * UUID 36자 → Base62 약 22자
 */

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * UUID를 Base62 문자열로 변환
 * @param uuid - 예: "be081b62-986c-4331-b158-56fc57be0806"
 * @returns Base62 인코딩된 짧은 문자열
 */
export function uuidToBase62(uuid: string): string {
  // 하이픈 제거
  const hex = uuid.replace(/-/g, '');

  // 16진수를 BigInt로 변환
  const num = BigInt('0x' + hex);

  // Base62로 인코딩
  let result = '';
  let n = num;
  const ZERO = BigInt(0);
  const SIXTY_TWO = BigInt(62);

  while (n > ZERO) {
    const remainder = Number(n % SIXTY_TWO);
    result = BASE62_CHARS[remainder] + result;
    n = n / SIXTY_TWO;
  }

  return result || '0';
}

/**
 * Base62 문자열을 UUID로 변환
 * @param base62 - Base62 인코딩된 문자열
 * @returns UUID 형식 문자열
 */
export function base62ToUuid(base62: string): string {
  // Base62를 BigInt로 디코딩
  let num = BigInt(0);
  const SIXTY_TWO = BigInt(62);

  for (const char of base62) {
    const index = BASE62_CHARS.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base62 character: ${char}`);
    }
    num = num * SIXTY_TWO + BigInt(index);
  }

  // BigInt를 16진수 문자열로 변환 (32자로 패딩)
  let hex = num.toString(16).padStart(32, '0');

  // UUID 형식으로 변환 (8-4-4-4-12)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * shortId가 UUID인지 Base62인지 확인
 * @param id - 확인할 ID
 * @returns true면 UUID 형식
 */
export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * shortId를 UUID로 변환 (UUID면 그대로, Base62면 변환)
 * @param shortId - UUID 또는 Base62 문자열
 * @returns UUID 형식 문자열
 */
export function resolveToUuid(shortId: string): string {
  if (isUuid(shortId)) {
    return shortId.toLowerCase();
  }
  return base62ToUuid(shortId);
}
