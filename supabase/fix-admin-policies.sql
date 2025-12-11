-- 관리자 RLS 정책 수정 (무한 재귀 방지)
-- 기존 정책을 삭제하고 새로 생성합니다.
-- 실행 순서: Supabase Dashboard > SQL Editor에서 실행

-- ============================================
-- 1. admin_users 테이블 정책 수정
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own admin status" ON admin_users;
DROP POLICY IF EXISTS "Super admins can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

-- 새 정책 생성 (무한 재귀 방지)
CREATE POLICY "Users can view their own admin status"
    ON admin_users FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all admin users"
    ON admin_users FOR SELECT
    USING (is_super_admin());

CREATE POLICY "Super admins can manage admin users"
    ON admin_users FOR ALL
    USING (is_super_admin());

-- ============================================
-- 2. access_logs 테이블 정책 수정
-- ============================================

DROP POLICY IF EXISTS "Admins can view access logs" ON access_logs;
DROP POLICY IF EXISTS "Anyone can insert access logs" ON access_logs;

CREATE POLICY "Admins can view access logs"
    ON access_logs FOR SELECT
    USING (is_admin());

CREATE POLICY "Anyone can insert access logs"
    ON access_logs FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 3. subscriptions 테이블 정책 수정
-- ============================================

DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;

CREATE POLICY "Users can view their own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
    ON subscriptions FOR SELECT
    USING (is_admin());

-- ============================================
-- 4. admin_settings 테이블 정책 수정
-- ============================================

DROP POLICY IF EXISTS "Admins can manage admin settings" ON admin_settings;

CREATE POLICY "Admins can manage admin settings"
    ON admin_settings FOR ALL
    USING (is_admin());

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS 정책이 성공적으로 수정되었습니다!';
    RAISE NOTICE '📝 무한 재귀 문제가 해결되었습니다.';
END $$;


