# CORS 에러 즉시 해결 방법

## 현재 상황
환경 변수는 정상이지만 CORS 에러가 발생하고 있습니다.

## 해결 방법 (순서대로 시도)

### 방법 1: Supabase Dashboard에서 CORS 설정 확인 ⭐ (가장 가능성 높음)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/settings/api

2. **CORS 설정 확인**
   - "Allowed Origins" 또는 "CORS" 섹션 확인
   - `http://localhost:3000` 추가 (없는 경우)
   - 또는 `*` (모든 origin 허용) 설정

3. **저장 후 재시도**

---

### 방법 2: 브라우저 캐시 및 확장 프로그램 확인

1. **시크릿 모드에서 테스트**
   - Ctrl+Shift+N (Chrome) 또는 Ctrl+Shift+P (Firefox)
   - 로그인 시도

2. **확장 프로그램 비활성화**
   - CORS 관련 확장 프로그램이 있는지 확인
   - AdBlock, Privacy Badger 등

3. **브라우저 캐시 완전 삭제**
   - Ctrl+Shift+Delete
   - "캐시된 이미지 및 파일" 선택
   - "전체 기간" 선택
   - 삭제

---

### 방법 3: 개발 서버 완전 재시작

```powershell
# 1. 서버 완전 중지 (Ctrl+C)
# 2. 프로세스 확인
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# 3. 포트 확인 (3000번 포트 사용 중인지)
netstat -ano | findstr :3000

# 4. 필요시 프로세스 종료
# 5. 다시 시작
cd web
npm run dev
```

---

### 방법 4: Supabase 프로젝트 재확인

1. **Supabase Dashboard > Settings > General**
   - 프로젝트 상태 확인
   - 일시 중지되었는지 확인

2. **Supabase Dashboard > Settings > API**
   - API 키가 활성화되어 있는지 확인
   - Rate Limiting 설정 확인

---

### 방법 5: 네트워크 확인

1. **다른 네트워크에서 테스트**
   - 모바일 핫스팟 사용
   - VPN 비활성화

2. **방화벽 확인**
   - Windows 방화벽 설정
   - 회사/학교 네트워크 정책

---

### 방법 6: Supabase 클라이언트 옵션 확인

이미 `web/src/lib/supabaseClient.ts`에 PKCE 플로우를 추가했습니다.
서버를 재시작하고 다시 시도하세요.

---

## 빠른 체크리스트

- [ ] Supabase Dashboard에서 CORS 설정 확인
- [ ] `http://localhost:3000` 추가 (또는 `*` 허용)
- [ ] 시크릿 모드에서 테스트
- [ ] 브라우저 확장 프로그램 비활성화
- [ ] 개발 서버 완전 재시작
- [ ] 브라우저 캐시 삭제

---

## 여전히 안 되면

### 임시 해결책: API Route를 통한 프록시

Supabase 요청을 Next.js API Route로 프록시하는 방법도 있지만,
일반적으로 Supabase Dashboard에서 CORS 설정을 수정하는 것이 가장 간단합니다.

---

## 가장 가능성 높은 원인

**Supabase Dashboard의 CORS 설정**이 `localhost:3000`을 허용하지 않고 있을 가능성이 높습니다.

1. Supabase Dashboard 접속
2. Settings > API
3. CORS 설정 확인 및 수정

이것만으로도 해결될 가능성이 높습니다!

