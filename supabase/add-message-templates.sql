-- 문자 템플릿 기능 추가 마이그레이션
-- 자주 쓰는 메시지를 템플릿으로 저장하고 재사용할 수 있습니다.

-- ============================================
-- 1. message_templates 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- 템플릿 이름 (예: "생일 축하", "인사말")
    content TEXT NOT NULL, -- 템플릿 내용 (변수 포함 가능)
    category VARCHAR(50) DEFAULT 'general', -- 'general', 'birthday', 'anniversary', 'greeting', 'notice', 'promotion'
    variables TEXT[], -- 사용 가능한 변수 목록 (예: ['{고객명}', '{날짜}'])
    usage_count INTEGER DEFAULT 0, -- 사용 횟수
    is_favorite BOOLEAN DEFAULT false, -- 즐겨찾기
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_template_name UNIQUE (user_id, name)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_message_templates_user_id ON message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_favorite ON message_templates(user_id, is_favorite) WHERE is_favorite = true;

-- RLS 정책
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own templates" ON message_templates;
CREATE POLICY "Users can view their own templates"
    ON message_templates FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own templates" ON message_templates;
CREATE POLICY "Users can insert their own templates"
    ON message_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own templates" ON message_templates;
CREATE POLICY "Users can update their own templates"
    ON message_templates FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own templates" ON message_templates;
CREATE POLICY "Users can delete their own templates"
    ON message_templates FOR DELETE
    USING (auth.uid() = user_id);

-- 사용 횟수 업데이트 함수
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE message_templates
    SET usage_count = usage_count + 1
    WHERE id = NEW.template_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- tasks 테이블에 template_id 추가 (선택사항)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL;

-- 템플릿 사용 시 자동으로 usage_count 증가하는 트리거 (선택사항)
-- DROP TRIGGER IF EXISTS on_task_created_increment_template_usage ON tasks;
-- CREATE TRIGGER on_task_created_increment_template_usage
--     AFTER INSERT ON tasks
--     FOR EACH ROW
--     WHEN (NEW.template_id IS NOT NULL)
--     EXECUTE FUNCTION increment_template_usage();

-- 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE message_templates;

