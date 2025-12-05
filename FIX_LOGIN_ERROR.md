# 로그인 400 에러 해결 방법

## 문제
에러: `POST /auth/v1/token?grant_type=password 400 (Bad Request)`

회원가입은 성공했지만 로그인 시 400 에러가 발생합니다.

## 주요 원인

### 1. 이메일 확인 필요 (가장 가능성 높음)
Supabase에서 이메일 확인이 활성화되어 있으면, 회원가입 후 이메일 확인 링크를 클릭해야 로그인할 수 있습니다.

### 2. 비밀번호 오류
비밀번호가 잘못 입력되었을 수 있습니다.

## 해결 방법

### 방법 1: 이메일 확인 비활성화 (개발용 - 권장)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/auth/providers

2. **Email Provider 설정**
   - Authentication > Providers > Email 클릭
   - **"Confirm email" 토글을 OFF로 설정**
   - Save 클릭

3. **기존 사용자 삭제 후 재가입**
   - Authentication > Users에서 테스트 계정 삭제
   - 다시 회원가입 시도

### 방법 2: 이메일 확인 링크 클릭

1. 회원가입 시 입력한 이메일 확인
2. Supabase에서 발송한 확인 이메일 열기
3. "Confirm your email" 링크 클릭
4. 로그인 시도

### 방법 3: Supabase Dashboard에서 수동 확인

1. **Supabase Dashboard > Authentication > Users**
2. 해당 사용자 찾기
3. **"Confirm email" 버튼 클릭** (또는 Actions > Confirm user)
4. 로그인 시도

## 코드 수정 완료

에러 메시지 처리를 개선했습니다:
- ✅ "Email not confirmed" → 명확한 안내
- ✅ "Invalid login credentials" → 비밀번호 오류 안내
- ✅ 상세 에러 로깅

## 테스트 순서

1. **이메일 확인 비활성화** (방법 1)
2. **기존 테스트 계정 삭제**
3. **새로 회원가입**
4. **즉시 로그인 시도**

## 확인 사항

로그인 성공 후:
- ✅ 대시보드 접근 가능
- ✅ `user_settings` 테이블에 레코드 생성 확인
- ✅ 세션 유지 확인

