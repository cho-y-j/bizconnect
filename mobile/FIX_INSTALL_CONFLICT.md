# 🔧 기존 앱 충돌 해결 가이드

## 문제
핸드폰에 다른 버전의 디버깅 APK가 설치되어 있어 새 앱 설치가 실패합니다.

## ✅ 해결 방법

### 방법 1: adb로 기존 앱 제거 후 재설치 (권장)

```powershell
# 1. 디바이스 연결 확인
adb devices

# 2. 기존 앱 제거
adb uninstall com.bizconnectmobile

# 3. 새 앱 설치
adb install mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

### 방법 2: 기기에서 직접 제거 후 설치

1. **기존 앱 제거**
   - 설정 → 앱 → "BizConnectMobile" 또는 "비즈커넥트" 찾기
   - 앱 선택 → 제거

2. **새 앱 설치**
   - APK 파일을 기기로 복사
   - 파일 관리자에서 APK 열기
   - 설치 진행

### 방법 3: 강제 재설치

```powershell
# -r 옵션으로 강제 재설치 (기존 앱 자동 제거)
adb install -r mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 📋 단계별 가이드

### Step 1: 기존 앱 확인

```powershell
adb shell pm list packages | findstr bizconnect
```

출력 예시:
```
package:com.bizconnectmobile
```

### Step 2: 기존 앱 제거

```powershell
adb uninstall com.bizconnectmobile
```

성공 메시지:
```
Success
```

### Step 3: 새 앱 설치

```powershell
adb install mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

성공 메시지:
```
Performing Streamed Install
Success
```

---

## ⚠️ 주의사항

1. **데이터 삭제**: 기존 앱을 제거하면 저장된 데이터도 삭제됩니다.
2. **로그인 필요**: 앱을 다시 설치하면 로그인이 필요합니다.
3. **권한 재설정**: 앱을 다시 설치하면 권한을 다시 허용해야 합니다.

---

## 🚨 오류 메시지별 해결

### "INSTALL_FAILED_UPDATE_INCOMPATIBLE"
→ 기존 앱과 호환되지 않음. 기존 앱 제거 필요.

### "INSTALL_FAILED_VERSION_DOWNGRADE"
→ 새 앱 버전이 기존보다 낮음. 기존 앱 제거 필요.

### "INSTALL_FAILED_ALREADY_EXISTS"
→ 같은 패키지명의 앱이 이미 설치됨. 기존 앱 제거 필요.

---

## 💡 빠른 해결 (한 번에)

```powershell
# 모든 단계를 한 번에 실행
adb uninstall com.bizconnectmobile
adb install mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

---

**이 방법으로 대부분의 충돌 문제가 해결됩니다!** ✅


