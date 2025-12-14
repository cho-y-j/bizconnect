# APK 파일 검증 스크립트

Write-Host "=== APK 파일 상세 검증 ===" -ForegroundColor Cyan
Write-Host ""

$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $apkPath)) {
    Write-Host "❌ APK 파일이 없습니다!" -ForegroundColor Red
    exit 1
}

$apk = Get-Item $apkPath
Write-Host "파일 정보:" -ForegroundColor Yellow
Write-Host "  위치: $($apk.FullName)" -ForegroundColor White
Write-Host "  크기: $([math]::Round($apk.Length / 1MB, 2)) MB" -ForegroundColor White
Write-Host "  수정일: $($apk.LastWriteTime)" -ForegroundColor White
Write-Host ""

# Android SDK 경로 찾기
$possiblePaths = @("$env:LOCALAPPDATA\Android\Sdk", "$env:USERPROFILE\AppData\Local\Android\Sdk", "C:\Android\Sdk")
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $aaptPath = Join-Path $path "build-tools"
        if (Test-Path $aaptPath) {
            $buildTools = Get-ChildItem $aaptPath -Directory | Sort-Object Name -Descending | Select-Object -First 1
            if ($buildTools) {
                $aapt = Join-Path $buildTools.FullName "aapt.exe"
                if (Test-Path $aapt) {
                    $env:PATH = "$($buildTools.FullName);$env:PATH"
                    break
                }
            }
        }
    }
}

# aapt로 APK 정보 확인
Write-Host "APK 패키지 정보:" -ForegroundColor Yellow
try {
    $packageInfo = & aapt dump badging $apkPath 2>&1 | Select-String -Pattern "package:|application-label:|native-code:"
    if ($packageInfo) {
        $packageInfo | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    } else {
        Write-Host "  ⚠️  aapt를 사용할 수 없습니다." -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  aapt를 사용할 수 없습니다." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 핸드폰에서 확인할 사항 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "핸드폰에서 APK 설치 시 나타나는 정확한 에러 메시지를 확인하세요:" -ForegroundColor Yellow
Write-Host ""
Write-Host "가능한 에러 메시지들:" -ForegroundColor Cyan
Write-Host "  1. '앱이 이미 설치되어 있습니다'" -ForegroundColor White
Write-Host "  2. '패키지가 손상되었습니다'" -ForegroundColor White
Write-Host "  3. '저장 공간이 부족합니다'" -ForegroundColor White
Write-Host "  4. '이 앱은 기기와 호환되지 않습니다'" -ForegroundColor White
Write-Host "  5. '앱이 설치되지 않습니다' (구체적인 이유 없음)" -ForegroundColor White
Write-Host ""
Write-Host "정확한 에러 메시지를 알려주시면 해결 방법을 제시하겠습니다." -ForegroundColor Yellow

