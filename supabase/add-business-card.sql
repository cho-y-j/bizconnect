-- 명함 정보 및 개인정보 상세 입력 기능 추가
-- AI가 사용자 정보를 더 잘 이해할 수 있도록 개인정보 상세 입력 지원

-- ============================================
-- 1. user_settings 테이블에 명함 정보 필드 추가
-- ============================================

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS business_card_enabled BOOLEAN DEFAULT false, -- 명함 자동 첨부 활성화
ADD COLUMN IF NOT EXISTS business_card_image_url TEXT, -- 명함 이미지 URL
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255), -- 전체 이름
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255), -- 회사명
ADD COLUMN IF NOT EXISTS position VARCHAR(100), -- 직책
ADD COLUMN IF NOT EXISTS department VARCHAR(100), -- 부서
ADD COLUMN IF NOT EXISTS email VARCHAR(255), -- 이메일
ADD COLUMN IF NOT EXISTS website VARCHAR(255), -- 웹사이트
ADD COLUMN IF NOT EXISTS address TEXT, -- 주소
ADD COLUMN IF NOT EXISTS bio TEXT, -- 자기소개/비즈니스 소개
ADD COLUMN IF NOT EXISTS specialties TEXT[], -- 전문 분야 (배열)
ADD COLUMN IF NOT EXISTS social_links JSONB, -- 소셜 링크 (예: {"linkedin": "...", "instagram": "..."})
ADD COLUMN IF NOT EXISTS profile_image_url TEXT; -- 프로필 이미지 URL

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_settings_business_card ON user_settings(user_id) WHERE business_card_enabled = true;

