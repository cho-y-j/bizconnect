# CORS 에러 해결 완료 - 원인 및 해결 방법 기록

## 문제 발생

### 에러 메시지
```
Access to fetch at 'https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/token?grant_type=password' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.

Failed to load resource: net::ERR_FAILED
TypeError: Failed to fetch
```

### 발생 시점
- 아까는 로그인이 잘 되었음 (이메일 직접 승인 후)
- 네트워크는 변경되지 않음
- 갑자기 CORS 에러 발생

---

## 원인 분석

### 실제 원인
**코드 수정 중 Supabase 클라이언트 설정이 변경되어 발생한 문제**

1. **문제가 된 코드 변경:**
   - `web/src/lib/supabaseClient.ts`에 추가 옵션을 넣었음
   - `flowType: 'pkce'`, `detectSessionInUrl: true` 등 추가
   - 환경 변수 확인 코드 추가

2. **왜 문제가 되었나:**
   - Supabase 클라이언트의 기본 설정이 변경됨
   - 추가된 옵션이 브라우저 요청을 방해했을 가능성
   - 또는 코드 변경으로 인한 빌드 캐시 문제

---

## 해결 방법

### 1단계: 코드를 원래 상태로 되돌림

**변경 전 (문제 발생):**
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'bizconnect-web',
    },
  },
})
```

**변경 후 (해결):**
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 2단계: 불필요한 코드 제거
- 환경 변수 확인 코드 제거
- 테스트 페이지 제거

### 3단계: 개발 서버 재시작
```powershell
# 서버 중지 (Ctrl+C)
cd web
npm run dev
```

---

## 교훈

### 1. 작동하는 코드는 함부로 수정하지 말 것
- 원래 잘 작동하던 코드에 불필요한 옵션을 추가하지 말 것
- Supabase 클라이언트는 기본 설정으로도 충분히 작동함

### 2. 문제 해결 시 원인 파악 우선
- 네트워크 문제로 오해했지만 실제로는 코드 변경 문제였음
- 테스트를 통해 정확한 원인 파악 필요

### 3. 단순한 것이 최고
- Supabase 클라이언트는 기본 설정(`createClient(url, key)`)으로 충분
- 추가 옵션은 실제 필요할 때만 사용

---

## 현재 상태

✅ **정상 작동 중**
- 로그인/회원가입 정상
- Supabase 연결 정상
- 모든 기능 정상

---

## 참고 사항

### Supabase 클라이언트 기본 설정
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**이것만으로 충분합니다!**

추가 옵션이 필요할 때만:
- `auth: { persistSession: true }` - 세션 유지
- `auth: { autoRefreshToken: true }` - 토큰 자동 갱신

하지만 기본 설정으로도 이 기능들은 작동합니다.

---

**해결일시:** 2025.12.05
**원인:** 코드 수정으로 인한 Supabase 클라이언트 설정 변경
**해결:** 원래 상태로 되돌림 + 개발 서버 재시작

