# Supabase 데이터베이스 스키마 설계

**작성일:** 2025.12.05  
**버전:** 1.0

---

## 📊 테이블 구조

### 1. customers (고객 정보)

고객의 기본 정보 및 생일, 기념일 등을 저장합니다.

```sql
CREATE TABLE customers (
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
    
    -- 인덱스
    CONSTRAINT unique_user_phone UNIQUE (user_id, phone)
);

-- 인덱스
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_birthday ON customers(birthday) WHERE birthday IS NOT NULL;

-- RLS 정책
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customers"
    ON customers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
    ON customers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
    ON customers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
    ON customers FOR DELETE
    USING (auth.uid() = user_id);
```

---

### 2. tasks (SMS 발송 작업)

웹에서 요청한 SMS 발송 작업을 저장하고, 모바일 앱이 처리합니다.

```sql
CREATE TABLE tasks (
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
    
    -- 인덱스
    CONSTRAINT valid_status CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed'))
);

-- 인덱스
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status) WHERE status IN ('pending', 'queued');
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_scheduled_at ON tasks(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- RLS 정책
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id);

-- 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

---

### 3. sms_logs (SMS 발송 기록)

실제 발송된 SMS의 상세 기록을 저장합니다.

```sql
CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'failed', 'delivered'
    error_message TEXT,
    sms_id VARCHAR(255), -- 안드로이드 SMS ID
    
    -- 인덱스
    CONSTRAINT valid_log_status CHECK (status IN ('sent', 'failed', 'delivered'))
);

-- 인덱스
CREATE INDEX idx_sms_logs_user_id ON sms_logs(user_id);
CREATE INDEX idx_sms_logs_sent_at ON sms_logs(sent_at DESC);
CREATE INDEX idx_sms_logs_task_id ON sms_logs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_sms_logs_date ON sms_logs((sent_at::date));

-- RLS 정책
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs"
    ON sms_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
    ON sms_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

---

### 4. daily_limits (일일 발송 한도)

사용자별 일일 발송 한도를 추적하고 관리합니다.

```sql
CREATE TABLE daily_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sent_count INTEGER DEFAULT 0,
    limit_mode VARCHAR(20) DEFAULT 'safe', -- 'safe' (199건), 'max' (490건)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 인덱스
    CONSTRAINT unique_user_date UNIQUE (user_id, date),
    CONSTRAINT valid_limit_mode CHECK (limit_mode IN ('safe', 'max')),
    CONSTRAINT valid_sent_count CHECK (sent_count >= 0)
);

-- 인덱스
CREATE INDEX idx_daily_limits_user_date ON daily_limits(user_id, date DESC);

-- RLS 정책
ALTER TABLE daily_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own limits"
    ON daily_limits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own limits"
    ON daily_limits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own limits"
    ON daily_limits FOR UPDATE
    USING (auth.uid() = user_id);
```

---

### 5. user_settings (사용자 설정)

사용자의 앱 설정을 저장합니다.

```sql
CREATE TABLE user_settings (
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

-- RLS 정책
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);
```

---

## 🔄 함수 및 트리거

### 1. 자동 updated_at 업데이트

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_limits_updated_at
    BEFORE UPDATE ON daily_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. 일일 한도 자동 생성/업데이트

```sql
CREATE OR REPLACE FUNCTION get_or_create_daily_limit(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS daily_limits AS $$
DECLARE
    v_limit daily_limits;
BEGIN
    -- 기존 레코드 조회
    SELECT * INTO v_limit
    FROM daily_limits
    WHERE user_id = p_user_id AND date = p_date;
    
    -- 없으면 생성
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
```

### 3. 발송 카운트 증가

```sql
CREATE OR REPLACE FUNCTION increment_daily_sent_count(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- 일일 한도 레코드 가져오기 또는 생성
    PERFORM get_or_create_daily_limit(p_user_id, p_date);
    
    -- 카운트 증가
    UPDATE daily_limits
    SET sent_count = sent_count + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_date
    RETURNING sent_count INTO v_new_count;
    
    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. 오늘의 할 일 조회 함수

```sql
CREATE OR REPLACE FUNCTION get_today_tasks(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    type VARCHAR,
    customer_name VARCHAR,
    customer_phone VARCHAR,
    message_content TEXT,
    status VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.type,
        t.customer_name,
        t.customer_phone,
        t.message_content,
        t.status,
        t.created_at
    FROM tasks t
    WHERE t.user_id = p_user_id
        AND t.status IN ('pending', 'queued')
        AND (t.scheduled_at IS NULL OR t.scheduled_at <= NOW())
    ORDER BY t.priority DESC, t.created_at ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📈 뷰 (Views)

### 1. 오늘의 발송 통계

```sql
CREATE VIEW today_sms_stats AS
SELECT 
    user_id,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'sent') as successful,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM sms_logs
WHERE sent_at::date = CURRENT_DATE
GROUP BY user_id;
```

### 2. 고객별 발송 이력

```sql
CREATE VIEW customer_sms_history AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    c.phone,
    COUNT(sl.id) as total_sent,
    MAX(sl.sent_at) as last_sent_at
FROM customers c
LEFT JOIN sms_logs sl ON sl.phone_number = c.phone AND sl.user_id = c.user_id
GROUP BY c.id, c.name, c.phone;
```

---

## 🔐 보안 설정

### RLS (Row Level Security) 요약

모든 테이블에 RLS가 활성화되어 있으며, 사용자는 자신의 데이터만 접근할 수 있습니다.

- `auth.uid()`를 사용하여 현재 사용자 ID 확인
- 모든 SELECT, INSERT, UPDATE, DELETE 작업에 정책 적용

### 실시간 구독

`tasks` 테이블에 실시간 구독이 활성화되어 있어, 새로운 작업이 생성되면 모바일 앱이 즉시 알림을 받을 수 있습니다.

---

## 📝 초기 데이터

### 기본 사용자 설정 생성 트리거

```sql
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();
```

---

## 🚀 마이그레이션 순서

1. 기본 테이블 생성 (customers, tasks, sms_logs, daily_limits, user_settings)
2. 인덱스 생성
3. RLS 정책 설정
4. 함수 생성
5. 트리거 생성
6. 뷰 생성
7. 실시간 구독 활성화

---

**마지막 업데이트:** 2025.12.05


