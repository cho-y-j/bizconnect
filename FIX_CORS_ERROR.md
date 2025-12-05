# CORS 에러 해결 가이드

## 문제
```
Access to fetch at 'https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/token' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

## 원인
환경 변수가 설정되지 않았거나, Supabase 클라이언트가 제대로 초기화되지 않았습니다.

## 해결 방법

### 1단계: 환경 변수 파일 생성

`web/.env.local` 파일을 생성하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hdeebyhwoogxawjkwufx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**API 키 확인 방법:**
1. Supabase Dashboard 접속
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/settings/api
2. **API Settings** 페이지에서:
   - `Project URL`: `https://hdeebyhwoogxawjkwufx.supabase.co`
   - `anon` `public` 키 복사
3. `.env.local` 파일에 붙여넣기

### 2단계: 개발 서버 재시작

환경 변수를 변경한 후에는 **반드시 개발 서버를 재시작**해야 합니다:

```powershell
# 현재 실행 중인 서버 중지 (Ctrl+C)
# 그 다음 다시 시작
cd web
npm run dev
```

### 3단계: Supabase CORS 설정 확인 (필요시)

Supabase는 기본적으로 모든 origin을 허용하지만, 문제가 계속되면:

1. **Supabase Dashboard > Settings > API**
2. **CORS 설정** 확인
3. 필요시 `http://localhost:3000` 추가

---

## 빠른 해결

1. `web/.env.local` 파일 생성
2. Supabase Dashboard에서 API 키 복사
3. 환경 변수에 붙여넣기
4. 개발 서버 재시작

---

## 확인 방법

브라우저 콘솔에서 확인:
```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

또는 `web/src/lib/supabaseClient.ts`에 임시로 추가:
```typescript
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
```

---

## 주의사항

- `.env.local` 파일은 **절대 Git에 커밋하지 마세요**
- `.gitignore`에 이미 포함되어 있어야 합니다
- 환경 변수는 **서버 재시작 후** 적용됩니다

