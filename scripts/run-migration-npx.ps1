# npx를 사용한 Supabase 마이그레이션 실행 스크립트
# 
# 사용법:
# 1. 먼저 로그인: npx supabase login
# 2. 이 스크립트 실행: .\scripts\run-migration-npx.ps1

Write-Host "🚀 Supabase 마이그레이션 실행 (npx 사용)" -ForegroundColor Cyan
Write-Host ""

$projectRef = "hdeebyhwoogxawjkwufx"
$migrationFile = "supabase\migration.sql"

Write-Host "📋 프로젝트 정보:" -ForegroundColor Cyan
Write-Host "  Project Ref: $projectRef" -ForegroundColor White
Write-Host "  Migration File: $migrationFile" -ForegroundColor White
Write-Host ""

# 마이그레이션 파일 확인
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ 마이그레이션 파일을 찾을 수 없습니다: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 마이그레이션 파일 확인됨" -ForegroundColor Green
Write-Host ""

# 프로젝트 연결
Write-Host "🔗 프로젝트 연결 중..." -ForegroundColor Yellow
npx supabase link --project-ref $projectRef

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 프로젝트 연결 실패" -ForegroundColor Red
    Write-Host ""
    Write-Host "먼저 로그인하세요:" -ForegroundColor Yellow
    Write-Host "  npx supabase login" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "📦 마이그레이션 파일 준비 중..." -ForegroundColor Yellow

# migrations 폴더 생성
$migrationsDir = "supabase\migrations"
if (-not (Test-Path $migrationsDir)) {
    New-Item -ItemType Directory -Path $migrationsDir -Force | Out-Null
}

# 타임스탬프 생성
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$migrationFileName = "$timestamp`_initial_schema.sql"
$targetPath = Join-Path $migrationsDir $migrationFileName

Copy-Item $migrationFile $targetPath -Force
Write-Host "✅ 마이그레이션 파일 복사: $targetPath" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 마이그레이션 실행 중..." -ForegroundColor Yellow
Write-Host ""

npx supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 마이그레이션 완료!" -ForegroundColor Green
    Write-Host ""
    Write-Host "다음 단계:" -ForegroundColor Cyan
    Write-Host "  1. Supabase Dashboard에서 테이블 확인"
    Write-Host "     https://supabase.com/dashboard/project/$projectRef/editor"
    Write-Host "  2. web\.env.local 파일에 환경 변수 설정"
    Write-Host "  3. 웹 앱 테스트: cd web && npm run dev"
} else {
    Write-Host ""
    Write-Host "❌ 마이그레이션 실패" -ForegroundColor Red
    Write-Host ""
    Write-Host "수동으로 실행하려면:" -ForegroundColor Yellow
    Write-Host "  1. Supabase Dashboard > SQL Editor 열기"
    Write-Host "  2. $migrationFile 내용 복사하여 붙여넣기"
    Write-Host "  3. Run 버튼 클릭"
}

