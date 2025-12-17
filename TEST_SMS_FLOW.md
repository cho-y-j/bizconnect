# SMS 발송 흐름 테스트 가이드

## 문제 진단을 위한 체크리스트

### 1. Supabase SQL 실행 확인
**파일**: `supabase/add-pending-status-to-sms-logs.sql`

Supabase Dashboard > SQL Editor에서 실행:
```sql
ALTER TABLE sms_logs
DROP CONSTRAINT IF EXISTS valid_log_status;

ALTER TABLE sms_logs
ADD CONSTRAINT valid_log_status CHECK (status IN ('pending', 'sent', 'failed', 'delivered'));
```

### 2. 웹에서 작업 생성 확인

1. 웹에서 문자 발송 버튼 클릭
2. Supabase Dashboard > Table Editor > `tasks` 테이블 확인
   - 새 작업이 생성되었는지 확인
   - `status`가 'pending'인지 확인
   - `user_id`, `customer_phone`, `message_content`가 있는지 확인

3. Supabase Dashboard > Table Editor > `sms_logs` 테이블 확인
   - 새 기록이 생성되었는지 확인
   - `status`가 'pending'인지 확인
   - `task_id`가 tasks 테이블의 id와 일치하는지 확인

### 3. 모바일 앱 로그 확인

모바일 앱에서 다음 로그를 확인:

#### 작업 수신 확인
```
🔔 New task received from Supabase: {...}
✅ Task ready, adding to queue: [taskId]
```

#### 큐 처리 확인
```
🚀 Starting queue processing, queue length: 1
📤 Processing task: [taskId] type: send_sms phone: [전화번호]
```

#### SMS 발송 확인
```
📱 Calling SmsAndroid.autoSend: [전화번호] [메시지]
✅ SMS sent successfully - callback received: {...}
```

#### 발송 기록 저장 확인
```
💾 ===== SAVING SMS LOG START =====
✅ ===== SMS LOG SAVED SUCCESSFULLY =====
✅ Status: sent
```

### 4. Supabase에서 최종 확인

1. `tasks` 테이블: `status`가 'completed' 또는 'failed'로 변경되었는지
2. `sms_logs` 테이블: `status`가 'sent' 또는 'failed'로 업데이트되었는지

## 문제별 해결 방법

### 문제 1: tasks 테이블에 작업이 생성되지 않음
- 웹 콘솔에서 에러 확인
- Supabase RLS 정책 확인

### 문제 2: sms_logs에 pending 기록이 생성되지 않음
- Supabase SQL 실행 확인
- 웹 콘솔에서 에러 확인

### 문제 3: 모바일 앱이 작업을 받지 못함
- 실시간 구독 상태 확인
- 폴링 로그 확인 (10초마다)

### 문제 4: SMS 발송이 실행되지 않음
- SMS 권한 확인
- 모바일 앱 로그 확인

### 문제 5: sms_logs 업데이트가 안 됨
- 모바일 앱 로그에서 에러 확인
- RLS 정책 확인



















