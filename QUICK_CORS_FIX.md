# CORS 에러 빠른 해결

## 현재 상황
`.env.local` 파일은 존재하지만 CORS 에러가 발생하고 있습니다.

## 해결 방법

### 1단계: 환경 변수 확인

브라우저에서 다음 URL 접속:
```
http://localhost:3000/api/check-env
```

환경 변수가 제대로 설정되어 있는지 확인하세요.

### 2단계: 개발 서버 재시작 (필수!)

환경 변수를 변경했거나 처음 설정했다면 **반드시 재시작**:

```powershell
# 1. 현재 서버 중지 (Ctrl+C)
# 2. 다시 시작
cd web
npm run dev
```

### 3단계: .env.local 파일 내용 확인

`web/.env.local` 파일을 열어서 다음 형식인지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hdeebyhwoogxawjkwufx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**주의사항:**
- `NEXT_PUBLIC_` 접두사 필수
- 따옴표 없이 값만 입력
- 공백 없이 입력

### 4단계: Supabase API 키 확인

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/settings/api

2. **API Settings**에서:
   - `Project URL` 복사 → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` 키 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **`.env.local` 파일에 붙여넣기**

### 5단계: 브라우저 캐시 클리어

1. 브라우저 개발자 도구 열기 (F12)
2. Network 탭에서 "Disable cache" 체크
3. 페이지 새로고침 (Ctrl+Shift+R)

---

## 여전히 안 되면

### Supabase CORS 설정 확인

Supabase는 기본적으로 모든 origin을 허용하지만, 확인해보세요:

1. **Supabase Dashboard > Settings > API**
2. **CORS 설정** 확인
3. 필요시 `http://localhost:3000` 추가

### 대안: Supabase 클라이언트 옵션 확인

`web/src/lib/supabaseClient.ts` 파일이 올바르게 설정되어 있는지 확인하세요.

---

## 체크리스트

- [ ] `.env.local` 파일 존재 확인
- [ ] 환경 변수 형식 확인 (`NEXT_PUBLIC_` 접두사)
- [ ] Supabase Dashboard에서 API 키 복사
- [ ] 개발 서버 재시작
- [ ] 브라우저 캐시 클리어
- [ ] `/api/check-env`로 환경 변수 확인

---

## 빠른 테스트

터미널에서:
```powershell
cd web
# 환경 변수 확인 (PowerShell)
Get-Content .env.local
```

값이 올바르게 설정되어 있는지 확인하세요!

