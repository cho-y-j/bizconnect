# Database error saving new user 해결 방법

## 문제
에러: `Database error saving new user`

이 에러는 사용자 생성 시 `user_settings` 테이블에 기본 레코드를 생성하는 트리거에서 발생할 수 있습니다.

## 해결 방법

### 방법 1: 트리거 수정 (권장)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/sql/new

2. **수정된 SQL 실행**
   - `supabase/fix-user-settings-trigger.sql` 파일 내용을 복사
   - SQL Editor에 붙여넣기
   - **Run** 버튼 클릭

3. **확인**
   - "user_settings 트리거 수정 완료!" 메시지 확인

### 방법 2: 트리거 임시 비활성화 (테스트용)

트리거를 임시로 비활성화하여 문제를 확인:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

**주의:** 이렇게 하면 회원가입은 되지만 `user_settings`가 자동 생성되지 않습니다.

### 방법 3: 수동으로 user_settings 생성

트리거 없이 회원가입 후 수동으로 생성:

```sql
-- 회원가입 후 이 SQL 실행
INSERT INTO user_settings (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;
```

## 원인 분석

가능한 원인:
1. **권한 문제**: 트리거 함수가 `user_settings` 테이블에 INSERT할 권한이 없음
2. **RLS 정책**: `user_settings` 테이블의 RLS 정책이 트리거 실행을 막음
3. **함수 오류**: 트리거 함수 내부에서 예외 발생

## 확인 사항

수정 후 다음을 확인하세요:

1. **회원가입 테스트**
   - 새 계정으로 회원가입 시도
   - 에러가 사라졌는지 확인

2. **user_settings 확인**
   - Supabase Dashboard > Table Editor > user_settings
   - 새 사용자의 레코드가 자동 생성되었는지 확인

3. **로그 확인**
   - Supabase Dashboard > Logs > Postgres Logs
   - 에러 메시지 확인

## 완료 후

트리거가 정상 작동하면:
- ✅ 회원가입 성공
- ✅ `user_settings` 자동 생성
- ✅ 대시보드 접근 가능

