# Supabase 설정 및 마이그레이션 가이드

## 🚀 빠른 시작 (가장 간단한 방법)

### 1단계: Supabase Dashboard에서 SQL 실행

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택: `hdeebyhwoogxawjkwufx` (또는 새 프로젝트 생성)

2. **SQL Editor 열기**
   - 왼쪽 사이드바에서 "SQL Editor" 클릭
   - "New query" 버튼 클릭

3. **마이그레이션 실행**
   - `supabase/migration.sql` 파일을 열어서 전체 내용 복사
   - SQL Editor에 붙여넣기
   - **"Run" 버튼 클릭** (또는 `Ctrl+Enter`)

4. **확인**
   - "Success. No rows returned" 메시지 확인
   - 왼쪽 사이드바 "Table Editor"에서 다음 테이블 확인:
     - ✅ `customers`
     - ✅ `tasks`
     - ✅ `sms_logs`
     - ✅ `daily_limits`
     - ✅ `user_settings`

---

## 🔧 환경 변수 설정

### 웹 애플리케이션

`web/.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hdeebyhwoogxawjkwufx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**API 키 확인 방법:**
1. Supabase Dashboard > Settings > API
2. `anon` `public` 키 복사

---

## 📋 마이그레이션 체크리스트

- [ ] Supabase 프로젝트 생성/확인
- [ ] SQL Editor에서 `supabase/migration.sql` 실행
- [ ] 모든 테이블 생성 확인 (5개)
- [ ] RLS 정책 확인 (Table Editor > 각 테이블 > Policies)
- [ ] 실시간 구독 확인 (Database > Replication)
- [ ] `web/.env.local` 파일 생성 및 환경 변수 설정
- [ ] 웹 앱 테스트 (`npm run dev`)

---

## 🛠️ 고급: Supabase CLI 사용

### 설치
```bash
npm install -g supabase
```

### 로그인
```bash
supabase login
```

### 프로젝트 연결
```bash
supabase link --project-ref hdeebyhwoogxawjkwufx
```

### 마이그레이션 실행
```bash
# 마이그레이션 파일을 migrations 폴더로 복사
mkdir -p supabase/migrations
cp supabase/migration.sql supabase/migrations/$(Get-Date -Format "yyyyMMddHHmmss")_initial_schema.sql

# 마이그레이션 실행
supabase db push
```

---

## 🔍 문제 해결

### "relation already exists" 오류
- 테이블이 이미 존재하는 경우
- 해결: `supabase/migration.sql`의 `CREATE TABLE IF NOT EXISTS` 사용 (이미 적용됨)

### RLS 정책 오류
- RLS가 활성화되어 있지만 정책이 없는 경우
- 해결: SQL Editor에서 RLS 정책 부분만 다시 실행

### 실시간 구독이 작동하지 않음
- `tasks` 테이블이 Realtime에 추가되지 않은 경우
- 해결: Database > Replication에서 `tasks` 테이블 활성화

---

## 📚 참고 자료

- [Supabase 문서](https://supabase.com/docs)
- [SQL Editor 가이드](https://supabase.com/docs/guides/database/overview#sql-editor)
- [RLS 정책 가이드](https://supabase.com/docs/guides/auth/row-level-security)

---

**마지막 업데이트:** 2025.12.05

