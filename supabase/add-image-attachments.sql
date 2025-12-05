-- 이미지 첨부 기능 추가 마이그레이션
-- MMS 발송을 위한 이미지 첨부 지원

-- ============================================
-- 1. tasks 테이블에 이미지 필드 추가
-- ============================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS image_url TEXT, -- 이미지 URL (Supabase Storage)
ADD COLUMN IF NOT EXISTS image_name VARCHAR(255), -- 이미지 파일명
ADD COLUMN IF NOT EXISTS is_mms BOOLEAN DEFAULT false; -- MMS 여부

-- ============================================
-- 2. sms_logs 테이블에 이미지 필드 추가
-- ============================================

ALTER TABLE sms_logs
ADD COLUMN IF NOT EXISTS image_url TEXT, -- 발송된 이미지 URL
ADD COLUMN IF NOT EXISTS is_mms BOOLEAN DEFAULT false; -- MMS 여부

-- ============================================
-- 3. user_images 테이블 생성 (미리 저장된 이미지 관리)
-- ============================================

CREATE TABLE IF NOT EXISTS user_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- 이미지 이름 (예: "명함", "회사 로고")
    image_url TEXT NOT NULL, -- Supabase Storage URL
    category VARCHAR(50) DEFAULT 'general', -- 'business_card', 'logo', 'product', 'general'
    file_name VARCHAR(255), -- 원본 파일명
    file_size INTEGER, -- 파일 크기 (bytes)
    mime_type VARCHAR(100), -- image/jpeg, image/png 등
    is_favorite BOOLEAN DEFAULT false, -- 즐겨찾기
    usage_count INTEGER DEFAULT 0, -- 사용 횟수
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_image_name UNIQUE (user_id, name)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_images_user_id ON user_images(user_id);
CREATE INDEX IF NOT EXISTS idx_user_images_category ON user_images(category);
CREATE INDEX IF NOT EXISTS idx_user_images_favorite ON user_images(user_id, is_favorite) WHERE is_favorite = true;

-- RLS 정책
ALTER TABLE user_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own images" ON user_images;
CREATE POLICY "Users can view their own images"
    ON user_images FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own images" ON user_images;
CREATE POLICY "Users can insert their own images"
    ON user_images FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own images" ON user_images;
CREATE POLICY "Users can update their own images"
    ON user_images FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own images" ON user_images;
CREATE POLICY "Users can delete their own images"
    ON user_images FOR DELETE
    USING (auth.uid() = user_id);

-- 사용 횟수 업데이트 함수
CREATE OR REPLACE FUNCTION increment_image_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.image_url IS NOT NULL THEN
        UPDATE user_images
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE image_url = NEW.image_url AND user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- tasks에 이미지 사용 시 자동으로 usage_count 증가
DROP TRIGGER IF EXISTS on_task_created_increment_image_usage ON tasks;
CREATE TRIGGER on_task_created_increment_image_usage
    AFTER INSERT ON tasks
    FOR EACH ROW
    WHEN (NEW.image_url IS NOT NULL)
    EXECUTE FUNCTION increment_image_usage();

-- 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE user_images;

