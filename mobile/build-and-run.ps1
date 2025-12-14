# React Native 앱 빌드 및 실행 스크립트

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BizConnect Mobile 앱 빌드 및 실행" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 현재 디렉토리 확인
$currentDir = Get-Location
Write-Host "현재 디렉토리: $currentDir" -ForegroundColor Yellow

# mobile 폴더로 이동
if (-not (Test-Path "package.json")) {
    if (Test-Path "mobile\package.json") {
        Set-Location "mobile"
        Write-Host "mobile 폴더로 이동했습니다." -ForegroundColor Green
    } else {
        Write-Host "오류: package.json을 찾을 수 없습니다." -ForegroundColor Red
        exit 1
    }
}

# 1. 의존성 확인
Write-Host ""
Write-Host "1. 의존성 확인 중..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules가 없습니다. npm install을 실행합니다..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install 실패!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "의존성이 이미 설치되어 있습니다." -ForegroundColor Green
}

# 2. Android SDK 경로 확인
Write-Host ""
Write-Host "2. Android SDK 확인 중..." -ForegroundColor Cyan
$androidHome = $env:ANDROID_HOME
if (-not $androidHome) {
    # 일반적인 경로 확인
    $possiblePaths = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:USERPROFILE\AppData\Local\Android\Sdk",
        "C:\Android\Sdk"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $androidHome = $path
            $env:ANDROID_HOME = $path
            Write-Host "Android SDK를 찾았습니다: $path" -ForegroundColor Green
            break
        }
    }
    
    if (-not $androidHome) {
        Write-Host "경고: Android SDK를 찾을 수 없습니다." -ForegroundColor Yellow
        Write-Host "ANDROID_HOME 환경 변수를 설정하거나 Android Studio를 설치하세요." -ForegroundColor Yellow
    }
} else {
    Write-Host "Android SDK 경로: $androidHome" -ForegroundColor Green
}

# 3. adb 경로 추가
if ($androidHome) {
    $adbPath = Join-Path $androidHome "platform-tools"
    if (Test-Path $adbPath) {
        $env:PATH = "$adbPath;$env:PATH"
        Write-Host "adb 경로 추가됨: $adbPath" -ForegroundColor Green
    }
}

# 4. 연결된 디바이스 확인
Write-Host ""
Write-Host "3. 연결된 디바이스 확인 중..." -ForegroundColor Cyan
try {
    $devices = adb devices 2>&1
    $deviceList = $devices | Where-Object { $_ -match "device$" }
    
    if ($deviceList.Count -gt 0) {
        Write-Host "연결된 디바이스:" -ForegroundColor Green
        $devices | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    } else {
        Write-Host "경고: 연결된 디바이스가 없습니다." -ForegroundColor Yellow
        Write-Host "Android 기기를 USB로 연결하거나 에뮬레이터를 실행하세요." -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "계속 진행하시겠습니까? (y/n)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            exit 0
        }
    }
} catch {
    Write-Host "adb를 찾을 수 없습니다. Android SDK가 설치되어 있는지 확인하세요." -ForegroundColor Yellow
}

# 5. Metro 번들러 시작 여부 확인
Write-Host ""
Write-Host "4. Metro 번들러 확인 중..." -ForegroundColor Cyan
Write-Host "중요: Metro 번들러는 별도 터미널에서 실행해야 합니다!" -ForegroundColor Yellow
Write-Host ""
Write-Host "다음 명령어를 새 터미널에서 실행하세요:" -ForegroundColor Cyan
Write-Host "  cd $((Get-Location).Path)" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
$metroRunning = Read-Host "Metro 번들러가 실행 중입니까? (y/n)"

if ($metroRunning -ne "y" -and $metroRunning -ne "Y") {
    Write-Host ""
    Write-Host "Metro 번들러를 먼저 시작하세요." -ForegroundColor Yellow
    Write-Host "새 PowerShell 창을 열고 다음 명령어를 실행하세요:" -ForegroundColor Yellow
    Write-Host "  cd $((Get-Location).Path)" -ForegroundColor White
    Write-Host "  npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "Metro 번들러가 시작되면 이 스크립트를 다시 실행하세요." -ForegroundColor Yellow
    exit 0
}

# 6. Android 빌드 및 실행
Write-Host ""
Write-Host "5. Android 앱 빌드 및 실행 중..." -ForegroundColor Cyan
Write-Host "이 작업은 몇 분이 걸릴 수 있습니다..." -ForegroundColor Yellow
Write-Host ""

# Gradle 래퍼 확인
if (-not (Test-Path "android\gradlew.bat")) {
    Write-Host "오류: Gradle 래퍼를 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

# React Native CLI로 실행
try {
    Write-Host "npx react-native run-android 실행 중..." -ForegroundColor Yellow
    npx react-native run-android
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "빌드 및 실행 성공!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "앱이 디바이스에 설치되고 실행되었습니다." -ForegroundColor Green
        Write-Host ""
        Write-Host "다음 단계:" -ForegroundColor Cyan
        Write-Host "1. 앱에서 로그인 화면 확인" -ForegroundColor White
        Write-Host "2. 권한 요청 다이얼로그에서 '허용' 클릭" -ForegroundColor White
        Write-Host "3. 앱이 정상적으로 작동하는지 확인" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "빌드 중 오류가 발생했습니다." -ForegroundColor Red
        Write-Host "위의 오류 메시지를 확인하세요." -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "오류 발생: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "수동으로 빌드하려면:" -ForegroundColor Yellow
    Write-Host "  cd android" -ForegroundColor White
    Write-Host "  .\gradlew assembleDebug" -ForegroundColor White
    Write-Host "  .\gradlew installDebug" -ForegroundColor White
}

Write-Host ""
Write-Host "완료!" -ForegroundColor Green



