# Supabase 연결 체크 스크립트
Write-Host "🔍 Supabase 연결 상태 확인 중...`n" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/test-connection" -Method Get
    
    Write-Host "📊 테스트 결과:`n" -ForegroundColor Yellow
    
    foreach ($test in $response.tests) {
        $statusIcon = if ($test.status -eq "success") { "✅" } elseif ($test.status -eq "warning") { "⚠️ " } else { "❌" }
        $statusColor = if ($test.status -eq "success") { "Green" } elseif ($test.status -eq "warning") { "Yellow" } else { "Red" }
        
        Write-Host "$statusIcon $($test.name)" -ForegroundColor $statusColor
        Write-Host "   $($test.message)" -ForegroundColor Gray
        if ($test.session) {
            Write-Host "   세션: $($test.session)" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    if ($response.overall -eq "success") {
        Write-Host "✅ 전체 상태: 정상" -ForegroundColor Green
    } else {
        Write-Host "❌ 전체 상태: 문제 있음" -ForegroundColor Red
    }
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ 연결 테스트 실패" -ForegroundColor Red
    Write-Host "에러: $_" -ForegroundColor Red
    Write-Host "`n💡 개발 서버가 실행 중인지 확인하세요:" -ForegroundColor Yellow
    Write-Host "   npm run dev" -ForegroundColor White
}

