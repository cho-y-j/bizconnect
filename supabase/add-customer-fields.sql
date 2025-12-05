-- 고객 정보에 주소, 직업, 나이 필드 추가
-- AI가 고객을 더 잘 이해할 수 있도록 추가 정보 제공

-- ============================================
-- 1. customers 테이블에 필드 추가
-- ============================================

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS address TEXT, -- 주소
ADD COLUMN IF NOT EXISTS occupation VARCHAR(100), -- 직업
ADD COLUMN IF NOT EXISTS age INTEGER, -- 나이 (생일로부터 계산 가능하지만 별도 저장)
ADD COLUMN IF NOT EXISTS birth_year INTEGER; -- 출생년도 (생일이 없을 때 사용)

-- 인덱스 (선택적)
CREATE INDEX IF NOT EXISTS idx_customers_occupation ON customers(occupation) WHERE occupation IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_age ON customers(age) WHERE age IS NOT NULL;

-- 주석 추가
COMMENT ON COLUMN customers.address IS '고객 주소 (AI 참고용)';
COMMENT ON COLUMN customers.occupation IS '고객 직업 (AI 참고용)';
COMMENT ON COLUMN customers.age IS '고객 나이 (AI 참고용)';
COMMENT ON COLUMN customers.birth_year IS '출생년도 (생일이 없을 때 사용)';

