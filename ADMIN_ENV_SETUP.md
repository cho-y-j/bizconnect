# 관리자 기능 환경 변수 설정 가이드

## 로컬 개발 환경

### 1. `.env.local` 파일 확인

`web/.env.local` 파일에 다음 환경 변수가 추가되었습니다:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZWVieWh3b29neGF3amt3dWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkxMTM3MywiZXhwIjoyMDgwNDg3MzczfQ.7p0qQR3aT-iUsmF_Pgs4Xu4vQq1303Tnen8bQWLI3rI
```

### 2. 기존 환경 변수 확인

다음 환경 변수들이 이미 설정되어 있어야 합니다:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Vercel 프로덕션 환경

### 환경 변수 추가

Vercel 대시보드에서 다음 환경 변수를 추가하세요:

1. **Vercel 대시보드** 접속
2. 프로젝트 선택: **bizconnect** (또는 프로젝트 이름)
3. **Settings** → **Environment Variables** 클릭
4. 다음 변수 추가:

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZWVieWh3b29neGF3amt3dWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkxMTM3MywiZXhwIjoyMDgwNDg3MzczfQ.7p0qQR3aT-iUsmF_Pgs4Xu4vQq1303Tnen8bQWLI3rI` | Production, Preview, Development |

### ⚠️ 중요 보안 주의사항

1. **Service Role Key는 절대 클라이언트에 노출되면 안 됩니다!**
   - `NEXT_PUBLIC_` 접두사를 붙이지 마세요
   - 서버 사이드 API 라우트에서만 사용하세요

2. **Git에 커밋하지 마세요**
   - `.env.local` 파일은 `.gitignore`에 포함되어 있습니다
   - 키가 노출되면 즉시 Supabase 대시보드에서 키를 재생성하세요

3. **환경별로 다른 키 사용 권장**
   - 개발/스테이징/프로덕션 환경별로 다른 Service Role Key 사용

---

## 환경 변수 확인

### 로컬에서 확인

```bash
cd web
npm run dev
```

개발 서버가 정상적으로 시작되면 환경 변수가 올바르게 설정된 것입니다.

### Vercel에서 확인

1. Vercel 대시보드 → **Deployments**
2. 최신 배포의 **Build Logs** 확인
3. 환경 변수 관련 오류가 없으면 정상

---

## 다음 단계

환경 변수 설정이 완료되었으므로, 관리자 기능 구현을 시작할 수 있습니다.

1. 데이터베이스 스키마 생성
2. 관리자 권한 시스템 구현
3. 관리자 대시보드 구현


