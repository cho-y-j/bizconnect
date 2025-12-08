-- user_settings 테이블에 3가지 콜백 옵션별 이미지 컬럼 추가
-- 실행일: 2025-12-09

-- 1. 기존 컬럼이 없으면 추가 (3가지 콜백 옵션)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS auto_callback_enabled BOOLEAN DEFAULT true;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS callback_on_end_enabled BOOLEAN DEFAULT true;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS callback_on_end_message TEXT DEFAULT '안녕하세요, 방금 통화 감사합니다. 궁금하신 점 있으시면 편하게 연락주세요.';

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS callback_on_end_image_url TEXT DEFAULT NULL;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS callback_on_missed_enabled BOOLEAN DEFAULT true;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS callback_on_missed_message TEXT DEFAULT '안녕하세요, 전화를 받지 못해 죄송합니다. 확인 후 다시 연락드리겠습니다.';

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS callback_on_missed_image_url TEXT DEFAULT NULL;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS callback_on_busy_enabled BOOLEAN DEFAULT true;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS callback_on_busy_message TEXT DEFAULT '안녕하세요, 통화중이라 받지 못했습니다. 잠시 후 연락드리겠습니다.';

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS callback_on_busy_image_url TEXT DEFAULT NULL;

-- 2. 기본 명함 이미지 (모든 옵션에 공통 적용되는 기본값)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS business_card_enabled BOOLEAN DEFAULT false;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS business_card_image_url TEXT DEFAULT NULL;

-- 3. 컬럼 설명 코멘트 추가
COMMENT ON COLUMN user_settings.auto_callback_enabled IS '콜백 전체 ON/OFF';
COMMENT ON COLUMN user_settings.callback_on_end_enabled IS '통화종료 콜백 ON/OFF';
COMMENT ON COLUMN user_settings.callback_on_end_message IS '통화종료 메시지 템플릿';
COMMENT ON COLUMN user_settings.callback_on_end_image_url IS '통화종료 전용 이미지 URL';
COMMENT ON COLUMN user_settings.callback_on_missed_enabled IS '부재중 콜백 ON/OFF';
COMMENT ON COLUMN user_settings.callback_on_missed_message IS '부재중 메시지 템플릿';
COMMENT ON COLUMN user_settings.callback_on_missed_image_url IS '부재중 전용 이미지 URL';
COMMENT ON COLUMN user_settings.callback_on_busy_enabled IS '통화중 콜백 ON/OFF';
COMMENT ON COLUMN user_settings.callback_on_busy_message IS '통화중 메시지 템플릿';
COMMENT ON COLUMN user_settings.callback_on_busy_image_url IS '통화중 전용 이미지 URL';
COMMENT ON COLUMN user_settings.business_card_enabled IS '기본 명함 이미지 사용 ON/OFF';
COMMENT ON COLUMN user_settings.business_card_image_url IS '기본 명함 이미지 URL (개별 설정 없을 때 사용)';

-- 4. 알림 설정 컬럼 추가
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS birthday_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS anniversary_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS task_notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notification_time TIME DEFAULT '09:00:00';

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS birthday_reminder_days INTEGER DEFAULT 1;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS anniversary_reminder_days INTEGER DEFAULT 1;

-- 5. 알림 컬럼 코멘트
COMMENT ON COLUMN user_settings.push_notifications_enabled IS '푸시 알림 전체 ON/OFF';
COMMENT ON COLUMN user_settings.birthday_notifications_enabled IS '생일 알림 ON/OFF';
COMMENT ON COLUMN user_settings.anniversary_notifications_enabled IS '기념일 알림 ON/OFF';
COMMENT ON COLUMN user_settings.task_notifications_enabled IS '작업 완료 알림 ON/OFF';
COMMENT ON COLUMN user_settings.notification_time IS '알림 시간 (HH:MM:SS)';
COMMENT ON COLUMN user_settings.birthday_reminder_days IS '생일 알림 D-일 (0=당일, 1=1일전 등)';
COMMENT ON COLUMN user_settings.anniversary_reminder_days IS '기념일 알림 D-일';

-- 이미지 우선순위 로직:
-- 1. 각 옵션별 개별 이미지가 있으면 그것 사용 (callback_on_xxx_image_url)
-- 2. 개별 이미지 없고 business_card_enabled=true면 기본 명함 사용 (business_card_image_url)
-- 3. 둘 다 없으면 이미지 없이 SMS로 발송
