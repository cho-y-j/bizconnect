# CORS 에러 이해하기

## 에러 메시지 분석

### 1. CORS Policy 에러
```
Access to fetch at 'https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/token' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**의미:**
- 브라우저가 `localhost:3000`에서 `supabase.co`로 요청을 보냈는데
- Supabase 서버가 "이 origin은 허용 안 함"이라고 응답
- 브라우저가 보안상 요청을 차단

### 2. Preflight Request 실패
```
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present
```

**의미:**
- 브라우저가 실제 요청 전에 **OPTIONS 요청**을 먼저 보냄 (preflight)
- 이 OPTIONS 요청에 대한 응답에 `Access-Control-Allow-Origin` 헤더가 없음
- 그래서 실제 요청(POST)을 보내지도 못함

### 3. Failed to fetch
```
Failed to load resource: net::ERR_FAILED
```

**의미:**
- 네트워크 요청 자체가 실패
- 서버에 도달하지 못했거나, 응답을 받지 못함

---

## 왜 발생하는가?

### 정상적인 경우
1. 브라우저: "localhost:3000에서 supabase.co로 요청 보내도 되나요?" (OPTIONS)
2. Supabase: "네, 됩니다!" (Access-Control-Allow-Origin: *)
3. 브라우저: "그럼 실제 요청 보낼게요" (POST)
4. Supabase: "OK" (로그인 성공)

### 현재 상황
1. 브라우저: "localhost:3000에서 supabase.co로 요청 보내도 되나요?" (OPTIONS)
2. Supabase: **응답 없음 또는 CORS 헤더 없음**
3. 브라우저: "안 되네요, 차단!" ❌
4. 실제 요청(POST)을 보내지도 못함

---

## 가능한 원인들

### 1. 네트워크 문제 (가장 가능성 높음)
- 인터넷 연결 불안정
- 방화벽/프록시가 OPTIONS 요청 차단
- VPN 문제

### 2. 브라우저 확장 프로그램
- CORS 관련 확장 프로그램
- AdBlock, Privacy Badger 등

### 3. Supabase 서버 일시적 문제
- Supabase 서버가 일시적으로 응답하지 않음
- 특정 지역에서 접근 제한

### 4. 브라우저 캐시 문제
- 이전 요청의 잘못된 캐시

---

## 해결 방법

### 방법 1: 네트워크 확인 (가장 중요)
```powershell
# Supabase 서버 연결 테스트
curl https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/health
```

### 방법 2: 시크릿 모드 테스트
- 확장 프로그램 영향 제거
- Ctrl+Shift+N (Chrome)

### 방법 3: 다른 네트워크에서 테스트
- 모바일 핫스팟 사용
- VPN 비활성화

### 방법 4: 브라우저 캐시 완전 삭제
- Ctrl+Shift+Delete
- "캐시된 이미지 및 파일" 삭제

---

## 실제로는...

**Supabase는 기본적으로 모든 origin을 허용합니다.**

따라서 이 에러는:
- ✅ 네트워크 문제일 가능성 높음
- ✅ 브라우저 확장 프로그램일 가능성 높음
- ❌ Supabase 설정 문제일 가능성 낮음

---

## 빠른 확인

1. **시크릿 모드에서 테스트** (가장 빠름)
2. **다른 브라우저에서 테스트** (Chrome → Firefox)
3. **네트워크 연결 확인** (다른 사이트 접속 테스트)

이 중 하나로 해결될 가능성이 높습니다!

