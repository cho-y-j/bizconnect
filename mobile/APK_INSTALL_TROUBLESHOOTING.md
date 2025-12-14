# APK 설치 실패 원인 진단 가이드

## ✅ 다른 프로젝트 APK와의 충돌 여부

**답: 충돌하지 않습니다!**

- Android는 **패키지 이름(applicationId)**으로 앱을 구분합니다
- 현재 프로젝트: `com.bizconnectmobile`
- 다른 프로젝트의 패키지 이름이 다르면 같은 기기에 설치 가능합니다
- **같은 패키지 이름**을 가진 앱만 충돌합니다

## 🔍 APK 설치 실패의 실제 원인들

### 1. 서명 키 불일치
**증상**: "앱이 이미 설치되어 있습니다" 또는 "INSTALL_FAILED_UPDATE_INCOMPATIBLE"
**원인**: 같은 패키지 이름이지만 다른 서명 키로 빌드됨
**해결**: 
```powershell
# 기존 앱 제거 후 재설치
adb uninstall com.bizconnectmobile
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### 2. 버전 코드 문제
**증상**: "INSTALL_FAILED_VERSION_DOWNGRADE"
**원인**: 설치하려는 APK의 버전 코드가 기존 앱보다 낮음
**해결**: `android/app/build.gradle`에서 `versionCode` 증가
```gradle
versionCode 2  // 1에서 2로 증가
versionName "1.1"
```

### 3. 권한 문제
**증상**: "알 수 없는 소스에서 설치 허용" 필요
**원인**: 보안 설정에서 알 수 없는 소스 설치가 비활성화됨
**해결**: 
- 설정 → 보안 → 알 수 없는 소스 허용
- 또는 개발자 옵션에서 USB 디버깅 허용

### 4. 저장 공간 부족
**증상**: "INSTALL_FAILED_INSUFFICIENT_STORAGE"
**원인**: 기기 저장 공간 부족
**해결**: 불필요한 앱/파일 삭제

### 5. 최소 SDK 버전 불일치
**증상**: "INSTALL_FAILED_OLDER_SDK"
**원인**: 기기의 Android 버전이 앱의 최소 요구사항보다 낮음
**해결**: `android/app/build.gradle`에서 `minSdkVersion` 확인 및 조정

### 6. APK 파일 손상
**증상**: "INSTALL_PARSE_FAILED_NO_CERTIFICATES" 또는 설치 중단
**원인**: APK 파일이 손상되었거나 불완전하게 빌드됨
**해결**: 다시 빌드
```powershell
cd android
.\gradlew clean
.\gradlew assembleDebug
```

## 🔧 진단 명령어

### 1. 연결된 디바이스 확인
```powershell
adb devices
```

### 2. 기존 앱 설치 여부 확인
```powershell
adb shell pm list packages | findstr bizconnect
```

### 3. 상세 설치 로그 확인
```powershell
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
# 또는
adb install android\app\build\outputs\apk\debug\app-debug.apk 2>&1 | Out-File install-log.txt
```

### 4. 기기 정보 확인
```powershell
adb shell getprop ro.build.version.sdk  # Android SDK 버전
adb shell df /data  # 저장 공간 확인
```

## 📋 체크리스트

설치 전 확인사항:
- [ ] USB 디버깅 활성화됨
- [ ] 기기가 `adb devices`에 표시됨
- [ ] 충분한 저장 공간 있음
- [ ] 기기 Android 버전이 minSdkVersion 이상
- [ ] APK 파일이 정상적으로 빌드됨
- [ ] 같은 패키지 이름의 앱이 있다면 제거됨

## 🚀 권장 해결 순서

1. **기존 앱 제거** (같은 패키지 이름인 경우)
   ```powershell
   adb uninstall com.bizconnectmobile
   ```

2. **클린 빌드**
   ```powershell
   cd android
   .\gradlew clean
   cd ..
   ```

3. **새로 빌드**
   ```powershell
   cd android
   .\gradlew assembleDebug
   ```

4. **강제 재설치**
   ```powershell
   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
   ```

5. **로그 확인** (실패 시)
   ```powershell
   adb logcat | findstr "PackageManager"
   ```

## 💡 빠른 해결 스크립트

```powershell
Write-Host "=== APK 설치 문제 해결 ===" -ForegroundColor Cyan

# 1. 기존 앱 제거
Write-Host "기존 앱 제거 중..." -ForegroundColor Yellow
adb uninstall com.bizconnectmobile 2>&1 | Out-Null

# 2. 클린 빌드
Write-Host "클린 빌드 중..." -ForegroundColor Yellow
cd android
.\gradlew clean
.\gradlew assembleDebug
cd ..

# 3. 설치
Write-Host "APK 설치 중..." -ForegroundColor Cyan
adb install -r android\app\build\outputs\apk\debug\app-debug.apk

if ($LASTEXITCODE -eq 0) {
    Write-Host "설치 성공!" -ForegroundColor Green
} else {
    Write-Host "설치 실패. 로그를 확인하세요." -ForegroundColor Red
    Write-Host "adb logcat | findstr PackageManager" -ForegroundColor Yellow
}
```

