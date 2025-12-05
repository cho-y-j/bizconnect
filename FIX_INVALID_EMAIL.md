# 이메일 주소 유효성 검사 오류 해결

## 문제
에러: `Email address "test1@test.com" is invalid`

Supabase가 테스트 이메일 도메인을 차단하고 있습니다.

## 해결 방법

### 방법 1: 실제 이메일 주소 사용 (권장)

테스트 이메일 대신 실제 이메일 주소를 사용하세요:
- Gmail: `yourname@gmail.com`
- 네이버: `yourname@naver.com`
- 기타 실제 이메일

### 방법 2: Supabase에서 이메일 도메인 제한 해제

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/auth/providers

2. **Email Provider 설정**
   - Authentication > Providers > Email 클릭
   - "Allowed email domains" 확인
   - 비어있으면 모든 도메인 허용
   - 특정 도메인만 있으면 `test.com` 추가

3. **이메일 형식 검증 완화** (선택)
   - "Secure email change" 설정 확인
   - 개발 중에는 완화된 설정 사용 가능

### 방법 3: Supabase Auth 설정 확인

1. **Authentication > Settings**
2. **"Enable email signup" 확인**
3. **"Enable email confirmations" OFF** (개발용)

## 테스트용 이메일

개발 중에는 다음을 사용할 수 있습니다:
- 실제 Gmail 주소
- 실제 네이버 메일 주소
- 또는 Supabase Dashboard에서 허용된 도메인

## 코드 수정 완료

에러 메시지를 개선했습니다:
- ✅ "Email address ... is invalid" → 명확한 안내 메시지

---

**가장 간단한 해결책: 실제 이메일 주소를 사용하세요!**

