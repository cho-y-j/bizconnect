# 비즈커넥트 보안 플랜

**작성일:** 2025.12.05  
**버전:** 1.0  
**중요도:** 최상위 ⭐⭐⭐

---

## 🔒 보안 개요

비즈커넥트는 **고객의 개인정보(이름, 전화번호, 생일 등)**를 다루는 민감한 데이터를 처리하므로, 보안은 최우선 과제입니다.

---

## 1. 데이터 보안 (Data Security)

### 1.1 데이터베이스 보안

#### Row Level Security (RLS)
- **모든 테이블에 RLS 활성화**
- 사용자는 자신의 데이터만 접근 가능
- `auth.uid()`를 통한 자동 필터링

```sql
-- 예시: customers 테이블
CREATE POLICY "Users can only access their own customers"
    ON customers FOR ALL
    USING (auth.uid() = user_id);
```

**체크리스트:**
- [ ] 모든 테이블에 RLS 정책 적용
- [ ] 정책 테스트 (다른 사용자 데이터 접근 불가 확인)
- [ ] 서비스 롤(Service Role) 키는 서버 사이드에서만 사용

---

#### 데이터 암호화

**전송 중 암호화 (TLS/SSL):**
- Supabase는 기본적으로 HTTPS 사용
- 모든 API 통신은 암호화됨
- **체크:** 브라우저 개발자 도구에서 HTTPS 확인

**저장 시 암호화:**
- Supabase PostgreSQL은 기본 암호화 사용
- **민감 정보 추가 암호화 고려:**
  - 전화번호: 마스킹 처리 (010-****-5678)
  - 생일: 연도는 제외하고 월/일만 저장 (선택)

**체크리스트:**
- [ ] HTTPS 강제 설정 (Vercel)
- [ ] 민감 정보 마스킹 UI 구현
- [ ] 로그에 민감 정보 노출 방지

---

### 1.2 API 보안

#### 인증 토큰 관리

**웹 (Next.js):**
- Supabase 세션 토큰은 **HttpOnly Cookie**에 저장 (권장)
- 또는 **로컬스토리지**에 저장 (현재 방식)
- **주의:** XSS 공격에 취약할 수 있으므로 HttpOnly Cookie 권장

```typescript
// 권장 방식: HttpOnly Cookie
import { createServerClient } from '@supabase/ssr'

// 클라이언트에서는 직접 토큰 접근 불가
// 서버 사이드에서만 토큰 사용
```

**모바일 (React Native):**
- Supabase 세션은 **Secure Storage**에 저장
- `@react-native-async-storage/async-storage` 또는 `expo-secure-store` 사용

**체크리스트:**
- [ ] 웹: HttpOnly Cookie로 전환 검토
- [ ] 모바일: Secure Storage 사용
- [ ] 토큰 만료 시간 설정 (기본 1시간)
- [ ] 리프레시 토큰 자동 갱신

---

#### API 엔드포인트 보안

**서버 사이드 검증:**
- 모든 API 엔드포인트에서 사용자 인증 확인
- RLS 정책으로 자동 필터링되지만, 추가 검증 권장

```typescript
// 예시: /api/customers/route.ts
export async function POST(request: Request) {
    // 1. 인증 확인
    const supabase = createServerClient(...)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (!user || error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 2. 입력 검증
    const body = await request.json()
    if (!body.name || !body.phone) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    
    // 3. 전화번호 형식 검증
    const phoneRegex = /^010\d{8}$/
    if (!phoneRegex.test(body.phone.replace(/-/g, ''))) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }
    
    // 4. RLS가 자동으로 user_id 필터링
    const { data, error: dbError } = await supabase
        .from('customers')
        .insert([{ ...body, user_id: user.id }])
    
    return NextResponse.json({ data })
}
```

**체크리스트:**
- [ ] 모든 API 엔드포인트에 인증 미들웨어 적용
- [ ] 입력 검증 (타입, 형식, 길이)
- [ ] SQL Injection 방지 (Supabase가 자동 처리하지만 확인)
- [ ] Rate Limiting 고려 (과도한 요청 방지)

---

### 1.3 개인정보 보호

#### 데이터 최소화 원칙
- 필요한 정보만 수집
- 사용하지 않는 데이터는 주기적으로 삭제

#### 데이터 보관 기간
- 고객 정보: 계정 삭제 시 자동 삭제
- SMS 발송 기록: 1년 보관 후 자동 삭제 (선택)
- 일일 한도 기록: 3개월 보관 후 삭제

