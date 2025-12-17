# 구글 로그인 400 Bad Request 빠른 해결 가이드

## 현재 에러
```
GET https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/authorize?provider=google&redirect_to=... 400 (Bad Request)
```

## 즉시 확인 사항

### 1. Supabase Dashboard 확인 (가장 중요!)
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: **bizconnedt** (hdeebyhwoogxawjkwufx)
3. **Authentication** → **Providers** → **Google** 클릭
4. 다음 확인:
   - ✅ **Enable Google provider** 토글이 **ON**인가?
   - ✅ **Client ID (for OAuth)** 필드에 값이 입력되어 있는가?
   - ✅ **Client Secret (for OAuth)** 필드에 값이 입력되어 있는가?

**만약 비어있다면:**
- Google Cloud Console에서 OAuth 2.0 Client ID 생성 필요
- 아래 "Google Cloud Console 설정" 참고

### 2. Google Cloud Console 설정

#### Step 1: OAuth 2.0 Client ID 확인/생성
1. https://console.cloud.google.com 접속
2. 프로젝트 선택: **call-93289**
3. **APIs & Services** → **Credentials**
4. **OAuth 2.0 Client IDs** 섹션 확인
5. Web application 타입의 Client ID가 있는지 확인

**없다면 생성:**
1. **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `BizConnect Web`
4. **Authorized redirect URIs**에 추가:
   ```
   https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/callback
   ```
5. **Create** 클릭
6. **Client ID**와 **Client Secret** 복사

#### Step 2: Supabase에 입력
1. Supabase Dashboard로 돌아가기
2. **Authentication** → **Providers** → **Google**
3. 복사한 **Client ID**와 **Client Secret** 입력
4. **Save** 클릭

### 3. Redirect URL 확인

#### Supabase Redirect URLs
1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Redirect URLs**에 다음이 등록되어 있는지 확인:
   - `https://bizconnect-ten.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (로컬 개발용)

**없다면 추가:**
1. **Add URL** 클릭
2. URL 입력 후 **Save**

#### Google Cloud Console Redirect URIs
1. Google Cloud Console → **APIs & Services** → **Credentials**
2. OAuth 2.0 Client ID 클릭
3. **Authorized redirect URIs**에 다음이 있는지 확인:
   ```
   https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/callback
   ```

**없다면 추가:**
1. **+ ADD URI** 클릭
2. 위 URL 입력
3. **Save**

## 체크리스트

다음 항목을 모두 확인하세요:

- [ ] Supabase Dashboard에서 Google Provider가 **ON**으로 설정됨
- [ ] Supabase에 **Client ID (for OAuth)** 입력됨
- [ ] Supabase에 **Client Secret (for OAuth)** 입력됨
- [ ] Google Cloud Console에 OAuth 2.0 Client ID 생성됨
- [ ] Google Cloud Console에 Supabase 콜백 URL 등록됨: `https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/callback`
- [ ] Supabase에 웹사이트 Redirect URL 등록됨: `https://bizconnect-ten.vercel.app/auth/callback`

## 테스트

설정 완료 후:
1. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
2. https://bizconnect-ten.vercel.app 접속
3. 로그인 → 구글로 로그인 클릭
4. Google 계정 선택 및 권한 승인
5. 자동으로 대시보드로 이동하는지 확인

## 여전히 안 되면

1. **브라우저 콘솔 확인** (F12 → Console)
   - 에러 메시지 확인
   - 스크린샷 저장

2. **Supabase Logs 확인**
   - Supabase Dashboard → **Authentication** → **Logs**
   - 최근 인증 시도 확인
   - 에러 메시지 확인

3. **Google Cloud Console 확인**
   - OAuth 동의 화면이 설정되어 있는지 확인
   - 테스트 사용자로 본인 이메일 추가 (앱이 검증되지 않은 경우)










