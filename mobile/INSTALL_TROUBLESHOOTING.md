# 📱 앱 설치 문제 해결 가이드

## ❌ "설치할 수 없음" 오류 해결

### 1. 일반적인 원인

#### A. 알 수 없는 소스 허용 안 함
**해결:**
1. 기기 설정 → 보안 → **"알 수 없는 소스"** 또는 **"알 수 없는 앱 설치 허용"** 활성화
2. 또는 설치 시 나타나는 경고에서 **"설치 허용"** 클릭

#### B. 기기 호환성 문제 (minSdkVersion)
**확인:**
- 현재 앱의 `minSdkVersion`: 23 (Android 6.0)
- 기기가 Android 6.0 이상이어야 함

**해결:**
- 기기 Android 버전 확인: 설정 → 디바이스 정보 → Android 버전
- 필요시 `minSdkVersion` 낮추기 (권장하지 않음)

#### C. 기존 앱과 충돌
**해결:**
```powershell
# 기존 앱 제거
adb uninstall com.bizconnectmobile

# 새로 설치
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

#### D. 저장 공간 부족
**해결:**
- 기기 저장 공간 확인 및 정리

#### E. APK 손상
**해결:**
- 다시 빌드 후 설치

---

## 🔧 단계별 해결 방법

### Step 1: 디바이스 연결 확인

```powershell
adb devices
```

**출력 예시:**
```
List of devices attached
ABC123XYZ    device
```

**문제:**
- 아무것도 안 나오면 → USB 디버깅 확인
- `unauthorized` 나오면 → 기기에서 "USB 디버깅 허용" 클릭

### Step 2: 기존 앱 제거 (있는 경우)

```powershell
adb uninstall com.bizconnectmobile
```

### Step 3: 상세 오류 확인

```powershell
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

**오류 메시지 예시:**
- `INSTALL_FAILED_INSUFFICIENT_STORAGE` → 저장 공간 부족
- `INSTALL_FAILED_UPDATE_INCOMPATIBLE` → 기존 앱과 충돌
- `INSTALL_FAILED_VERSION_DOWNGRADE` → 버전 다운그레이드 불가
- `INSTALL_PARSE_FAILED_NO_CERTIFICATES` → 서명 문제

### Step 4: 강제 설치

```powershell
# 기존 앱 제거 후 재설치
adb uninstall com.bizconnectmobile
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### Step 5: 기기에서 직접 설치

1. APK 파일을 기기로 복사 (USB 또는 클라우드)
2. 기기에서 파일 관리자로 APK 열기
3. **"알 수 없는 소스"** 허용
4. 설치 진행

---

## 🛠️ 추가 해결 방법

### 방법 1: Release 빌드로 변경

**문제:** Debug APK가 일부 기기에서 설치 안 될 수 있음

**해결:**
```powershell
cd android
.\gradlew assembleRelease
```

**주의:** Release 빌드는 서명이 필요합니다.

### 방법 2: minSdkVersion 확인 및 조정

**파일:** `mobile/android/build.gradle`

```gradle
minSdkVersion = 23  // Android 6.0
```

**기기 호환성 확인:**
```powershell
adb shell getprop ro.build.version.sdk
```

출력이 23 이상이어야 합니다.

### 방법 3: 서명 확인

Debug APK는 자동 서명되지만, 문제가 있을 수 있습니다.

**서명 확인:**
```powershell
# Java keytool 필요
keytool -printcert -jarfile android\app\build\outputs\apk\debug\app-debug.apk
```

### 방법 4: APK 재빌드

```powershell
cd mobile\android
.\gradlew clean
.\gradlew assembleDebug
```

---

## 📋 체크리스트

설치 전 확인 사항:

- [ ] 기기가 Android 6.0 이상
- [ ] USB 디버깅 활성화
- [ ] "알 수 없는 소스" 허용
- [ ] 저장 공간 충분 (최소 100MB)
- [ ] 기존 앱 제거됨 (있는 경우)
- [ ] APK 파일이 손상되지 않음
- [ ] 디바이스가 `adb devices`에 표시됨

---

## 🚨 특정 오류 메시지별 해결

### "앱이 설치되지 않았습니다"
→ 기기에서 "알 수 없는 소스" 허용

### "패키지가 손상되었습니다"
→ APK 재빌드 필요

### "이 앱은 기기와 호환되지 않습니다"
→ `minSdkVersion` 확인 및 기기 Android 버전 확인

### "저장 공간이 부족합니다"
→ 기기 저장 공간 정리

### "이전 버전보다 낮은 버전입니다"
→ 기존 앱 제거 후 재설치

---

## 💡 권장 설치 방법

**가장 안정적인 방법:**

1. **USB로 연결**
   ```powershell
   adb devices  # 연결 확인
   ```

2. **기존 앱 제거**
   ```powershell
   adb uninstall com.bizconnectmobile
   ```

3. **설치**
   ```powershell
   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
   ```

4. **실행**
   ```powershell
   adb shell am start -n com.bizconnectmobile/.MainActivity
   ```

---

**문제가 계속되면:**
1. 정확한 오류 메시지 확인
2. `adb logcat`으로 상세 로그 확인
3. 기기 모델 및 Android 버전 확인

