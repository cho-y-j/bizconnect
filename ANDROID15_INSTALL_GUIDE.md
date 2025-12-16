# 안드로이드 15 "기기 보호를 위해 앱 차단됨" 해결 가이드

## 🔴 문제
안드로이드 15에서 APK 직접 설치 시 "기기 보호를 위해 앱 차단됨" 오류 발생

## ✅ 해결 방법 (우선순위 순)

### 방법 1: ADB를 통한 설치 (가장 확실함) ⭐⭐⭐

**1단계: USB 디버깅 확인**
- 기기에서: **설정** → **개발자 옵션** → **USB 디버깅** 활성화
- **USB 디버깅 (보안)** 활성화 (있는 경우)

**2단계: 컴퓨터에서 실행**

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

**또는 CMD에서:**
```cmd
adb devices
adb uninstall com.bizconnectmobile
adb install -r C:\call\mobile\android\app\build\outputs\apk\release\app-release.apk
adb shell am start -n com.bizconnectmobile/.MainActivity
```

---

### 방법 2: 기기에서 추가 보안 설정

#### A. Google Play Protect 일시 비활성화
1. **Google Play 스토어** 앱 열기
2. 우측 상단 **프로필 아이콘** 클릭
3. **Play Protect** 선택
4. 우측 상단 **설정 아이콘** 클릭
5. **앱 스캔** 또는 **Play Protect 검사** 일시 비활성화
6. APK 설치 재시도
7. **설치 후 다시 활성화** (보안을 위해)

#### B. 설치 앱별 허용
1. **설정** → **앱** → **특정 앱 설치** 또는 **알 수 없는 앱 설치**
2. 사용 중인 **파일 관리자 앱** 선택 (예: 파일, My Files, Files by Google)
3. **"이 출처에서 허용"** 활성화
4. APK 설치 재시도

#### C. 개발자 옵션에서 추가 설정
1. **설정** → **개발자 옵션**
2. 다음 항목들 활성화:
   - ✅ **USB 디버깅**
   - ✅ **USB 디버깅 (보안)** (있는 경우)
   - ✅ **USB를 통한 설치** (있는 경우)
   - ✅ **알 수 없는 소스 설치** (있는 경우)

---

### 방법 3: APK 설치 시 경고 무시

APK 파일을 열었을 때 나타나는 경고 화면에서:
1. **"이 앱은 Google Play Protect에서 확인되지 않았습니다"** 경고 확인
2. **"설치"** 또는 **"그래도 설치"** 버튼 클릭
3. 경고를 무시하고 설치 진행

---

## 📱 기기별 추가 설정

### Samsung (갤럭시)
1. **설정** → **생체 인증 및 보안** → **알 수 없는 앱 설치 허용**
2. 파일 관리자 앱 선택 → **허용**
3. **설정** → **개발자 옵션** → **USB 디버깅** 활성화

### Google Pixel
1. **설정** → **보안** → **앱 설치** → 파일 관리자 앱 허용
2. **설정** → **시스템** → **개발자 옵션** → **USB 디버깅** 활성화

### Xiaomi
1. **설정** → **추가 설정** → **개발자 옵션**
2. **USB 디버깅 (보안 설정)** 활성화
3. APK 설치 시 **"설치"** 클릭

---

## ⚠️ 중요 사항

1. **ADB 설치가 가장 안전하고 확실합니다**
   - 안드로이드 15의 보안 정책을 우회할 수 있습니다
   - 개발 중인 앱에 가장 적합한 방법입니다

2. **Google Play Protect 경고는 정상입니다**
   - 개발 중인 앱이므로 Google에서 검증되지 않았습니다
   - 신뢰할 수 있는 소스의 APK만 설치하세요

3. **설치 후 보안 설정 복구**
   - 설치 완료 후 Google Play Protect를 다시 활성화하세요
   - 보안을 위해 일시 비활성화는 임시로만 사용하세요

---

## 🔧 ADB 경로 문제 해결

ADB가 PATH에 없는 경우:

**PowerShell에서:**
```powershell
# 환경 변수 확인
$env:ANDROID_HOME
$env:LOCALAPPDATA

# 직접 경로 사용
& "C:\Users\조연지\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
```

**또는 ADB를 PATH에 추가:**
```powershell
# 현재 세션에만 추가
$env:Path += ";C:\Users\조연지\AppData\Local\Android\Sdk\platform-tools"

# 영구적으로 추가하려면 시스템 환경 변수 설정 필요
```

---

## 📋 체크리스트

설치 전 확인:
- [ ] USB 디버깅 활성화됨
- [ ] 기기가 `adb devices`에 표시됨
- [ ] 기존 앱 제거됨 (있는 경우)
- [ ] APK 파일이 정상적으로 빌드됨 (63MB)
- [ ] 저장 공간 충분함

---

## 🆘 여전히 안 되는 경우

1. **기기 재부팅** 후 다시 시도
2. **USB 케이블 교체** 후 다시 연결
3. **개발자 옵션** → **USB 디버깅 권한 취소** → 다시 연결
4. **ADB 서버 재시작:**
   ```powershell
   adb kill-server
   adb start-server
   adb devices
   ```

