#### 사용자 권리
- **데이터 조회:** 사용자는 언제든지 자신의 데이터 조회 가능
- **데이터 수정:** 고객 정보 수정 가능
- **데이터 삭제:** 계정 삭제 시 모든 데이터 삭제
- **데이터 내보내기:** CSV 다운로드 기능 (향후)

**체크리스트:**
- [ ] 계정 삭제 시 데이터 자동 삭제 (CASCADE)
- [ ] 데이터 보관 기간 정책 문서화
- [ ] 개인정보 처리방침 페이지 작성

---

## 2. 인증 보안 (Authentication Security)

### 2.1 비밀번호 정책

**최소 요구사항:**
- 최소 8자 이상
- 영문, 숫자, 특수문자 조합 (선택)
- 일반적인 비밀번호 차단 (123456, password 등)

**Supabase 설정:**
```sql
-- Supabase Dashboard > Authentication > Settings
-- Password Requirements:
-- - Minimum length: 8
-- - Require uppercase: false (선택)
-- - Require lowercase: false (선택)
-- - Require numbers: false (선택)
-- - Require special characters: false (선택)
```

**체크리스트:**
- [ ] 비밀번호 정책 설정
- [ ] 비밀번호 재사용 방지 (선택)
- [ ] 비밀번호 재설정 토큰 만료 시간 설정 (1시간)

---

### 2.2 소셜 로그인 (구글 OAuth)

**보안 고려사항:**
- OAuth 2.0 표준 준수
- State 파라미터로 CSRF 방지 (Supabase 자동 처리)
- 콜백 URL 화이트리스트 설정

**Supabase 설정:**
```
Google OAuth:
- Client ID: (Google Cloud Console에서 발급)
- Client Secret: (Google Cloud Console에서 발급)
- Redirect URL: https://your-domain.com/auth/callback
```

**체크리스트:**
- [ ] Google Cloud Console에서 OAuth 설정
- [ ] 콜백 URL 화이트리스트 확인
- [ ] 이메일 도메인 제한 (선택, 기업용)

---

### 2.3 세션 관리

**세션 만료:**
- 기본 세션 시간: 1시간
- 리프레시 토큰: 30일
- 자동 갱신: 앱 사용 중 자동 갱신

**세션 무효화:**
- 로그아웃 시 즉시 무효화
- 비밀번호 변경 시 모든 세션 무효화
- 의심스러운 활동 감지 시 세션 무효화 (향후)

**체크리스트:**
- [ ] 세션 만료 시간 설정
- [ ] 로그아웃 시 세션 무효화 확인
- [ ] 다중 디바이스 세션 관리

---

## 3. 모바일 앱 보안

### 3.1 권한 관리

**필수 권한:**
- `SEND_SMS`: SMS 발송
- `READ_PHONE_STATE`: 통화 상태 확인
- `READ_CALL_LOG`: 통화 기록 확인 (콜백용)
- `READ_CONTACTS`: 연락처 불러오기

**권한 요청 전략:**
- 앱 시작 시 필수 권한만 요청
- 기능 사용 시점에 권한 요청 (Just-in-time)
- 권한 거부 시 명확한 안내 메시지

**체크리스트:**
- [ ] 권한 요청 타이밍 최적화
- [ ] 권한 거부 시 대체 방안 제공
- [ ] 권한 사용 목적 명확히 설명

---

### 3.2 앱 데이터 보안

**로컬 저장소:**
- Supabase 세션 토큰: Secure Storage 사용
- 사용자 설정: 일반 저장소 사용 가능
- **민감 정보는 절대 로컬에 저장하지 않음**

**코드 난독화:**
- Release 빌드 시 ProGuard/R8 활성화
- API 키는 환경 변수로 관리 (절대 하드코딩 금지)

**체크리스트:**
- [ ] Secure Storage 사용 확인
- [ ] API 키 하드코딩 제거
- [ ] Release 빌드 난독화 확인

---

### 3.3 네트워크 보안

**HTTPS 강제:**
- 모든 API 통신은 HTTPS만 허용
- HTTP 요청 자동 차단

**인증서 고정 (Certificate Pinning):**
- 선택 사항 (고급 보안)
- MITM 공격 방지

**체크리스트:**
- [ ] HTTPS만 허용 확인
- [ ] 인증서 검증 활성화

---

## 4. 웹 보안

### 4.1 XSS (Cross-Site Scripting) 방지

**입력 검증 및 이스케이프:**
- React는 기본적으로 XSS 방지 (JSX 자동 이스케이프)
- 사용자 입력은 항상 검증 후 사용
- `dangerouslySetInnerHTML` 사용 금지 (필수 시 sanitize)

