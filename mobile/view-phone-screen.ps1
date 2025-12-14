# 핸드폰 화면 확인 및 설치 원인 파악 스크립트

# Android SDK 경로 설정
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

Write-Host "=== 핸드폰 화면 확인 및 설치 원인 파악 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 디바이스 확인
Write-Host "1. 디바이스 연결 확인..." -ForegroundColor Yellow
adb kill-server 2>&1 | Out-Null
Start-Sleep -Seconds 1
adb start-server 2>&1 | Out-Null
Start-Sleep -Seconds 2

$devices = adb devices 2>&1
$deviceList = $devices | Where-Object { $_ -match "device$" }

if ($deviceList.Count -eq 0) {
    Write-Host "❌ 디바이스 연결 안 됨" -ForegroundColor Red
    Write-Host ""
    Write-Host "확인 사항:" -ForegroundColor Yellow
    Write-Host "  1. USB 케이블 연결 확인" -ForegroundColor White
    Write-Host "  2. 핸드폰에서 'USB 디버깅 허용' 팝업 승인" -ForegroundColor White
    Write-Host "  3. USB 연결 모드: '파일 전송' 또는 'MTP'" -ForegroundColor White
    Write-Host "  4. 개발자 옵션 > USB 디버깅 활성화" -ForegroundColor White
    exit 1
}

Write-Host "✅ 디바이스 연결됨" -ForegroundColor Green
$devices | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }

# 2. 스크린샷
Write-Host ""
Write-Host "2. 현재 화면 스크린샷 찍기..." -ForegroundColor Yellow
$screenshotPath = "phone-screenshot-$(Get-Date -Format 'yyyyMMdd-HHmmss').png"
adb shell screencap -p /sdcard/screenshot.png 2>&1 | Out-Null
adb pull /sdcard/screenshot.png $screenshotPath 2>&1 | Out-Null

if (Test-Path $screenshotPath) {
    Write-Host "✅ 스크린샷 저장됨: $screenshotPath" -ForegroundColor Green
    Write-Host "   파일을 열어서 확인하세요." -ForegroundColor Cyan
    Start-Process $screenshotPath
} else {
    Write-Host "❌ 스크린샷 실패" -ForegroundColor Red
}

# 3. 기존 앱 확인
Write-Host ""
Write-Host "3. 기존 앱 확인..." -ForegroundColor Yellow
$installed = adb shell pm list packages | Select-String "bizconnectmobile"
if ($installed) {
    Write-Host "⚠️  기존 앱 설치됨" -ForegroundColor Yellow
    $appInfo = adb shell dumpsys package com.bizconnectmobile 2>&1 | Select-String -Pattern "versionCode|versionName|signatures"
    if ($appInfo) {
        Write-Host "   기존 앱 정보:" -ForegroundColor Gray
        $appInfo | Select-Object -First 5 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    }
} else {
    Write-Host "✅ 기존 앱 없음" -ForegroundColor Green
}

# 4. 설치 시도 및 로그 확인
Write-Host ""
Write-Host "4. APK 설치 시도 및 에러 로그 확인..." -ForegroundColor Yellow
Write-Host "   (에러가 발생하면 로그를 확인합니다)" -ForegroundColor Gray
Write-Host ""

$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkPath)) {
    Write-Host "❌ APK 파일 없음: $apkPath" -ForegroundColor Red
    exit 1
}

# 로그 초기화
adb logcat -c 2>&1 | Out-Null

# 설치 시도
Write-Host "   설치 중..." -ForegroundColor Cyan
$installResult = adb install -r $apkPath 2>&1

Write-Host ""
$installResult | ForEach-Object { 
    if ($_ -match "Success") {
        Write-Host "✅ $_" -ForegroundColor Green
    } elseif ($_ -match "error|Error|FAILED|fail") {
        Write-Host "❌ $_" -ForegroundColor Red
    } else {
        Write-Host "   $_" -ForegroundColor Gray
    }
}

# 5. 에러 로그 확인
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "5. 상세 에러 로그 확인..." -ForegroundColor Yellow
    Start-Sleep -Seconds 1
    
    $errorLog = adb logcat -d 2>&1 | Select-String -Pattern "INSTALL|PackageManager|bizconnect|error|Error" | Select-Object -Last 30
    if ($errorLog) {
        Write-Host "   최근 에러 로그:" -ForegroundColor Cyan
        $errorLog | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    }
    
    Write-Host ""
    Write-Host "6. 패키지 매니저 로그 확인..." -ForegroundColor Yellow
    $pmLog = adb logcat -d | Select-String -Pattern "PackageManager.*bizconnect" | Select-Object -Last 10
    if ($pmLog) {
        $pmLog | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
    }
}

Write-Host ""
Write-Host "=== 완료 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "스크린샷 파일을 확인하여 핸드폰 화면의 에러 메시지를 확인하세요." -ForegroundColor Yellow

