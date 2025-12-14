# 관리자 권한 디버깅 가이드

## 문제 상황
- `/admin` 접근 시 로그인 화면으로 리다이렉트
- 로그인 후에도 일반 사용자로 인식

## 해결 방법

### 1. RLS 정책 확인 완료 ✅
- `admin_users` 테이블에 "Users can view their own admin status" 정책 추가됨
- 사용자가 자신의 관리자 정보를 조회할 수 있도록 설정됨

### 2. 디버깅 로그 추가 ✅
- `isAdmin()` 함수에 상세 로그 추가
- `admin/layout.tsx`에 디버깅 로그 추가

### 3. 테스트 단계

#### Step 1: 개발 서버 재시작
```bash
cd web
npm run dev
```

#### Step 2: 브라우저에서 테스트
1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭 선택
3. 완전히 로그아웃 (쿠키/로컬스토리지 클리어)
4. `pcon1613@gmail.com`으로 로그인
5. `/admin` 접근
6. 콘솔에서 다음 로그 확인:
   - `[Admin Layout] Current user: ...`
   - `[Admin Check] Checking admin status for user: ...`
   - `[Admin Check] Admin record found: ...`

#### Step 3: 문제 확인
콘솔에서 다음을 확인하세요:

**정상적인 경우:**
```
[Admin Layout] Current user: {id: "4c9ca0f5-...", email: "pcon1613@gmail.com"}
[Admin Check] Checking admin status for user: 4c9ca0f5-e8ab-4ee1-a5b5-eabbd7f9d6ce
[Admin Check] Admin record found: {id: "...", role: "super_admin"}
[Admin Layout] Admin status: true
[Admin Layout] Admin info: {id: "...", role: "super_admin", ...}
```

**문제가 있는 경우:**
- `[Admin Check] Error: ...` - RLS 정책 문제 또는 쿼리 오류
- `[Admin Check] No admin record found` - admin_users 테이블에 레코드 없음
- `[Admin Layout] Not admin, redirecting to dashboard` - 권한 없음

### 4. 수동 확인

Supabase Dashboard > SQL Editor에서 실행:

```sql
-- 사용자 ID 확인
SELECT id, email FROM auth.users WHERE email = 'pcon1613@gmail.com';

-- 관리자 권한 확인
SELECT 
  au.id,
  au.user_id,
  au.role,
  u.email
FROM admin_users au
LEFT JOIN auth.users u ON u.id = au.user_id
WHERE au.user_id = '4c9ca0f5-e8ab-4ee1-a5b5-eabbd7f9d6ce';
```

### 5. 추가 확인 사항

#### 세션 확인
브라우저 콘솔에서:
```javascript
// Supabase 세션 확인
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)
console.log('User ID:', session?.user?.id)
```

#### 직접 권한 확인
브라우저 콘솔에서:
```javascript
// 관리자 권한 직접 확인
const { data, error } = await supabase
  .from('admin_users')
  .select('*')
  .eq('user_id', '4c9ca0f5-e8ab-4ee1-a5b5-eabbd7f9d6ce')
  .single()

console.log('Admin data:', data)
console.log('Error:', error)
```

---

## 예상 원인

1. **세션 문제**: 로그인 후 세션이 제대로 저장되지 않음
2. **RLS 정책 충돌**: 여러 정책이 충돌하여 접근 차단
3. **캐시 문제**: 브라우저 캐시 또는 Next.js 캐시

---

## 해결 방법

### 방법 1: 완전 로그아웃 후 재로그인
1. 브라우저에서 완전히 로그아웃
2. 개발자 도구 > Application > Local Storage 클리어
3. 쿠키 삭제
4. 다시 로그인

### 방법 2: 하드 리프레시
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### 방법 3: 개발 서버 재시작
```bash
# 서버 중지 후 재시작
cd web
npm run dev
```

---

**콘솔 로그를 확인한 후 결과를 알려주세요!**


