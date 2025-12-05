# 이메일 회원가입 활성화 방법

## 문제
에러: `Email signups are disabled`

## 해결 방법

### 1. Supabase Dashboard 접속
https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/auth/providers

### 2. Email Provider 활성화
1. **Authentication** 메뉴 클릭
2. **Providers** 탭 클릭
3. **Email** 클릭
4. **Enable Email provider** 토글을 **ON**으로 설정
5. **Save** 버튼 클릭

### 3. 추가 설정 (선택사항)

**이메일 확인 비활성화 (개발용):**
- "Confirm email" 토글을 **OFF**로 설정
- 이렇게 하면 회원가입 후 즉시 로그인됩니다

**이메일 확인 활성화 (운영용):**
- "Confirm email" 토글을 **ON**으로 설정
- 회원가입 후 이메일 확인 링크를 클릭해야 로그인됩니다

### 4. Site URL 설정 확인
1. **Authentication** > **URL Configuration**
2. **Site URL**: `http://localhost:3000`
3. **Redirect URLs**에 추가:
   - `http://localhost:3000/**`
   - `http://localhost:3000/auth/callback`

## 완료 후
설정 저장 후 다시 회원가입을 시도하세요!

