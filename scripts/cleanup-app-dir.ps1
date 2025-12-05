# web/app 디렉토리 정리 스크립트
# 개발 서버를 중지한 후 실행하세요

Write-Host "🧹 web/app 디렉토리 정리 중..." -ForegroundColor Yellow

$appDir = "web\app"
$srcAppDir = "web\src\app"

if (Test-Path $appDir) {
    Write-Host "✅ web/app 디렉토리 발견" -ForegroundColor Green
    
    # API 디렉토리 확인 및 복사
    if (Test-Path "$appDir\api") {
        Write-Host "📁 API 디렉토리 확인..." -ForegroundColor Cyan
        if (-not (Test-Path "$srcAppDir\api")) {
            Copy-Item -Path "$appDir\api" -Destination "$srcAppDir\api" -Recurse -Force
            Write-Host "✅ API 디렉토리 복사 완료" -ForegroundColor Green
        } else {
            Write-Host "⚠️  src/app/api가 이미 존재합니다" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "🗑️  web/app 디렉토리 삭제 시도..." -ForegroundColor Yellow
    
    # 개발 서버가 실행 중이면 파일이 잠겨있을 수 있음
    try {
        Remove-Item -Path $appDir -Recurse -Force
        Write-Host "✅ web/app 디렉토리 삭제 완료!" -ForegroundColor Green
    } catch {
        Write-Host "❌ 삭제 실패: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 해결 방법:" -ForegroundColor Yellow
        Write-Host "  1. 개발 서버를 중지하세요 (Ctrl+C)" -ForegroundColor White
        Write-Host "  2. 파일 탐색기에서 수동으로 삭제하세요" -ForegroundColor White
        Write-Host "     경로: $((Resolve-Path $appDir).Path)" -ForegroundColor Gray
    }
} else {
    Write-Host "✅ web/app 디렉토리가 이미 없습니다" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 최종 확인:" -ForegroundColor Cyan
if (Test-Path $appDir) {
    Write-Host "  ⚠️  web/app 디렉토리가 여전히 존재합니다" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ web/app 디렉토리 정리 완료!" -ForegroundColor Green
}

