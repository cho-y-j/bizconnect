-- user_settings 테이블에 전화번호 컬럼 추가
-- 관리자가 전체 이용자를 관리할 때 필요한 정보
-- 실행일: 2025-01-27

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;

COMMENT ON COLUMN user_settings.phone IS '사용자 전화번호 (관리자용)';











