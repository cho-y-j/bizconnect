# 안드로이드 15 기기 보호 우회 - ADB 설치 가이드

## 문제
안드로이드 15에서 "기기 보호를 위해 앱 차단됨" 오류가 발생하는 경우

## 해결 방법: ADB를 통한 설치 (권장)

### 1단계: USB 디버깅 확인
기기에서:
1. **설정** → **개발자 옵션** → **USB 디버깅** 활성화
2. **USB 디버깅 (보안)** 활성화 (있는 경우)

### 2단계: ADB로 설치

**PowerShell에서:**
```powershell
# 기기 연결 확인
adb devices

# 기존 앱 제거
adb uninstall com.bizconnectmobile

# 새 APK 설치
adb install -r C:\call\mobile\android\app\build\outputs\apk\release\app-release.apk

# 앱 실행
adb shell am start -n com.bizconnectmobile/.MainActivity
```

**CMD에서:**
```cmd
adb devices
adb uninstall com.bizconnectmobile
adb install -r C:\call\mobile\android\app\build\outputs\apk\release\app-release.apk
adb shell am start -n com.bizconnectmobile/.MainActivity
```

## 대안: 기기에서 추가 설정

### 방법 1: 설치 앱 허용
1. **설정** → **보안** → **앱 설치** 또는 **알 수 없는 앱 설치**
2. 사용 중인 파일 관리자 앱 선택
3. **이 출처에서 허용** 활성화

### 방법 2: 개발자 옵션에서
1. **설정** → **개발자 옵션**
2. **USB를 통한 설치** 활성화 (있는 경우)
3. **USB 디버깅 (보안)** 활성화

### 방법 3: Play Protect 일시 중지
1. **Google Play 스토어** → **프로필** → **Play Protect**
2. **설정** → **앱 스캔** 일시 중지 (임시)

## 참고
- ADB 설치가 가장 안전하고 권장되는 방법입니다
- 안드로이드 15는 보안 정책이 강화되어 직접 설치가 제한될 수 있습니다
- 프로덕션 배포 시에는 서명된 APK를 사용해야 합니다




















