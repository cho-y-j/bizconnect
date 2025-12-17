-- sms_logs 테이블에 'pending' 상태 추가
-- 웹에서 작업 생성 시 즉시 기록을 남기기 위함

-- 1. 기존 제약조건 제거
ALTER TABLE sms_logs
DROP CONSTRAINT IF EXISTS valid_log_status;

-- 2. 'pending' 상태를 포함한 새 제약조건 추가
ALTER TABLE sms_logs
ADD CONSTRAINT valid_log_status CHECK (status IN ('pending', 'sent', 'failed', 'delivered'));

-- 3. 기본값을 'pending'으로 변경 (선택사항)
-- ALTER TABLE sms_logs ALTER COLUMN status SET DEFAULT 'pending';



















