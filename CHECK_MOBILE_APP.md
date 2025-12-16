# 모바일 앱 상태 확인 가이드

## 현재 상황
- 모바일 앱이 설치되어 실행 중입니다
- 로그 확인이 어려워 Supabase에서 직접 확인하는 방법을 사용합니다

## 확인 절차

### 1. 웹에서 문자 발송
1. 웹 브라우저에서 문자 발송 페이지로 이동
2. 문자 발송 버튼 클릭
3. 브라우저 콘솔(F12)에서 다음 로그 확인:
   ```
   📝 Creating tasks in database... 1 tasks
   ✅ SMS logs created: 1
   ✅ Log IDs: ['...']
   ```

### 2. Supabase에서 확인

#### A. tasks 테이블 확인
Supabase Dashboard > Table Editor > `tasks` 테이블:
- 최신 작업이 생성되었는지 확인
- `status`가 'pending' → 'queued' → 'processing' → 'completed'로 변경되는지 확인
- `user_id`, `customer_phone`, `message_content`가 있는지 확인

#### B. sms_logs 테이블 확인
Supabase Dashboard > Table Editor > `sms_logs` 테이블:
- `status`가 'pending' → 'sent' 또는 'failed'로 변경되는지 확인
- `task_id`가 tasks 테이블의 id와 일치하는지 확인

### 3. 문제 진단

#### 문제 1: tasks 테이블에 작업이 생성되지 않음
- **원인**: 웹에서 작업 생성 실패
- **해결**: 웹 브라우저 콘솔 에러 확인

#### 문제 2: tasks 테이블에 작업은 있지만 status가 'pending'에서 변경되지 않음
- **원인**: 모바일 앱이 작업을 받지 못함
- **가능한 원인**:
  1. 모바일 앱이 로그인되지 않음
  2. Supabase Realtime 구독 실패
  3. RLS 정책 문제
- **해결**: 
  - 모바일 앱이 로그인되어 있는지 확인
  - Supabase Realtime 설정 확인
  - RLS 정책 확인

#### 문제 3: tasks는 'queued' 또는 'processing'이지만 sms_logs가 'pending'에서 변경되지 않음
- **원인**: SMS 발송 실패 또는 로그 저장 실패
- **가능한 원인**:
  1. SMS 권한 없음
  2. 전화번호 형식 오류
  3. sms_logs 저장 실패 (RLS 정책 문제)
- **해결**:
  - 모바일 앱에서 SMS 권한 확인
  - 전화번호 형식 확인
  - sms_logs RLS 정책 확인

### 4. 즉시 확인할 수 있는 방법

웹에서 문자 발송 후 10초 이내에:
1. Supabase Dashboard > Table Editor > `tasks` 테이블
   - `status`가 'pending'에서 'queued'로 변경되었는지 확인
2. Supabase Dashboard > Table Editor > `sms_logs` 테이블
   - `status`가 'pending'에서 'sent' 또는 'failed'로 변경되었는지 확인

**만약 10초 후에도 변경되지 않으면 모바일 앱이 작업을 처리하지 못하는 것입니다.**
















