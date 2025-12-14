# 설치 실패 원인 정확히 파악

Write-Host "=== 설치 실패 원인 정확히 파악 ===" -ForegroundColor Cyan
Write-Host ""

# Android SDK 경로
$possiblePaths = @("$env:LOCALAPPDATA\Android\Sdk", "$env:USERPROFILE\AppData\Local\Android\Sdk", "C:\Android\Sdk")
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $adbPath = Join-Path $path "platform-tools"
        if (Test-Path $adbPath) {
            $env:PATH = "$adbPath;$env:PATH"
            break
        }
    }
}

$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"

Write-Host "1. APK 파일 확인..." -ForegroundColor Yellow
if (-not (Test-Path $apkPath)) {
    Write-Host "   ❌ APK 없음" -ForegroundColor Red
    exit 1
}
$apk = Get-Item $apkPath
Write-Host "   ✅ APK 존재: $([math]::Round($apk.Length / 1MB, 2)) MB" -ForegroundColor Green

Write-Host ""
Write-Host "2. 디바이스 연결 확인..." -ForegroundColor Yellow
adb kill-server 2>&1 | Out-Null
Start-Sleep -Seconds 1
adb start-server 2>&1 | Out-Null
Start-Sleep -Seconds 2

$devices = adb devices 2>&1
$deviceList = $devices | Where-Object { $_ -match "device$" }

if ($deviceList.Count -eq 0) {
    Write-Host "   ❌ 디바이스 연결 안 됨" -ForegroundColor Red
    Write-Host ""
    Write-Host "핸드폰에서 설치 시도하면서 logcat으로 에러 확인:" -ForegroundColor Yellow
    Write-Host "1. 이 스크립트를 실행한 상태로 유지" -ForegroundColor White
    Write-Host "2. 핸드폰에서 APK 설치 시도" -ForegroundColor White
    Write-Host "3. 아래 명령어로 에러 로그 확인:" -ForegroundColor White
    Write-Host "   adb logcat -d | Select-String -Pattern 'INSTALL|PackageManager|error'" -ForegroundColor Cyan
    exit 1
}

Write-Host "   ✅ 디바이스 연결됨" -ForegroundColor Green

Write-Host ""
Write-Host "3. 기존 앱 완전 제거..." -ForegroundColor Yellow
adb uninstall com.bizconnectmobile 2>&1 | Out-Null
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "4. 로그 초기화 및 모니터링 시작..." -ForegroundColor Yellow
adb logcat -c 2>&1 | Out-Null

Write-Host ""
Write-Host "5. APK 설치 시도 (상세 로그 포함)..." -ForegroundColor Yellow
Write-Host "   설치 중..." -ForegroundColor Cyan

$installResult = adb install -r $apkPath 2>&1

Write-Host ""
$installResult | ForEach-Object {
    if ($_ -match "Success") {
        Write-Host "   ✅ $_" -ForegroundColor Green
    } elseif ($_ -match "error|Error|FAILED|fail") {
        Write-Host "   ❌ $_" -ForegroundColor Red
    } else {
        Write-Host "   $_" -ForegroundColor Gray
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "6. 상세 에러 로그 확인..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    
    $errorLog = adb logcat -d 2>&1 | Select-String -Pattern "INSTALL|PackageManager|bizconnect|error|Error|Exception" | Select-Object -Last 50
    if ($errorLog) {
        Write-Host ""
        Write-Host "   최근 에러 로그:" -ForegroundColor Cyan
        $errorLog | ForEach-Object { 
            if ($_ -match "INSTALL_FAILED|error|Error|Exception") {
                Write-Host "   ❌ $_" -ForegroundColor Red
            } else {
                Write-Host "   $_" -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host ""
    Write-Host "7. 패키지 매니저 상세 정보..." -ForegroundColor Yellow
    $pmInfo = adb shell dumpsys package com.bizconnectmobile 2>&1 | Select-String -Pattern "versionCode|versionName|signatures|INSTALL"
    if ($pmInfo) {
        $pmInfo | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    }
}

Write-Host ""
Write-Host "=== 완료 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "에러 로그를 확인하여 정확한 원인을 파악하세요." -ForegroundColor Yellow

