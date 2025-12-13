# Google OAuth 설정 가이드

## 문제 해결

구글 로그인이 작동하지 않는 경우, 다음 설정을 확인하세요.

## 1. Supabase Dashboard 설정

### Step 1: Supabase 프로젝트 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: `bizconnedt` (hdeebyhwoogxawjkwufx)

### Step 2: Authentication → Providers
1. 좌측 메뉴에서 **Authentication** 클릭
2. **Providers** 탭 선택
3. **Google** 찾아서 클릭

### Step 3: Google Provider 활성화
1. **Enable Google provider** 토글을 **ON**으로 설정
2. 다음 정보 입력 필요:
   - **Client ID (for OAuth)**: Google Cloud Console에서 발급받은 Client ID
   - **Client Secret (for OAuth)**: Google Cloud Console에서 발급받은 Client Secret

## 2. Google Cloud Console 설정

### Step 1: Google Cloud Console 접속
1. https://console.cloud.google.com 접속
2. 프로젝트 선택: `call-93289` (또는 Firebase 프로젝트)

### Step 2: OAuth 2.0 클라이언트 ID 생성
1. **APIs & Services** → **Credentials** 이동
2. **+ CREATE CREDENTIALS** → **OAuth client ID** 선택
3. Application type: **Web application** 선택
4. Name: `BizConnect Web` (또는 원하는 이름)
5. **Authorized redirect URIs**에 다음 추가:
   ```
   https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/callback
   ```
6. **Create** 클릭
7. **Client ID**와 **Client Secret** 복사

### Step 3: Supabase에 정보 입력
1. Supabase Dashboard로 돌아가기
2. Google Provider 설정에 복사한 정보 입력:
   - **Client ID (for OAuth)**: Google Cloud Console의 Client ID
   - **Client Secret (for OAuth)**: Google Cloud Console의 Client Secret
3. **Save** 클릭

## 3. Redirect URL 확인

### Supabase Redirect URLs
Supabase Dashboard → Authentication → URL Configuration에서 다음 URL이 등록되어 있는지 확인:

- `https://bizconnect-ten.vercel.app/auth/callback` (프로덕션)
- `http://localhost:3000/auth/callback` (로컬 개발)

### Google Cloud Console Redirect URIs
Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID에서:

- `https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/callback` (Supabase 콜백 URL)

**중요:** Google Cloud Console에는 Supabase의 콜백 URL을 등록해야 합니다!

## 4. 일반적인 문제 해결

### 문제 1: "redirect_uri_mismatch" 에러
**원인:** Google Cloud Console에 Supabase 콜백 URL이 등록되지 않음

**해결:**
1. Google Cloud Console → OAuth 2.0 Client ID
2. Authorized redirect URIs에 추가:
   ```
   https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/callback
   ```

### 문제 2: "invalid_client" 에러
**원인:** Supabase에 잘못된 Client ID 또는 Secret 입력

**해결:**
1. Google Cloud Console에서 Client ID와 Secret 다시 확인
2. Supabase Dashboard에서 올바르게 입력했는지 확인
3. 공백이나 특수문자가 포함되지 않았는지 확인

### 문제 3: 로그인 후 세션이 생성되지 않음
**원인:** 콜백 URL이 올바르게 처리되지 않음

**해결:**
1. `web/src/app/auth/callback/page.tsx` 파일 확인
2. 브라우저 콘솔에서 에러 메시지 확인
3. Supabase Dashboard → Authentication → Logs에서 에러 확인

## 5. 테스트 방법

1. 웹사이트 접속: https://bizconnect-ten.vercel.app
2. **로그인** 클릭
3. **구글로 로그인** 버튼 클릭
4. Google 계정 선택 및 권한 승인
5. 자동으로 `/auth/callback`으로 리다이렉트
6. 대시보드로 이동

## 6. 디버깅

### 브라우저 콘솔 확인
1. F12 → Console 탭
2. 구글 로그인 버튼 클릭
3. 에러 메시지 확인

### Supabase Logs 확인
1. Supabase Dashboard → Authentication → Logs
2. 최근 인증 시도 확인
3. 에러 메시지 확인

## 참고 링크
- Supabase Auth 문서: https://supabase.com/docs/guides/auth
- Google OAuth 설정: https://console.cloud.google.com/apis/credentials

