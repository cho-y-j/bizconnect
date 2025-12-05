-- 그룹(Group)과 태그(Tag) 기능 추가 마이그레이션
-- 기존 customers 테이블에 그룹/태그 기능을 추가합니다

-- ============================================
-- 1. Groups 테이블 생성 (사용자 정의 그룹)
-- ============================================

CREATE TABLE IF NOT EXISTS customer_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(20) DEFAULT '#3B82F6', -- 기본 파란색
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_group_name UNIQUE (user_id, name)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_customer_groups_user_id ON customer_groups(user_id);

-- RLS 정책
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own groups" ON customer_groups;
CREATE POLICY "Users can view their own groups"
    ON customer_groups FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own groups" ON customer_groups;
CREATE POLICY "Users can insert their own groups"
    ON customer_groups FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own groups" ON customer_groups;
CREATE POLICY "Users can update their own groups"
    ON customer_groups FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own groups" ON customer_groups;
CREATE POLICY "Users can delete their own groups"
    ON customer_groups FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 2. Customer_Tags 테이블 생성 (태그 연결)
-- ============================================

CREATE TABLE IF NOT EXISTS customer_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_customer_tag UNIQUE (customer_id, tag_name)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag_name ON customer_tags(tag_name);

-- RLS 정책
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view customer tags" ON customer_tags;
CREATE POLICY "Users can view customer tags"
    ON customer_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = customer_tags.customer_id
            AND customers.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert customer tags" ON customer_tags;
CREATE POLICY "Users can insert customer tags"
    ON customer_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = customer_tags.customer_id
            AND customers.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete customer tags" ON customer_tags;
CREATE POLICY "Users can delete customer tags"
    ON customer_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = customer_tags.customer_id
            AND customers.user_id = auth.uid()
        )
    );

-- ============================================
-- 3. Customers 테이블에 group_id 추가
-- ============================================

-- group_id 컬럼 추가 (NULL 허용 - 기존 데이터 호환)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES customer_groups(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_customers_group_id ON customers(group_id);

-- ============================================
-- 4. 기본 그룹 생성 함수
-- ============================================

CREATE OR REPLACE FUNCTION create_default_groups(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- 기본 그룹들 생성 (중복 방지)
    INSERT INTO customer_groups (user_id, name, color, sort_order)
    VALUES
        (p_user_id, '기본', '#6B7280', 0),
        (p_user_id, 'VIP 고객', '#EF4444', 1),
        (p_user_id, '거래처', '#3B82F6', 2),
        (p_user_id, '잠재 고객', '#10B981', 3)
    ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. updated_at 트리거 추가
-- ============================================

DROP TRIGGER IF EXISTS update_customer_groups_updated_at ON customer_groups;
CREATE TRIGGER update_customer_groups_updated_at
    BEFORE UPDATE ON customer_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 완료 메시지
-- ============================================

SELECT '그룹과 태그 기능이 추가되었습니다.' as status;

