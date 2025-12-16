# 이메일 확인 문제 해결 가이드

## 문제
일반 회원가입으로 가입한 사용자들이 "Email not confirmed" 오류로 로그인할 수 없습니다.

## 해결 방법

### 방법 1: Supabase Dashboard에서 이메일 확인 비활성화 (권장)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard 접속
   - 프로젝트 선택: **bizconnedt** (hdeebyhwoogxawjkwufx)

2. **인증 설정 변경**
   - 왼쪽 메뉴: **인증** 클릭
   - 상단 탭: **제공업체** 클릭
   - **이메일** 제공업체 찾기
   - **"이메일 확인 필요"** 또는 **"Confirm email"** 옵션을 **비활성화**

3. **저장**
   - 변경사항 저장

### 방법 2: 관리자 페이지에서 모든 사용자 이메일 확인

관리자 페이지에서 모든 미확인 사용자의 이메일을 일괄 확인할 수 있습니다.

1. **관리자 페이지 접속**
   - `/admin/users` 페이지 접속

2. **이메일 확인 버튼 클릭**
   - "모든 미확인 사용자 이메일 확인" 버튼 클릭
   - 또는 개별 사용자 상세 페이지에서 "이메일 확인" 버튼 클릭

### 방법 3: SQL로 직접 확인 (고급)

Supabase Dashboard > SQL Editor에서 다음 SQL 실행:

```sql
-- 모든 사용자의 이메일 확인 상태를 true로 변경
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;
```

## 확인

1. **회원가입 테스트**
   - 새 이메일로 회원가입
   - 이메일 확인 없이 즉시 로그인 가능한지 확인

2. **기존 사용자 확인**
   - `/admin/users` 페이지에서 모든 사용자의 이메일 확인 상태 확인
   - `email_confirmed: true`로 표시되는지 확인

## API 엔드포인트

### 개별 사용자 이메일 확인
```
POST /api/admin/confirm-email
Body: { "userId": "user-id-here" }
```

### 모든 미확인 사용자 이메일 확인
```
PUT /api/admin/confirm-email
```

## 참고

- 이메일 확인을 비활성화하면 보안이 약간 낮아질 수 있습니다.
- 프로덕션 환경에서는 이메일 확인을 활성화하는 것을 권장합니다.
- 하지만 개발/테스트 환경에서는 비활성화해도 무방합니다.

