# Supabase 회원가입 500 에러 해결 가이드

## 문제 원인

Supabase에서 500 에러가 발생하는 주요 원인:

1. **이메일 확인 설정**: Supabase Dashboard에서 이메일 확인이 활성화되어 있으면 회원가입 후 이메일 확인이 필요합니다.
2. **Auth 설정 문제**: Authentication 설정이 올바르지 않을 수 있습니다.
3. **Rate Limiting**: 너무 많은 요청으로 인한 제한

## 해결 방법

### 1. Supabase Dashboard에서 확인

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/auth/providers

2. **Email Auth 설정 확인**
   - Authentication > Providers > Email
   - "Confirm email" 설정 확인
   - **개발 중에는 비활성화 권장**

3. **Site URL 확인**
   - Authentication > URL Configuration
   - Site URL: `http://localhost:3000`
   - Redirect URLs에 추가:
     - `http://localhost:3000/**`
     - `http://localhost:3000/auth/callback`

### 2. 이메일 확인 비활성화 (개발용)

**개발 환경에서는 이메일 확인을 비활성화하는 것이 편리합니다:**

1. Supabase Dashboard > Authentication > Providers
2. Email 클릭
3. "Confirm email" 토글 **OFF**
4. Save

### 3. 코드 수정 완료

이미 다음 수정을 완료했습니다:
- ✅ 에러 핸들링 개선
- ✅ 이메일 확인 필요 시 안내 메시지
- ✅ 상세 에러 로깅

## 테스트

1. 개발 서버 재시작
2. 회원가입 시도
3. 브라우저 콘솔에서 에러 메시지 확인
4. Supabase Dashboard > Authentication > Users에서 사용자 생성 확인

## 추가 확인 사항

- [ ] Supabase 프로젝트가 활성 상태인지 확인
- [ ] API 키가 올바른지 확인
- [ ] 네트워크 연결 확인
- [ ] 브라우저 콘솔의 상세 에러 메시지 확인

