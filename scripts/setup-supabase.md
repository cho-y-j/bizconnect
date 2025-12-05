# Supabase 마이그레이션 실행 가이드

## 방법 1: Supabase Dashboard 사용 (가장 간단) ⭐

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택 (또는 새 프로젝트 생성)

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 클릭

3. **마이그레이션 실행**
   - `supabase/migration.sql` 파일 내용을 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭 (또는 Ctrl+Enter)

4. **확인**
   - "Success. No rows returned" 메시지 확인
   - Table Editor에서 테이블 생성 확인

---

## 방법 2: Supabase CLI 사용 (자동화)

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
# 프로젝트 참조 ID 확인 (Dashboard > Settings > General > Reference ID)
supabase link --project-ref your-project-ref
```

### 마이그레이션 실행
```bash
# 마이그레이션 파일을 migrations 폴더로 이동
mkdir -p supabase/migrations
cp supabase/migration.sql supabase/migrations/$(date +%Y%m%d%H%M%S)_initial_schema.sql

# 마이그레이션 실행
supabase db push
```

---

## 방법 3: psql 사용 (PostgreSQL 클라이언트 필요)

### 연결 정보 확인
- Supabase Dashboard > Settings > Database
- Connection string 복사

### 실행
```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f supabase/migration.sql
```

---

## 방법 4: Node.js 스크립트 (psql 필요)

```bash
# 환경 변수 설정
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# 스크립트 실행
node scripts/run-migration-psql.js
```

---

## 현재 프로젝트 정보

모바일 앱에서 확인된 Supabase 정보:
- **URL**: `https://hdeebyhwoogxawjkwufx.supabase.co`
- **Project Ref**: `hdeebyhwoogxawjkwufx`

**Service Role Key**는 Dashboard > Settings > API에서 확인하세요.

---

## 체크리스트

- [ ] Supabase 프로젝트 생성/확인
- [ ] SQL Editor에서 마이그레이션 실행
- [ ] 테이블 생성 확인 (Table Editor)
- [ ] RLS 정책 확인
- [ ] 환경 변수 설정 (web/.env.local)