**체크리스트:**
- [ ] 사용자 입력 검증
- [ ] HTML 이스케이프 확인
- [ ] 외부 라이브러리 신뢰성 확인

---

### 4.2 CSRF (Cross-Site Request Forgery) 방지

**Supabase 자동 처리:**
- Supabase는 CSRF 토큰 자동 관리
- SameSite Cookie 설정

**추가 보호:**
- 중요한 작업(삭제, 수정)은 확인 다이얼로그
- POST 요청만 허용 (GET 요청으로 삭제 금지)

**체크리스트:**
- [ ] SameSite Cookie 설정 확인
- [ ] 중요한 작업에 확인 다이얼로그 추가

---

### 4.3 클릭재킹 방지

**X-Frame-Options 헤더:**
```typescript
// next.config.ts
async headers() {
    return [
        {
            source: '/:path*',
            headers: [
                {
                    key: 'X-Frame-Options',
                    value: 'DENY'
                }
            ]
        }
    ]
}
```

**체크리스트:**
- [ ] X-Frame-Options 헤더 설정
- [ ] Content-Security-Policy 고려 (향후)

---

## 5. 보안 모니터링 및 대응

### 5.1 로깅 및 모니터링

**로그 수집:**
- 인증 실패 로그
- API 에러 로그
- 의심스러운 활동 로그

**모니터링:**
- Supabase Dashboard에서 실시간 모니터링
- Vercel Analytics (웹 트래픽)
- 에러 추적: Sentry 연동 (선택)

**체크리스트:**
- [ ] 에러 로깅 시스템 구축
- [ ] 의심스러운 활동 알림 설정 (향후)

---

### 5.2 보안 사고 대응 계획

**사고 유형:**
1. 데이터 유출
2. 계정 탈취
3. DDoS 공격
4. 악성 코드 주입

**대응 절차:**
1. 즉시 영향 범위 파악
2. 취약점 차단
3. 사용자 알림 (필요 시)
4. 사후 분석 및 개선

**체크리스트:**
- [ ] 보안 사고 대응 계획 문서화
- [ ] 연락처 및 책임자 명시

---

## 6. 규정 준수 (Compliance)

### 6.1 개인정보보호법

**필수 사항:**
- 개인정보 처리방침 작성
- 이용약관 작성
- 개인정보 보호책임자 지정 (필요 시)

**체크리스트:**
- [ ] 개인정보 처리방침 페이지 작성
- [ ] 이용약관 페이지 작성
- [ ] 개인정보 수집 동의 UI 구현

---

### 6.2 GDPR (유럽 사용자용, 향후)

**필수 사항:**
- 데이터 삭제 권리 (Right to be forgotten)
- 데이터 이동 권리 (Data portability)
- 동의 철회 권리

**체크리스트:**
- [ ] GDPR 준수 검토 (향후)

---

## 7. 보안 체크리스트 (종합)

### 개발 단계
- [ ] 모든 테이블에 RLS 정책 적용
- [ ] API 엔드포인트 인증 검증
- [ ] 입력 검증 및 이스케이프
- [ ] HTTPS 강제
- [ ] 민감 정보 암호화
- [ ] 비밀번호 정책 설정
- [ ] 세션 관리 구현

### 배포 전
- [ ] 보안 취약점 스캔
- [ ] 침투 테스트 (선택)
- [ ] 개인정보 처리방침 작성
- [ ] 이용약관 작성
- [ ] 에러 로깅 시스템 구축

### 운영 중
- [ ] 정기적인 보안 업데이트
- [ ] 로그 모니터링
- [ ] 사용자 피드백 수집
- [ ] 보안 패치 적용

---

## 8. 보안 우선순위

### Phase 1 (MVP) - 필수
1. ✅ RLS 정책 적용
2. ✅ API 인증 검증
3. ✅ HTTPS 강제
4. ✅ 입력 검증
5. ✅ 세션 관리

### Phase 2 - 중요
1. ⭐ 개인정보 처리방침
2. ⭐ 에러 로깅
3. ⭐ 데이터 보관 정책
4. ⭐ 보안 모니터링

### Phase 3 - 개선
1. 🔸 인증서 고정
2. 🔸 침투 테스트
3. 🔸 자동화된 보안 스캔
4. 🔸 GDPR 준수

---

## 9. 참고 자료

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [React Native Security](https://reactnative.dev/docs/security)

---

**마지막 업데이트:** 2025.12.05  
**다음 리뷰:** Phase 1 완료 후


