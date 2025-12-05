# Supabase CLI를 사용한 마이그레이션 자동화 스크립트 (PowerShell)
# 
# 사용법:
# 1. Supabase CLI 설치: npm install -g supabase
# 2. 이 스크립트 실행: .\scripts\setup-supabase-cli.ps1

Write-Host "🚀 Supabase 마이그레이션 자동화 스크립트" -ForegroundColor Cyan
Write-Host ""

# Supabase CLI 설치 확인
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI가 설치되지 않았습니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "설치 방법 (선택 1):" -ForegroundColor Yellow
    Write-Host "  1. Scoop 설치 (아직 설치 안 된 경우):" -ForegroundColor White
    Write-Host "     Set-ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Gray
    Write-Host "     irm get.scoop.sh | iex" -ForegroundColor Gray
    Write-Host "  2. Supabase CLI 설치:" -ForegroundColor White
    Write-Host "     scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor Gray
    Write-Host "     scoop install supabase" -ForegroundColor Gray
    Write-Host ""
    Write-Host "설치 방법 (선택 2 - npx 사용):" -ForegroundColor Yellow
    Write-Host "  npx supabase [명령어]" -ForegroundColor White
    Write-Host ""
    Write-Host "npx로 진행하시겠습니까? (Y/N)" -ForegroundColor Yellow
    $useNpx = Read-Host
    if ($useNpx -eq "Y" -or $useNpx -eq "y") {
        $script:useNpx = $true
        Write-Host "✅ npx를 사용하여 진행합니다." -ForegroundColor Green
    } else {
        Write-Host "설치 후 다시 실행하세요." -ForegroundColor Yellow
        exit 1
    }
} else {
    $script:useNpx = $false
}

Write-Host "✅ Supabase CLI 확인됨" -ForegroundColor Green
Write-Host ""

# 현재 프로젝트 정보
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

# 사용자에게 선택지 제공
Write-Host "실행 방법을 선택하세요:" -ForegroundColor Yellow
Write-Host "  1. Supabase CLI로 마이그레이션 실행 (권장)"
Write-Host "  2. SQL 파일 내용을 클립보드에 복사 (수동 실행용)"
Write-Host "  3. 취소"
Write-Host ""
$choice = Read-Host "선택 (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔐 Supabase 로그인이 필요합니다..." -ForegroundColor Yellow
        Write-Host ""
        
        # 명령어 프리픽스 설정
        $supabaseCmd = if ($script:useNpx) { "npx supabase" } else { "supabase" }
        
        # 로그인 확인
        $loginCheck = Invoke-Expression "$supabaseCmd projects list" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "로그인 중..." -ForegroundColor Yellow
            Invoke-Expression "$supabaseCmd login"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ 로그인 실패" -ForegroundColor Red
                exit 1
            }
        }
        
        Write-Host ""
        Write-Host "🔗 프로젝트 연결 중..." -ForegroundColor Yellow
        Invoke-Expression "$supabaseCmd link --project-ref $projectRef"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ 프로젝트 연결 실패" -ForegroundColor Red
            Write-Host ""
            Write-Host "수동으로 연결하려면:" -ForegroundColor Yellow
            Write-Host "  supabase link --project-ref $projectRef" -ForegroundColor White
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
        
        Invoke-Expression "$supabaseCmd db push"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ 마이그레이션 완료!" -ForegroundColor Green
            Write-Host ""
            Write-Host "다음 단계:" -ForegroundColor Cyan
            Write-Host "  1. Supabase Dashboard에서 테이블 확인"
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
    }
    "2" {
        Write-Host ""
        Write-Host "📋 SQL 파일 내용을 클립보드에 복사합니다..." -ForegroundColor Yellow
        
        $sqlContent = Get-Content $migrationFile -Raw
        Set-Clipboard -Value $sqlContent
        
        Write-Host "✅ 클립보드에 복사되었습니다!" -ForegroundColor Green
        Write-Host ""
        Write-Host "다음 단계:" -ForegroundColor Cyan
        Write-Host "  1. Supabase Dashboard > SQL Editor 열기"
        Write-Host "     https://supabase.com/dashboard/project/$projectRef/sql/new"
        Write-Host "  2. Ctrl+V로 붙여넣기"
        Write-Host "  3. Run 버튼 클릭 (또는 Ctrl+Enter)"
    }
    "3" {
        Write-Host ""
        Write-Host "취소되었습니다." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host ""
        Write-Host "❌ 잘못된 선택입니다." -ForegroundColor Red
        exit 1
    }
}

