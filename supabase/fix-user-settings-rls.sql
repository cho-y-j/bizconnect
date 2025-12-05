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

-- 완료 메시지
SELECT 'user_settings RLS 정책이 수정되었습니다.' as status;

