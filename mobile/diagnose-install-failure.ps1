# 설치 실패 원인 진단 스크립트

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "APK 설치 실패 원인 진단" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

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

$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"

Write-Host "1. APK 파일 검증..." -ForegroundColor Yellow
if (Test-Path $apkPath) {
    $apk = Get-Item $apkPath
    Write-Host "   ✅ 파일 존재: $([math]::Round($apk.Length / 1MB, 2)) MB" -ForegroundColor Green
    
    # APK 서명 확인
    Write-Host "   APK 서명 확인 중..." -ForegroundColor Gray
    try {
        $signInfo = & jarsigner -verify -verbose -certs $apkPath 2>&1
        if ($signInfo -match "jar verified") {
            Write-Host "   ✅ APK 서명 정상" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  APK 서명 문제 가능성" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ⚠️  서명 확인 도구 없음" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ APK 파일 없음" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. 패키지 정보 확인..." -ForegroundColor Yellow
try {
    $aaptPath = $null
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $buildTools = Join-Path $path "build-tools"
            if (Test-Path $buildTools) {
                $latest = Get-ChildItem $buildTools -Directory | Sort-Object Name -Descending | Select-Object -First 1
                if ($latest) {
                    $aapt = Join-Path $latest.FullName "aapt.exe"
                    if (Test-Path $aapt) {
                        $aaptPath = $aapt
                        break
                    }
                }
            }
        }
    }
    
    if ($aaptPath) {
        $packageInfo = & $aaptPath dump badging $apkPath 2>&1
        $packageName = $packageInfo | Select-String -Pattern "package: name='([^']+)'" | ForEach-Object { $_.Matches.Groups[1].Value }
        $versionCode = $packageInfo | Select-String -Pattern "versionCode='(\d+)'" | ForEach-Object { $_.Matches.Groups[1].Value }
        $minSdk = $packageInfo | Select-String -Pattern "sdkVersion:'(\d+)'" | ForEach-Object { $_.Matches.Groups[1].Value }
        
        Write-Host "   패키지 이름: $packageName" -ForegroundColor White
        Write-Host "   버전 코드: $versionCode" -ForegroundColor White
        Write-Host "   최소 SDK: $minSdk" -ForegroundColor White
    }
} catch {
    Write-Host "   ⚠️  패키지 정보 확인 불가" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3. 디바이스 연결 확인..." -ForegroundColor Yellow
$devices = adb devices 2>&1
$deviceList = $devices | Where-Object { $_ -match "device$" }

if ($deviceList.Count -gt 0) {
    Write-Host "   ✅ 디바이스 연결됨" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "4. 기존 앱 확인..." -ForegroundColor Yellow
    $installed = adb shell pm list packages | Select-String "bizconnectmobile"
    if ($installed) {
        Write-Host "   ⚠️  기존 앱 설치됨: $installed" -ForegroundColor Yellow
        
        Write-Host ""
        Write-Host "5. 기존 앱 상세 정보..." -ForegroundColor Yellow
        $appInfo = adb shell dumpsys package com.bizconnectmobile 2>&1 | Select-String -Pattern "versionCode|signatures"
        if ($appInfo) {
            $appInfo | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
        }
        
        Write-Host ""
        Write-Host "6. 설치 시도 및 상세 에러 로그..." -ForegroundColor Yellow
        Write-Host "   (에러 메시지를 확인합니다)" -ForegroundColor Gray
        $installResult = adb install -r $apkPath 2>&1
        $installResult | ForEach-Object { 
            if ($_ -match "error|Error|FAILED|fail") {
                Write-Host "   ❌ $_" -ForegroundColor Red
            } else {
                Write-Host "   $_" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "   ✅ 기존 앱 없음" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "4. 설치 시도..." -ForegroundColor Yellow
        $installResult = adb install $apkPath 2>&1
        $installResult | ForEach-Object { 
            if ($_ -match "error|Error|FAILED|fail") {
                Write-Host "   ❌ $_" -ForegroundColor Red
            } elseif ($_ -match "Success") {
                Write-Host "   ✅ $_" -ForegroundColor Green
            } else {
                Write-Host "   $_" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Host "   ❌ 디바이스 연결 안 됨" -ForegroundColor Red
    Write-Host ""
    Write-Host "핸드폰에서 직접 설치할 때:" -ForegroundColor Yellow
    Write-Host "1. 정확한 에러 메시지를 확인하세요" -ForegroundColor Cyan
    Write-Host "2. 설정 → 앱에서 'BizConnect' 검색하여 제거" -ForegroundColor Cyan
    Write-Host "3. 저장 공간 확인 (최소 100MB 필요)" -ForegroundColor Cyan
    Write-Host "4. Android 버전 확인 (최소 Android 5.0 필요)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "진단 완료" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "핸드폰에서 보이는 정확한 에러 메시지를 알려주세요:" -ForegroundColor Yellow
Write-Host "- '앱이 이미 설치되어 있습니다'" -ForegroundColor White
Write-Host "- '패키지가 손상되었습니다'" -ForegroundColor White
Write-Host "- '저장 공간이 부족합니다'" -ForegroundColor White
Write-Host "- '이 앱은 기기와 호환되지 않습니다'" -ForegroundColor White
Write-Host "- 기타 메시지" -ForegroundColor White

