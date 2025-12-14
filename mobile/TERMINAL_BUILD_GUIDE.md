# 터미널에서 빌드 및 실행 가이드

**Android Studio 없이 터미널에서만 빌드하는 방법**

---

## 📋 사전 준비

### 1. Android SDK 확인
```powershell
# Android SDK 경로 확인 (일반적인 경로)
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
# 또는
$env:ANDROID_HOME = "$env:USERPROFILE\AppData\Local\Android\Sdk"

# PATH에 추가
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
```

### 2. Java 확인
```powershell
java -version
```

---

## 🚀 빌드 및 실행 단계

### Step 1: 의존성 설치 (이미 완료됨)
```powershell
cd C:\cho\call\BizConnect\mobile
npm install
```

### Step 2: Metro 번들러 시작 (백그라운드)
```powershell
# 새 터미널 창에서 실행
npm start
```

### Step 3: Android 디바이스 확인
```powershell
# 연결된 디바이스 확인
adb devices

# 에뮬레이터 시작 (디바이스가 없을 경우)
# Android Studio의 AVD Manager에서 에뮬레이터 실행
```

### Step 4: 앱 빌드 및 실행
```powershell
# 디버그 빌드 및 실행
npx react-native run-android

# 또는 직접 빌드
cd android
.\gradlew assembleDebug
.\gradlew installDebug
```

---

## 🔧 문제 해결

### adb를 찾을 수 없을 때
```powershell
# Android SDK 경로 찾기
# 일반적인 경로:
# C:\Users\[사용자명]\AppData\Local\Android\Sdk\platform-tools

# PATH에 추가
$env:PATH += ";C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools"
```

### Gradle 오류 발생 시
```powershell
cd android
.\gradlew clean
cd ..
npm install
```

### Metro 번들러 포트 충돌
```powershell
# 8081 포트 사용 중인 프로세스 종료
netstat -ano | findstr :8081
taskkill /PID [프로세스ID] /F

# 또는 다른 포트 사용
npm start -- --port 8082
```

---

## 📱 실행 확인

앱이 실행되면:
- 로그인 화면이 표시되어야 함
- Metro 번들러와 연결됨
- 권한 요청 다이얼로그 표시

---

## 🎯 빠른 명령어 모음

```powershell
# 1. Metro 시작 (별도 터미널)
npm start

# 2. 앱 빌드 및 실행
npx react-native run-android

# 3. 로그 확인
npx react-native log-android

# 4. 앱 재시작
# 앱에서 R 키 두 번 누르기 (개발자 메뉴)
# 또는 기기 흔들기 → Reload
```



