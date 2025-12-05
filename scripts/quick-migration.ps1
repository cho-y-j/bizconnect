# 빠른 마이그레이션 실행 스크립트
# 로그인 후 이 스크립트를 실행하세요

Write-Host "🚀 Supabase 마이그레이션 빠른 실행" -ForegroundColor Cyan
Write-Host ""

$projectRef = "hdeebyhwoogxawjkwufx"
$migrationFile = "supabase\migration.sql"

# 1. 로그인 확인
Write-Host "1️⃣ 로그인 상태 확인 중..." -ForegroundColor Yellow
$loginCheck = npx supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 로그인이 필요합니다!" -ForegroundColor Red
    Write-Host ""
    Write-Host "다음 명령어로 로그인하세요:" -ForegroundColor Yellow
    Write-Host "  npx supabase login" -ForegroundColor White
    Write-Host ""
    Write-Host "로그인 후 이 스크립트를 다시 실행하세요." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 로그인 확인됨" -ForegroundColor Green
Write-Host ""

# 2. 프로젝트 연결
Write-Host "2️⃣ 프로젝트 연결 중..." -ForegroundColor Yellow
npx supabase link --project-ref $projectRef

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 프로젝트 연결 실패" -ForegroundColor Red
    Write-Host "Project Ref를 확인하세요: $projectRef" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 프로젝트 연결 완료" -ForegroundColor Green
Write-Host ""

# 3. 마이그레이션 파일 준비
Write-Host "3️⃣ 마이그레이션 파일 준비 중..." -ForegroundColor Yellow

$migrationsDir = "supabase\migrations"
if (-not (Test-Path $migrationsDir)) {
    New-Item -ItemType Directory -Path $migrationsDir -Force | Out-Null
    Write-Host "✅ migrations 폴더 생성됨" -ForegroundColor Green
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$migrationFileName = "$timestamp`_initial_schema.sql"
$targetPath = Join-Path $migrationsDir $migrationFileName

if (Test-Path $migrationFile) {
    Copy-Item $migrationFile $targetPath -Force
    Write-Host "✅ 마이그레이션 파일 복사: $targetPath" -ForegroundColor Green
} else {
    Write-Host "❌ 마이그레이션 파일을 찾을 수 없습니다: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 4. 마이그레이션 실행
Write-Host "4️⃣ 마이그레이션 실행 중..." -ForegroundColor Yellow
Write-Host ""

npx supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ 마이그레이션 완료!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "다음 단계:" -ForegroundColor Cyan
    Write-Host "  1. Supabase Dashboard에서 테이블 확인" -ForegroundColor White
    Write-Host "     https://supabase.com/dashboard/project/$projectRef/editor" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. 환경 변수 설정 (web\.env.local)" -ForegroundColor White
    Write-Host "     NEXT_PUBLIC_SUPABASE_URL=https://hdeebyhwoogxawjkwufx.supabase.co" -ForegroundColor Gray
    Write-Host "     NEXT_PUBLIC_SUPABASE_ANON_KEY=(Dashboard > Settings > API에서 확인)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. 웹 앱 테스트" -ForegroundColor White
    Write-Host "     cd web" -ForegroundColor Gray
    Write-Host "     npm run dev" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ 마이그레이션 실패" -ForegroundColor Red
    Write-Host ""
    Write-Host "수동으로 실행하려면:" -ForegroundColor Yellow
    Write-Host "  1. Supabase Dashboard > SQL Editor 열기" -ForegroundColor White
    Write-Host "  2. $migrationFile 내용 복사하여 붙여넣기" -ForegroundColor White
    Write-Host "  3. Run 버튼 클릭" -ForegroundColor White
}

