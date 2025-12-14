# 구글 로그인 리다이렉트 문제 해결

## 🔍 문제

구글 로그인 후 `http://localhost:3000/?code=...`로 리다이렉트되고 있습니다.

## ✅ 해결 방법

### 1. Supabase Dashboard Redirect URL 설정 확인 (가장 중요!)

**Supabase Dashboard에서:**
1. https://supabase.com/dashboard 접속
2. 프로젝트: **bizconnedt** (hdeebyhwoogxawjkwufx)
3. 왼쪽 메뉴: **인증** 클릭
4. 상단 탭: **URL 구성** 클릭
5. **Redirect URLs** 섹션 확인

**다음 URL이 등록되어 있는지 확인:**
- `http://localhost:3000/auth/callback` (로컬 개발용)
- `https://bizconnect-ten.vercel.app/auth/callback` (프로덕션)

**없다면 추가:**
1. **"URL 추가"** 또는 **"Add URL"** 버튼 클릭
2. URL 입력: `http://localhost:3000/auth/callback`
3. **저장** 또는 **Save** 클릭

**⚠️ 중요:** 
- 루트(`/`)가 아닌 `/auth/callback`으로 등록해야 합니다
- 와일드카드(`*`)를 사용할 수 없으므로 정확한 URL을 입력해야 합니다

### 2. 코드 수정 완료

루트 페이지에서 `code` 파라미터를 감지하고 `/auth/callback`으로 리다이렉트하도록 수정했습니다.

### 3. 테스트

1. **Supabase Redirect URL 설정 확인/추가** (위 Step 1)
2. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
3. 로컬 서버 재시작
4. 구글 로그인 다시 시도
5. `/auth/callback?code=...`로 리다이렉트되는지 확인

## 🔄 여전히 안 되면

### Supabase Site URL 확인

1. Supabase Dashboard → **인증** → **URL 구성**
2. **Site URL** 확인:
   - 로컬 개발: `http://localhost:3000`
   - 프로덕션: `https://bizconnect-ten.vercel.app`

**Site URL이 잘못 설정되어 있으면:**
- 올바른 URL로 수정
- 저장

### 브라우저 콘솔 확인

1. F12 → Console 탭
2. 구글 로그인 버튼 클릭
3. 에러 메시지 확인
4. "OAuth code detected in root" 메시지가 나오는지 확인

## 📝 요약

**문제 원인:**
- Supabase Redirect URL에 `/auth/callback`이 등록되지 않았거나
- 루트(`/`)로 등록되어 있을 가능성

**해결:**
1. Supabase Dashboard → 인증 → URL 구성
2. Redirect URLs에 `http://localhost:3000/auth/callback` 추가
3. 저장
4. 다시 테스트




