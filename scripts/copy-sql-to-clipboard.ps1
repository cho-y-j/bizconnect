# SQL 파일 내용을 클립보드에 복사하는 스크립트
# Dashboard에서 바로 붙여넣을 수 있습니다

$migrationFile = "supabase\migration.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ 마이그레이션 파일을 찾을 수 없습니다: $migrationFile" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $migrationFile -Raw
Set-Clipboard -Value $sqlContent

Write-Host "✅ SQL 내용이 클립보드에 복사되었습니다!" -ForegroundColor Green
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "  1. Supabase Dashboard 열기:" -ForegroundColor White
Write-Host "     https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/sql/new" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. SQL Editor에서 Ctrl+V로 붙여넣기" -ForegroundColor White
Write-Host ""
Write-Host "  3. Run 버튼 클릭 (또는 Ctrl+Enter)" -ForegroundColor White
Write-Host ""
Write-Host "  4. 'Success. No rows returned' 메시지 확인" -ForegroundColor White

