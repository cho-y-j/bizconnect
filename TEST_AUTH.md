# 회원가입 및 로그인 테스트 가이드

## 테스트 체크리스트

### 1. 트리거 비활성화 (필수)
- [ ] Supabase Dashboard에서 트리거 비활성화 SQL 실행
- [ ] 트리거 삭제 확인

### 2. 이메일 확인 설정
- [ ] "Confirm email" OFF 확인
- [ ] Email Provider 활성화 확인

### 3. 회원가입 테스트
- [ ] 새 이메일로 회원가입 시도
- [ ] 에러 없이 성공하는지 확인
- [ ] `user_settings` 자동 생성 확인

### 4. 로그인 테스트
- [ ] 가입한 계정으로 로그인 시도
- [ ] 대시보드 접근 확인
- [ ] 세션 유지 확인

### 5. 데이터 확인
- [ ] Supabase Dashboard > Authentication > Users에서 사용자 확인
- [ ] Table Editor > user_settings에서 레코드 확인

