# 이메일 확인 문제 해결 가이드

## 현재 문제
"Email not confirmed" 에러가 발생하고 있습니다.

## 해결 방법

### 방법 1: Supabase Dashboard에서 이메일 확인 비활성화 (권장)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/auth/providers

2. **Email Provider 설정**
   - Authentication > Providers > Email 클릭
   - **"Confirm email" 토글을 OFF**로 변경
   - **"Secure email change" 토글도 OFF**로 변경 (선택)
   - **Save** 클릭

3. **확인**
   - 설정이 저장되었는지 확인
   - 페이지를 새로고침하여 설정이 유지되는지 확인

---

### 방법 2: 기존 사용자 이메일 수동 확인

이미 가입한 사용자의 이메일을 수동으로 확인해야 합니다.

#### A. 개별 사용자 확인

1. **Authentication > Users** 접속
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/auth/users

2. **사용자 목록에서 확인**
   - 가입한 이메일 주소 찾기
   - 사용자 클릭
   - **"Confirm email" 버튼 클릭** 또는 **"Auto Confirm User" 토글 활성화**

#### B. 모든 사용자 일괄 확인 (SQL 사용)

1. **SQL Editor 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/sql/new

2. **다음 SQL 실행**:
   ```sql
   -- 모든 사용자의 이메일 확인 상태를 true로 변경
   UPDATE auth.users
   SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
   WHERE email_confirmed_at IS NULL;
   
   -- 확인
   SELECT 
     id,
     email,
     email_confirmed_at,
     created_at
   FROM auth.users
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Run 버튼 클릭**

---

### 방법 3: 새 사용자로 테스트

기존 사용자 대신 새 이메일 주소로 회원가입을 시도해보세요.

1. **회원가입 페이지에서 새 이메일 사용**
2. **비밀번호 입력**
3. **회원가입 클릭**

이메일 확인이 비활성화되어 있다면 즉시 로그인되어야 합니다.

---

## 체크리스트

- [ ] Supabase Dashboard에서 "Confirm email" OFF 확인
- [ ] 기존 사용자 이메일 수동 확인 (방법 2-A)
- [ ] 또는 모든 사용자 일괄 확인 (방법 2-B SQL 실행)
- [ ] 브라우저 캐시 클리어 (Ctrl+Shift+Delete)
- [ ] 로그인 다시 시도
- [ ] 또는 새 이메일로 회원가입 테스트

---

## 빠른 해결 (SQL 실행)

가장 빠른 방법은 SQL로 모든 사용자를 확인하는 것입니다:

1. **SQL Editor 열기**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/sql/new

2. **다음 SQL 복사하여 실행**:
   ```sql
   UPDATE auth.users
   SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
   WHERE email_confirmed_at IS NULL;
   ```

3. **Run 클릭**

이제 로그인이 가능해야 합니다! 🎉

