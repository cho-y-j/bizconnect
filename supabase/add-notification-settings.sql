-- 알림 설정 기능 추가
-- 푸시 알림 및 알림 시간 설정 지원

-- ============================================
-- 1. user_settings 테이블에 알림 설정 필드 추가
-- ============================================

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true, -- 푸시 알림 활성화
ADD COLUMN IF NOT EXISTS birthday_notifications_enabled BOOLEAN DEFAULT true, -- 생일 알림 활성화
ADD COLUMN IF NOT EXISTS anniversary_notifications_enabled BOOLEAN DEFAULT true, -- 기념일 알림 활성화
ADD COLUMN IF NOT EXISTS task_notifications_enabled BOOLEAN DEFAULT true, -- 작업 완료 알림 활성화
ADD COLUMN IF NOT EXISTS notification_time TIME DEFAULT '09:00:00', -- 알림 시간 (기본 오전 9시)
ADD COLUMN IF NOT EXISTS birthday_reminder_days INTEGER DEFAULT 1, -- 생일 알림 D-일 (기본 D-1)
ADD COLUMN IF NOT EXISTS anniversary_reminder_days INTEGER DEFAULT 1; -- 기념일 알림 D-일 (기본 D-1)

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_settings_notifications ON user_settings(user_id) 
WHERE push_notifications_enabled = true;

