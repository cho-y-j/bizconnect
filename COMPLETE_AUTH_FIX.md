# 회원가입/로그인 완전 수정 가이드

## 발견된 문제들

1. ❌ **이메일 유효성 검사**: `test1@test.com`, `test1@naver.com` 모두 "invalid" 에러
2. ❌ **이메일 확인 필요**: "Email not confirmed" 에러
3. ❌ **RLS 정책 문제**: `user_settings` 자동 생성 실패
4. ❌ **세션 문제**: 회원가입 후 대시보드로 이동 안됨

---

## 해결 방법

### 1단계: Supabase Dashboard 설정 (필수)

#### A. 이메일 확인 비활성화

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/auth/providers

2. **Email Provider 설정**
   - Authentication > Providers > Email 클릭
   - **"Confirm email" 토글을 OFF**로 변경
   - Save 클릭

#### B. 이메일 도메인 제한 확인

1. **Authentication > Providers > Email**
2. **"Allowed email domains"** 확인
   - 비어있으면 모든 도메인 허용 ✅
   - 특정 도메인만 있으면 제거하거나 `naver.com`, `gmail.com` 등 추가

#### C. 기존 사용자 이메일 확인 (이미 가입한 경우)

1. **Authentication > Users**
2. 가입한 사용자 클릭
3. **"Confirm email" 버튼 클릭** (또는 "Auto Confirm User" 활성화)

---

### 2단계: RLS 정책 수정 (필수)

`user_settings` 테이블의 RLS 정책이 회원가입 시 자동 생성을 막고 있습니다.

#### SQL 실행

1. **Supabase Dashboard > SQL Editor**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/sql/new

2. **다음 SQL 실행**:
   ```sql
   -- user_settings 테이블 RLS 정책 수정
   -- 회원가입 시 자신의 user_settings를 생성할 수 있도록 허용
   
   -- 기존 정책 삭제
   DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
   DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
   DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
   
   -- 새 정책 생성 (더 관대한 정책)
   -- 1. 자신의 설정 조회 가능
   CREATE POLICY "Users can view own settings"
   ON user_settings
   FOR SELECT
   USING (auth.uid() = user_id);
   
   -- 2. 자신의 설정 수정 가능
   CREATE POLICY "Users can update own settings"
   ON user_settings
   FOR UPDATE
   USING (auth.uid() = user_id);
   
   -- 3. 자신의 설정 생성 가능 (회원가입 시)
   CREATE POLICY "Users can insert own settings"
   ON user_settings
   FOR INSERT
   WITH CHECK (auth.uid() = user_id);
   ```

3. **Run 버튼 클릭**

또는 `supabase/fix-user-settings-rls.sql` 파일 내용을 복사하여 실행하세요.

---

### 3단계: 코드 수정

회원가입 후 세션 확인 로직을 개선합니다.

#### 수정된 `web/src/lib/auth.ts`

회원가입 후 세션을 명시적으로 확인하도록 수정:

```typescript
export async function signUpWithEmail(email: string, password: string, name?: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      }
    })
    
    if (error) {
      console.error('Supabase signup error:', error)
      return { data, error }
    }
    
    // 회원가입 성공 시 user_settings 자동 생성
    if (data?.user && !error) {
      try {
        const { error: settingsError } = await supabase
          .from('user_settings')
          .insert([{ user_id: data.user.id }])
          .select()
        
        if (settingsError) {
          console.warn('user_settings 자동 생성 실패:', settingsError)
          // 에러를 던지지 않음 - 회원가입은 성공한 것으로 처리
        }
      } catch (settingsErr) {
        console.warn('user_settings 생성 중 오류:', settingsErr)
      }
    }
    
    // 세션 확인 (이메일 확인이 비활성화된 경우 즉시 세션 생성됨)
    if (data?.user && !data.session) {
      // 세션이 없으면 잠시 대기 후 다시 확인
      await new Promise(resolve => setTimeout(resolve, 500))
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        data.session = session
      }
    }
    
    return { data, error }
  } catch (err) {
    console.error('Signup exception:', err)
    return { 
      data: null, 
      error: { 
        message: err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.' 
      } 
    }
  }
}
```

---

### 4단계: 테스트

1. **브라우저 캐시 클리어** (Ctrl+Shift+Delete)
2. **개발 서버 재시작**:
   ```powershell
   # Ctrl+C로 중지 후
   cd web
   npm run dev
   ```
3. **회원가입 테스트**:
   - 실제 이메일 주소 사용 (Gmail, 네이버 등)
   - 비밀번호 8자 이상
   - 회원가입 클릭
4. **확인 사항**:
   - ✅ 에러 없이 회원가입 성공
   - ✅ 대시보드로 자동 이동
   - ✅ 로그아웃 후 로그인 가능

---

## 체크리스트

- [ ] Supabase Dashboard에서 "Confirm email" OFF
- [ ] "Allowed email domains" 확인 (비어있거나 허용 도메인 추가)
- [ ] 기존 사용자 이메일 확인 (이미 가입한 경우)
- [ ] RLS 정책 수정 SQL 실행
- [ ] 코드 수정 (세션 확인 로직)
- [ ] 브라우저 캐시 클리어
- [ ] 개발 서버 재시작
- [ ] 회원가입 테스트
- [ ] 로그인 테스트

---

## 문제가 계속되면

1. **브라우저 콘솔 확인** (F12)
2. **에러 메시지 복사**
3. **Supabase Dashboard > Authentication > Users**에서 사용자 확인
4. **Supabase Dashboard > Table Editor > user_settings**에서 레코드 확인

