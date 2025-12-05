# Supabase MCP 설정 가이드

## 현재 상황

현재 MCP 설정은 로컬 Supabase(`localhost:54321`)를 가리키고 있지만, 실제로는 **클라우드 Supabase**를 사용하고 있습니다.

## 옵션 1: 클라우드 Supabase 사용 (현재 방식) - 권장 ✅

**MCP 없이 코드로 제어하는 방식**입니다. 이미 잘 작동하고 있습니다.

### 장점
- ✅ 설정이 간단함
- ✅ 클라우드에서 바로 사용 가능
- ✅ 이미 작동 중

### 단점
- ❌ MCP를 통한 직접 제어 불가
- ❌ 하지만 코드로 모든 작업 가능

### 현재 설정 유지
```json
{
  "mcpServers": {
    "supabase": {
      "url": "http://localhost:54321/mcp",
      "headers": {}
    }
  }
}
```
→ 이 설정은 **무시해도 됩니다** (로컬 Supabase를 실행하지 않으므로)

---

## 옵션 2: 로컬 Supabase 실행 + MCP 사용

로컬에서 Supabase를 실행하여 MCP를 통해 직접 제어하는 방식입니다.

### 필요 사항
1. Docker Desktop 설치 및 실행
2. Supabase CLI 설치
3. 로컬 프로젝트 초기화

### 설정 단계

#### 1단계: Docker Desktop 설치
- https://www.docker.com/products/docker-desktop/ 다운로드
- 설치 후 실행 (백그라운드에서 실행 중이어야 함)

#### 2단계: Supabase CLI 설치
```powershell
# Scoop으로 설치 (이미 설치되어 있을 수 있음)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 또는 npx 사용
npx supabase --version
```

#### 3단계: 로컬 Supabase 초기화
```powershell
# 프로젝트 루트에서
cd C:\cho\call\BizConnect

# Supabase 초기화 (처음 한 번만)
npx supabase init

# 로컬 Supabase 시작 (Docker 필요)
npx supabase start
```

#### 4단계: MCP 서버 확인
로컬 Supabase가 시작되면:
- MCP 서버: `http://localhost:54321/mcp`
- Dashboard: `http://localhost:54321`
- API URL: `http://localhost:54321`

#### 5단계: 클라우드와 동기화 (선택)
```powershell
# 클라우드 프로젝트 연결
npx supabase link --project-ref hdeebyhwoogxawjkwufx

# 클라우드에서 로컬로 스키마 가져오기
npx supabase db pull
```

### 단점
- ❌ Docker 필요 (리소스 사용)
- ❌ 설정이 복잡함
- ❌ 로컬과 클라우드 동기화 필요
- ❌ 개발 환경만 가능 (프로덕션은 클라우드 사용)

---

## 권장 사항: 옵션 1 유지 ✅

**현재 방식을 계속 사용하는 것을 권장합니다.**

이유:
1. 이미 잘 작동하고 있음
2. 클라우드에서 바로 사용 가능
3. 추가 설정 불필요
4. 프로덕션 환경과 동일

### MCP 없이 할 수 있는 것들

코드로 모든 작업 가능:
- ✅ 회원가입/로그인 (`web/src/lib/auth.ts`)
- ✅ 데이터베이스 쿼리 (`supabase.from()`)
- ✅ 실시간 구독
- ✅ 파일 업로드
- ✅ API 엔드포인트 (`web/src/app/api/`)

### MCP가 필요한 경우

MCP는 주로:
- 로컬 개발 환경에서 스키마 생성/수정
- 마이그레이션 자동화
- 로컬 테스트

하지만 이미:
- ✅ Supabase Dashboard에서 SQL 실행 가능
- ✅ 코드로 모든 작업 가능
- ✅ API 엔드포인트로 테스트 가능

---

## 결론

**현재 설정을 그대로 유지하세요!**

MCP 설정 파일(`mcp.json`)은 로컬 Supabase를 사용하지 않으므로 무시해도 됩니다.

필요한 모든 작업은:
1. **코드로** (`web/src/lib/auth.ts`, `web/src/app/api/`)
2. **Supabase Dashboard에서** (SQL Editor, Table Editor)
3. **Supabase CLI로** (`npx supabase`)

이미 충분히 가능합니다! 🎉

