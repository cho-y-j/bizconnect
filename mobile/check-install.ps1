# APK 설치 문제 진단 스크립트

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "APK 설치 문제 진단" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 디바이스 연결 확인
Write-Host "1. 연결된 디바이스 확인..." -ForegroundColor Yellow
$devices = adb devices 2>&1
$deviceCount = ($devices | Where-Object { $_ -match "device$" }).Count

if ($deviceCount -eq 0) {
    Write-Host "   ❌ 연결된 디바이스가 없습니다!" -ForegroundColor Red
    Write-Host "   USB 디버깅을 활성화하고 기기를 연결하세요." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "   ✅ 연결된 디바이스: $deviceCount 개" -ForegroundColor Green
    $devices | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
}

# 2. 기존 앱 설치 여부 확인
Write-Host ""
Write-Host "2. 기존 앱 설치 여부 확인..." -ForegroundColor Yellow
$installed = adb shell pm list packages | Select-String "bizconnectmobile"
if ($installed) {
    Write-Host "   ⚠️  기존 앱이 설치되어 있습니다: $installed" -ForegroundColor Yellow
    Write-Host "   기존 앱을 제거해야 할 수 있습니다." -ForegroundColor Yellow
} else {
    Write-Host "   ✅ 기존 앱이 없습니다." -ForegroundColor Green
}

# 3. APK 파일 존재 확인
Write-Host ""
Write-Host "3. APK 파일 확인..." -ForegroundColor Yellow
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkInfo = Get-Item $apkPath
    Write-Host "   ✅ APK 파일 존재: $($apkInfo.Name)" -ForegroundColor Green
    Write-Host "      크기: $([math]::Round($apkInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "      수정일: $($apkInfo.LastWriteTime)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ APK 파일이 없습니다!" -ForegroundColor Red
    Write-Host "   먼저 빌드를 실행하세요: cd android; .\gradlew assembleDebug" -ForegroundColor Yellow
    exit 1
}

# 4. 기기 저장 공간 확인
Write-Host ""
Write-Host "4. 기기 저장 공간 확인..." -ForegroundColor Yellow
$storage = adb shell df /data 2>&1 | Select-String -Pattern "\d+%"
if ($storage) {
    Write-Host "   저장 공간: $storage" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  저장 공간 정보를 가져올 수 없습니다." -ForegroundColor Yellow
}

# 5. Android 버전 확인
Write-Host ""
Write-Host "5. 기기 Android 버전 확인..." -ForegroundColor Yellow
$sdkVersion = adb shell getprop ro.build.version.sdk 2>&1
$androidVersion = adb shell getprop ro.build.version.release 2>&1
Write-Host "   Android 버전: $androidVersion (SDK $sdkVersion)" -ForegroundColor Gray

# 6. 설치 시도 (테스트)
Write-Host ""
Write-Host "6. 설치 테스트..." -ForegroundColor Yellow
Write-Host "   다음 명령어로 설치를 시도하세요:" -ForegroundColor Cyan
Write-Host "   adb install -r $apkPath" -ForegroundColor White
Write-Host ""
Write-Host "   또는 기존 앱을 먼저 제거:" -ForegroundColor Cyan
Write-Host "   adb uninstall com.bizconnectmobile" -ForegroundColor White
Write-Host "   adb install $apkPath" -ForegroundColor White

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "진단 완료" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

