# APK 설치 문제 해결 스크립트

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "APK 설치 문제 해결" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Android SDK 경로 찾기
$possiblePaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk"
)

$foundPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $foundPath = $path
        break
    }
}

if ($foundPath) {
    $adbPath = Join-Path $foundPath "platform-tools"
    if (Test-Path $adbPath) {
        $env:PATH = "$adbPath;$env:PATH"
        Write-Host "✅ ADB 경로 설정 완료" -ForegroundColor Green
    }
}

# 1. 디바이스 확인
Write-Host ""
Write-Host "1. 연결된 디바이스 확인..." -ForegroundColor Yellow
$devices = adb devices 2>&1
$deviceList = $devices | Where-Object { $_ -match "device$" }

if ($deviceList.Count -eq 0) {
    Write-Host "   ⚠️  연결된 디바이스가 없습니다." -ForegroundColor Yellow
    Write-Host "   USB 디버깅을 활성화하고 기기를 연결하세요." -ForegroundColor Gray
    Write-Host ""
    Write-Host "   또는 핸드폰에서 직접 설치하세요:" -ForegroundColor Cyan
    Write-Host "   1. APK 파일을 핸드폰으로 복사" -ForegroundColor White
    Write-Host "   2. 파일 관리자에서 APK 파일 열기" -ForegroundColor White
    Write-Host "   3. '알 수 없는 소스' 허용 (설정 → 보안)" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "   ✅ 연결된 디바이스: $($deviceList.Count) 개" -ForegroundColor Green
    $devices | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
}

# 2. 기존 앱 확인 및 제거
Write-Host ""
Write-Host "2. 기존 앱 확인..." -ForegroundColor Yellow
if ($deviceList.Count -gt 0) {
    $installed = adb shell pm list packages | Select-String "bizconnectmobile"
    if ($installed) {
        Write-Host "   ⚠️  기존 앱이 설치되어 있습니다." -ForegroundColor Yellow
        Write-Host "   기존 앱을 제거합니다..." -ForegroundColor Gray
        adb uninstall com.bizconnectmobile 2>&1 | Out-Null
        Write-Host "   ✅ 제거 완료" -ForegroundColor Green
    } else {
        Write-Host "   ✅ 기존 앱이 없습니다." -ForegroundColor Green
    }
}

# 3. APK 파일 확인
Write-Host ""
Write-Host "3. APK 파일 확인..." -ForegroundColor Yellow
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkInfo = Get-Item $apkPath
    Write-Host "   ✅ APK 파일 존재" -ForegroundColor Green
    Write-Host "      크기: $([math]::Round($apkInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "      위치: $($apkInfo.FullName)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ APK 파일이 없습니다!" -ForegroundColor Red
    exit 1
}

# 4. 설치 시도 (디바이스가 연결된 경우)
if ($deviceList.Count -gt 0) {
    Write-Host ""
    Write-Host "4. APK 설치 시도..." -ForegroundColor Yellow
    $installResult = adb install -r $apkPath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✅ 설치 성공!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "❌ 설치 실패" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "에러 메시지:" -ForegroundColor Yellow
        $installResult | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        Write-Host ""
        Write-Host "일반적인 해결 방법:" -ForegroundColor Cyan
        Write-Host "  1. 기존 앱 완전히 제거: adb uninstall com.bizconnectmobile" -ForegroundColor White
        Write-Host "  2. 기기 재부팅" -ForegroundColor White
        Write-Host "  3. USB 디버깅 재활성화" -ForegroundColor White
        Write-Host "  4. 다른 USB 케이블/포트 시도" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "4. 핸드폰에서 직접 설치하는 경우..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   일반적인 설치 실패 원인:" -ForegroundColor Cyan
    Write-Host "   1. '알 수 없는 소스' 허용 안 함" -ForegroundColor White
    Write-Host "      → 설정 → 보안 → 알 수 없는 소스 허용" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. 같은 패키지 이름의 앱이 이미 설치됨" -ForegroundColor White
    Write-Host "      → 설정 → 앱 → BizConnect 찾아서 제거" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   3. 저장 공간 부족" -ForegroundColor White
    Write-Host "      → 불필요한 앱/파일 삭제" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   4. Android 버전이 너무 낮음" -ForegroundColor White
    Write-Host "      → 최소 Android 버전 확인 필요" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   APK 파일 위치:" -ForegroundColor Cyan
    Write-Host "   $((Get-Item $apkPath).FullName)" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

