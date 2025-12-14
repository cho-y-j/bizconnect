# 빠른 빌드 스크립트

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BizConnect Mobile 빠른 빌드" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Android SDK 경로 찾기
$androidSdkPath = $null
$possiblePaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $androidSdkPath = $path
        $env:ANDROID_HOME = $path
        $env:PATH = "$path\platform-tools;$path\tools;$env:PATH"
        Write-Host "Android SDK 찾음: $path" -ForegroundColor Green
        break
    }
}

if (-not $androidSdkPath) {
    Write-Host "경고: Android SDK를 자동으로 찾을 수 없습니다." -ForegroundColor Yellow
    Write-Host "수동으로 경로를 입력하세요 (예: C:\Users\YourName\AppData\Local\Android\Sdk)" -ForegroundColor Yellow
    $manualPath = Read-Host "Android SDK 경로"
    if ($manualPath -and (Test-Path $manualPath)) {
        $env:ANDROID_HOME = $manualPath
        $env:PATH = "$manualPath\platform-tools;$manualPath\tools;$env:PATH"
        Write-Host "경로 설정 완료: $manualPath" -ForegroundColor Green
    } else {
        Write-Host "오류: 유효하지 않은 경로입니다." -ForegroundColor Red
        exit 1
    }
}

# adb 확인
Write-Host ""
Write-Host "연결된 디바이스 확인 중..." -ForegroundColor Cyan
try {
    $devices = adb devices 2>&1
    $deviceCount = ($devices | Where-Object { $_ -match "device$" }).Count
    
    if ($deviceCount -gt 0) {
        Write-Host "연결된 디바이스:" -ForegroundColor Green
        $devices | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Host "경고: 연결된 디바이스가 없습니다." -ForegroundColor Yellow
        Write-Host "Android 기기를 USB로 연결하거나 에뮬레이터를 실행하세요." -ForegroundColor Yellow
    }
} catch {
    Write-Host "adb를 실행할 수 없습니다." -ForegroundColor Yellow
}

# Metro 번들러 확인
Write-Host ""
Write-Host "중요: Metro 번들러가 별도 터미널에서 실행 중이어야 합니다!" -ForegroundColor Yellow
Write-Host "새 PowerShell 창에서 다음 명령어를 실행하세요:" -ForegroundColor Cyan
Write-Host "  cd $((Get-Location).Path)" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""

# 빌드 및 실행
Write-Host "앱 빌드 및 실행 중..." -ForegroundColor Cyan
Write-Host "이 작업은 몇 분이 걸릴 수 있습니다..." -ForegroundColor Yellow
Write-Host ""

npx react-native run-android

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "성공! 앱이 실행되었습니다!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "빌드 중 오류가 발생했습니다." -ForegroundColor Red
    Write-Host "위의 오류 메시지를 확인하세요." -ForegroundColor Yellow
}



