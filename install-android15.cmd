@echo off
echo ========================================
echo 안드로이드 15 기기 설치 및 실행
echo ========================================
echo.

REM ADB 경로 설정
set ADB_PATH=C:\Users\조연지\AppData\Local\Android\Sdk\platform-tools\adb.exe
set APK_PATH=C:\call\mobile\android\app\build\outputs\apk\release\app-release.apk

echo 1. 기기 연결 확인 중...
"%ADB_PATH%" devices
echo.

echo 2. 기존 앱 제거 중 (있는 경우)...
"%ADB_PATH%" uninstall com.bizconnectmobile
echo.

echo 3. 새 APK 설치 중...
"%ADB_PATH%" install -r "%APK_PATH%"
echo.

if %ERRORLEVEL% EQU 0 (
    echo 4. 앱 실행 중...
    "%ADB_PATH%" shell am start -n com.bizconnectmobile/.MainActivity
    echo.
    echo ========================================
    echo 설치 및 실행 완료!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo 설치 실패! 오류 코드: %ERRORLEVEL%
    echo ========================================
)

pause




















