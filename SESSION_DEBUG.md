# 세션 디버깅 가이드

## 문제
- `/admin` 접근 시 세션이 없다고 나옴 (`hasSession: false`)
- 로그인 후에도 세션이 유지되지 않음

## 확인 사항

### 1. 브라우저 개발자 도구에서 확인

#### Step 1: 로그인 후 localStorage 확인
1. 로그인 페이지에서 로그인
2. 개발자 도구(F12) > Application > Local Storage
3. `http://localhost:3000` 선택
4. 다음 키 확인:
   - `sb-{project-ref}-auth-token`
   - 또는 `supabase.auth.token`

#### Step 2: 세션 값 확인
- 키가 있으면 값이 JSON 형식인지 확인
- 값이 있으면 세션이 저장된 것

### 2. 콘솔에서 직접 확인

브라우저 콘솔에서 실행:

```javascript
// localStorage 확인
const keys = Object.keys(localStorage)
console.log('All localStorage keys:', keys)

// Supabase 관련 키 찾기
const supabaseKeys = keys.filter(k => k.includes('supabase') || k.includes('auth'))
console.log('Supabase keys:', supabaseKeys)

// 세션 직접 확인
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)
```

### 3. 로그인 후 확인

로그인 성공 후 콘솔에서 다음 로그 확인:
- `[Login Page] Login successful, session: ...`
- `[Login Page] Session verification: ...`
- `[Login Page] Admin check: ...`

---

## 해결 방법

### 방법 1: 완전 로그아웃 후 재로그인
1. 개발자 도구 > Application > Local Storage
2. 모든 키 삭제 (또는 `Clear site data`)
3. 쿠키도 삭제
4. 페이지 새로고침
5. 다시 로그인

### 방법 2: 시크릿 모드로 테스트
- 시크릿 모드에서 테스트하여 캐시 문제 제거

### 방법 3: 하드 리프레시
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

---

## 예상 원인

1. **세션 저장 실패**: localStorage에 쓰기 권한 없음
2. **도메인 불일치**: 다른 도메인에서 세션 저장 시도
3. **캐시 문제**: 오래된 세션 정보 사용
4. **Supabase 클라이언트 초기화 문제**: 여러 인스턴스 생성

---

**브라우저 콘솔에서 위의 JavaScript 코드를 실행한 결과를 알려주세요!**


