# Supabase 마이그레이션 실행 가이드

## 🚀 빠른 시작 (npx 사용 - 권장)

### 1단계: Supabase 로그인

터미널에서 실행:
```powershell
npx supabase login
```

브라우저가 열리면 로그인하세요.

### 2단계: 마이그레이션 실행

```powershell
.\scripts\run-migration-npx.ps1
```

또는 수동으로:
```powershell
# 프로젝트 연결
npx supabase link --project-ref hdeebyhwoogxawjkwufx

# 마이그레이션 파일 준비
mkdir supabase\migrations
Copy-Item supabase\migration.sql supabase\migrations\$(Get-Date -Format "yyyyMMddHHmmss")_initial_schema.sql

# 마이그레이션 실행
npx supabase db push
```

---

## 🛠️ Scoop으로 설치 (영구 설치)

### 1단계: Scoop 설치 (처음 한 번만)

PowerShell을 관리자 권한으로 실행:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### 2단계: Supabase CLI 설치

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 3단계: 로그인 및 마이그레이션

```powershell
# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref hdeebyhwoogxawjkwufx

# 마이그레이션 실행
.\scripts\setup-supabase-cli.ps1
```

---

## 📋 수동 실행 (가장 확실한 방법)

### Supabase Dashboard 사용

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/sql/new

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 클릭

3. **마이그레이션 실행**
   - `supabase/migration.sql` 파일 열기
   - 전체 내용 복사 (Ctrl+A, Ctrl+C)
   - SQL Editor에 붙여넣기 (Ctrl+V)
   - **"Run" 버튼 클릭** (또는 Ctrl+Enter)

4. **확인**
   - "Success. No rows returned" 메시지 확인
   - Table Editor에서 테이블 확인:
     - ✅ `customers`
     - ✅ `tasks`
     - ✅ `sms_logs`
     - ✅ `daily_limits`
     - ✅ `user_settings`

---

## ✅ 마이그레이션 후 확인 사항

- [ ] 모든 테이블 생성 확인 (5개)
- [ ] RLS 정책 확인 (각 테이블 > Policies 탭)
- [ ] 실시간 구독 확인 (`tasks` 테이블)
- [ ] 환경 변수 설정 (`web/.env.local`)

---

## 🔧 문제 해결

### "relation already exists" 오류
- 테이블이 이미 존재하는 경우
- 해결: `DROP TABLE IF EXISTS` 사용하거나 Dashboard에서 수동 삭제

### 로그인 실패
- 브라우저가 열리지 않는 경우
- 해결: 수동으로 토큰 입력하거나 Dashboard에서 직접 실행

### 프로젝트 연결 실패
- Project Ref가 잘못된 경우
- 해결: Dashboard > Settings > General에서 Reference ID 확인

---

**추천 방법:** 처음에는 **수동 실행(Dashboard)**이 가장 확실합니다!

