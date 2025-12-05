-- AI 비서 기능을 위한 데이터베이스 스키마 추가

-- ============================================
-- 1. 대화 요약 메모 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    summary TEXT NOT NULL, -- AI가 생성한 요약 내용
    key_points TEXT[], -- 주요 포인트 배열
    promises TEXT[], -- 약속된 사항들
    next_actions TEXT[], -- 다음 액션 아이템
    sentiment VARCHAR(20) DEFAULT 'neutral', -- 'positive', 'neutral', 'negative'
    conversation_count INTEGER DEFAULT 0, -- 분석한 대화 건수
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_customer_summary UNIQUE (user_id, customer_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_customer_id ON conversation_summaries(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_updated_at ON conversation_summaries(updated_at DESC);

-- RLS 정책
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own summaries" ON conversation_summaries;
CREATE POLICY "Users can view their own summaries"
    ON conversation_summaries FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own summaries" ON conversation_summaries;
CREATE POLICY "Users can insert their own summaries"
    ON conversation_summaries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own summaries" ON conversation_summaries;
CREATE POLICY "Users can update their own summaries"
    ON conversation_summaries FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own summaries" ON conversation_summaries;
CREATE POLICY "Users can delete their own summaries"
    ON conversation_summaries FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 2. AI 추천 캐싱 테이블 (토큰 절약용)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_suggestions_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    cache_key VARCHAR(255) NOT NULL, -- 고객+상황 기반 해시 키
    suggestions JSONB NOT NULL, -- AI 추천 결과 (3가지 버전)
    conversation_hash VARCHAR(64), -- 대화 이력 해시 (변경 감지용)
    intent VARCHAR(255), -- 사용자 의도
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 캐시 만료 시간 (24시간)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_cache_key UNIQUE (user_id, cache_key)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_cache_user_id ON ai_suggestions_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at ON ai_suggestions_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_customer_id ON ai_suggestions_cache(customer_id);

-- RLS 정책
ALTER TABLE ai_suggestions_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cache" ON ai_suggestions_cache;
CREATE POLICY "Users can view their own cache"
    ON ai_suggestions_cache FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own cache" ON ai_suggestions_cache;
CREATE POLICY "Users can insert their own cache"
    ON ai_suggestions_cache FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own cache" ON ai_suggestions_cache;
CREATE POLICY "Users can delete their own cache"
    ON ai_suggestions_cache FOR DELETE
    USING (auth.uid() = user_id);

-- 만료된 캐시 자동 삭제 함수 (선택사항)
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM ai_suggestions_cache
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_summaries;

