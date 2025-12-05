-- 비즈커넥트 데이터베이스 마이그레이션 스크립트
-- 실행 순서: Supabase Dashboard > SQL Editor에서 순서대로 실행

-- ============================================
-- 1. 기본 테이블 생성
-- ============================================

-- customers 테이블
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    birthday DATE,
    anniversary DATE,
    industry_type VARCHAR(50), -- 'insurance', 'automotive', 'real_estate', 'construction', 'general'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_phone UNIQUE (user_id, phone)
);

-- tasks 테이블
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255), -- 고객명 (치환용)
    message_content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'send_sms', -- 'send_sms', 'callback', 'anniversary', 'birthday'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'queued', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 0, -- 우선순위 (높을수록 먼저 처리)
    scheduled_at TIMESTAMP WITH TIME ZONE, -- 예약 발송 시간
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed'))
);

-- sms_logs 테이블
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'failed', 'delivered'
    error_message TEXT,
    sms_id VARCHAR(255), -- 안드로이드 SMS ID
    
    CONSTRAINT valid_log_status CHECK (status IN ('sent', 'failed', 'delivered'))
);

-- daily_limits 테이블
CREATE TABLE IF NOT EXISTS daily_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sent_count INTEGER DEFAULT 0,
    limit_mode VARCHAR(20) DEFAULT 'safe', -- 'safe' (199건), 'max' (490건)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_date UNIQUE (user_id, date),
    CONSTRAINT valid_limit_mode CHECK (limit_mode IN ('safe', 'max')),
    CONSTRAINT valid_sent_count CHECK (sent_count >= 0)
);

-- user_settings 테이블
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    industry_type VARCHAR(50) DEFAULT 'general',
    limit_mode VARCHAR(20) DEFAULT 'safe',
    throttle_interval INTEGER DEFAULT 15, -- 초 단위
    auto_callback_enabled BOOLEAN DEFAULT true,
    callback_template_new TEXT, -- 신규 고객 콜백 템플릿
    callback_template_existing TEXT, -- 기존 고객 콜백 템플릿
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. 인덱스 생성
-- ============================================

-- customers 인덱스
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_birthday ON customers(birthday) WHERE birthday IS NOT NULL;

-- tasks 인덱스
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status) WHERE status IN ('pending', 'queued');
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_at ON tasks(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- sms_logs 인덱스
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_task_id ON sms_logs(task_id) WHERE task_id IS NOT NULL;
-- 날짜 인덱스는 함수 기반 인덱스 대신 다른 방식으로 처리
-- 필요시 쿼리에서 DATE(sent_at) 사용
-- CREATE INDEX IF NOT EXISTS idx_sms_logs_date ON sms_logs((sent_at::date));

-- daily_limits 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_limits_user_date ON daily_limits(user_id, date DESC);

-- ============================================
-- 3. RLS (Row Level Security) 정책 설정
-- ============================================

-- customers RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
CREATE POLICY "Users can view their own customers"
    ON customers FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
CREATE POLICY "Users can insert their own customers"
    ON customers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
CREATE POLICY "Users can update their own customers"
    ON customers FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;
CREATE POLICY "Users can delete their own customers"
    ON customers FOR DELETE
    USING (auth.uid() = user_id);

-- tasks RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

-- sms_logs RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own logs" ON sms_logs;
CREATE POLICY "Users can view their own logs"
    ON sms_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own logs" ON sms_logs;
CREATE POLICY "Users can insert their own logs"
    ON sms_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- daily_limits RLS
ALTER TABLE daily_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own limits" ON daily_limits;
CREATE POLICY "Users can view their own limits"
    ON daily_limits FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own limits" ON daily_limits;
CREATE POLICY "Users can insert their own limits"
    ON daily_limits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own limits" ON daily_limits;
CREATE POLICY "Users can update their own limits"
    ON daily_limits FOR UPDATE
    USING (auth.uid() = user_id);

-- user_settings RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
CREATE POLICY "Users can view their own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
CREATE POLICY "Users can insert their own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
CREATE POLICY "Users can update their own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- 4. 함수 및 트리거 생성
-- ============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_limits_updated_at ON daily_limits;
CREATE TRIGGER update_daily_limits_updated_at
    BEFORE UPDATE ON daily_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 일일 한도 자동 생성/업데이트 함수
CREATE OR REPLACE FUNCTION get_or_create_daily_limit(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS daily_limits AS $$
DECLARE
    v_limit daily_limits;
BEGIN
    SELECT * INTO v_limit
    FROM daily_limits
    WHERE user_id = p_user_id AND date = p_date;
    
    IF v_limit IS NULL THEN
        INSERT INTO daily_limits (user_id, date, sent_count, limit_mode)
        VALUES (
            p_user_id,
            p_date,
            0,
            COALESCE((SELECT limit_mode FROM user_settings WHERE user_id = p_user_id), 'safe')
        )
        RETURNING * INTO v_limit;
    END IF;
    
    RETURN v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 발송 카운트 증가 함수
CREATE OR REPLACE FUNCTION increment_daily_sent_count(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    PERFORM get_or_create_daily_limit(p_user_id, p_date);
    
    UPDATE daily_limits
    SET sent_count = sent_count + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_date
    RETURNING sent_count INTO v_new_count;
    
    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기본 사용자 설정 생성 트리거
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();

-- ============================================
-- 5. 실시간 구독 활성화
-- ============================================

-- tasks 테이블 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- ============================================
-- 완료!
-- ============================================

