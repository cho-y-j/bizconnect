-- 관리자 기능을 위한 데이터베이스 스키마 추가
-- 실행 순서: Supabase Dashboard > SQL Editor에서 실행

-- ============================================
-- 1. admin_users 테이블 생성 (관리자 권한 관리)
-- ============================================

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'admin', -- 'super_admin', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    CONSTRAINT valid_role CHECK (role IN ('super_admin', 'admin'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- RLS 정책
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Users can view their own admin status" ON admin_users;
DROP POLICY IF EXISTS "Super admins can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

-- 사용자는 자신의 관리자 상태를 조회할 수 있음 (무한 재귀 방지)
CREATE POLICY "Users can view their own admin status"
    ON admin_users FOR SELECT
    USING (auth.uid() = user_id);

-- 슈퍼 관리자만 모든 관리자 정보 조회 가능 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Super admins can view all admin users"
    ON admin_users FOR SELECT
    USING (is_super_admin());

-- 슈퍼 관리자만 관리자 추가/수정/삭제 가능 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Super admins can manage admin users"
    ON admin_users FOR ALL
    USING (is_super_admin());

-- ============================================
-- 2. access_logs 테이블 생성 (접속 로그)
-- ============================================

CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    route VARCHAR(500),
    method VARCHAR(10),
    status_code INTEGER,
    response_time INTEGER, -- 밀리초
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_method CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS')),
    CONSTRAINT valid_status_code CHECK (status_code >= 100 AND status_code < 600)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_route ON access_logs(route);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON access_logs(ip_address);
-- 날짜별 인덱스는 제거 (TIMESTAMP WITH TIME ZONE에서 date_trunc는 IMMUTABLE이 아님)
-- 날짜별 쿼리는 created_at DESC 인덱스로 충분히 처리 가능

-- RLS 정책
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Admins can view access logs" ON access_logs;
DROP POLICY IF EXISTS "Anyone can insert access logs" ON access_logs;

-- 관리자만 접속 로그 조회 가능 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Admins can view access logs"
    ON access_logs FOR SELECT
    USING (is_admin());

-- 모든 사용자의 접속 로그 기록 가능 (미들웨어에서)
CREATE POLICY "Anyone can insert access logs"
    ON access_logs FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 3. subscriptions 테이블 생성 (구독 정보)
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'free', -- 'free', 'basic', 'premium', 'enterprise'
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'trial'
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    billing_amount DECIMAL(10, 2) DEFAULT 0,
    billing_cycle VARCHAR(20), -- 'monthly', 'yearly'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_plan_type CHECK (plan_type IN ('free', 'basic', 'premium', 'enterprise')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    CONSTRAINT valid_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly') OR billing_cycle IS NULL)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions(plan_type);

-- RLS 정책
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;

-- 사용자는 자신의 구독 정보만 조회 가능
CREATE POLICY "Users can view their own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- 관리자는 모든 구독 정보 조회 가능 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Admins can view all subscriptions"
    ON subscriptions FOR SELECT
    USING (is_admin());

-- ============================================
-- 4. admin_settings 테이블 생성 (관리자 설정)
-- ============================================

CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key);

-- RLS 정책
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Admins can manage admin settings" ON admin_settings;

-- 관리자만 설정 조회/수정 가능 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Admins can manage admin settings"
    ON admin_settings FOR ALL
    USING (is_admin());

-- ============================================
-- 5. 트리거: updated_at 자동 업데이트
-- ============================================

-- 기존 트리거 삭제 (이미 존재하는 경우)
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings;

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. 초기 슈퍼 관리자 생성 함수
-- ============================================

-- 주의: 이 함수는 Supabase Dashboard에서 직접 실행하거나
-- Service Role Key를 사용하여 실행해야 합니다.

CREATE OR REPLACE FUNCTION create_super_admin(p_user_id UUID, p_created_by UUID DEFAULT NULL)
RETURNS admin_users AS $$
DECLARE
    v_admin admin_users;
BEGIN
    INSERT INTO admin_users (user_id, role, created_by)
    VALUES (p_user_id, 'super_admin', p_created_by)
    ON CONFLICT (user_id) DO UPDATE
    SET role = 'super_admin',
        updated_at = NOW()
    RETURNING * INTO v_admin;
    
    RETURN v_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 관리자 권한 확인 함수
-- ============================================

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users
        WHERE user_id = p_user_id AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ 관리자 기능 스키마가 성공적으로 생성되었습니다!';
    RAISE NOTICE '📝 다음 단계:';
    RAISE NOTICE '   1. 슈퍼 관리자 계정 생성: SELECT create_super_admin(''your-user-id'');';
    RAISE NOTICE '   2. 관리자 권한 확인: SELECT is_admin();';
END $$;

