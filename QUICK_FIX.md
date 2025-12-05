# 빠른 해결 방법

## 문제
이메일 확인을 OFF로 하면 회원가입이 안 됨

## 해결 방법

### 1단계: 트리거 비활성화 (즉시 실행)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/sql/new

2. **트리거 비활성화 SQL 실행**
   - `supabase/disable-trigger-temp.sql` 파일 내용이 클립보드에 복사되어 있습니다
   - SQL Editor에 붙여넣기 (Ctrl+V)
   - **Run** 버튼 클릭

3. **확인**
   - "트리거가 비활성화되었습니다" 메시지 확인

### 2단계: 이메일 확인 설정

1. **Authentication > Providers > Email**
2. **"Confirm email" 토글을 OFF로 설정**
3. **Save** 클릭

### 3단계: 테스트

1. **회원가입 시도**
2. **즉시 로그인 시도**

---

## 코드 수정 완료

- ✅ 회원가입 성공 시 `user_settings` 자동 생성 로직 추가
- ✅ 트리거가 없어도 작동하도록 개선

---

## 나중에 트리거 다시 활성화

트리거를 다시 활성화하려면:
- `supabase/fix-user-settings-trigger.sql` 실행

