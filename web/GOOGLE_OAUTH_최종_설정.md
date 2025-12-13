# 구글 로그인 최종 설정 가이드

## 🔍 현재 Supabase 설정 확인

스크린샷을 보니:
- ✅ Site URL: `http://localhost:3000` 설정됨
- ✅ Redirect URLs:
  - `http://localhost:3000/**` (와일드카드)
  - `https://bizconnect-ten.vercel.app/auth/callback`

## ⚠️ 문제점

`http://localhost:3000/**` 와일드카드가 있지만, Supabase가 루트(`/`)로 리다이렉트하고 있습니다.

## ✅ 해결 방법

### Option 1: 명시적인 URL 추가 (권장)

1. **Supabase Dashboard** → **인증** → **URL 구성**
2. **Redirect URLs** 섹션에서
3. **"Add URL"** 버튼 클릭
4. 다음 URL 추가: `http://localhost:3000/auth/callback`
5. **저장**

**이제 Redirect URLs 목록:**
- `http://localhost:3000/**` (와일드카드 - 유지)
- `http://localhost:3000/auth/callback` (명시적 - 새로 추가)
- `https://bizconnect-ten.vercel.app/auth/callback` (프로덕션)

### Option 2: 와일드카드 제거하고 명시적 URL만 사용

1. **Supabase Dashboard** → **인증** → **URL 구성**
2. **Redirect URLs** 섹션에서
3. `http://localhost:3000/**` 항목의 체크박스 클릭하여 선택
4. 삭제 버튼 클릭 (또는 우클릭 → 삭제)
5. **"Add URL"** 버튼 클릭
6. `http://localhost:3000/auth/callback` 추가
7. **저장**

## 🧪 테스트

설정 완료 후:
1. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
2. 로컬 서버 재시작
3. 구글 로그인 다시 시도
4. 다음 중 하나 확인:
   - `/auth/callback?code=...`로 리다이렉트됨 (성공)
   - 또는 루트(`/`)로 리다이렉트되지만 자동으로 `/auth/callback`으로 이동 (코드 수정으로 처리됨)

## 📝 현재 코드 동작

루트 페이지(`/`)에서 `code` 파라미터를 감지하면 자동으로 `/auth/callback?code=...`로 리다이렉트하도록 수정했습니다.

따라서:
- Supabase가 루트(`/`)로 리다이렉트해도
- 자동으로 `/auth/callback`으로 이동하여 로그인 처리

## ✅ 최종 확인

설정 후 다음을 확인:
- [ ] `http://localhost:3000/auth/callback`이 Redirect URLs에 등록됨
- [ ] 브라우저 캐시 삭제
- [ ] 로컬 서버 재시작
- [ ] 구글 로그인 테스트
- [ ] 대시보드로 자동 이동 확인

