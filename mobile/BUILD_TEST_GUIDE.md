# 빌드 테스트 가이드

## 📋 사전 준비사항

### 1. 필수 소프트웨어 확인
- [ ] Node.js (v18 이상)
- [ ] JDK (Java Development Kit) 17 이상
- [ ] Android Studio 설치
- [ ] Android SDK 설치
- [ ] 환경 변수 설정 (JAVA_HOME, ANDROID_HOME)

### 2. Android Studio 설정
1. Android Studio 실행
2. SDK Manager에서 다음 설치 확인:
   - Android SDK Platform 33 이상
   - Android SDK Build-Tools
   - Android Emulator
   - Google Play services

## 🚀 빌드 테스트 방법

### 방법 1: 에뮬레이터 사용 (권장 - 처음 테스트)

#### 1단계: 에뮬레이터 실행
```bash
# Android Studio에서 에뮬레이터 실행
# 또는 명령어로:
emulator -avd <에뮬레이터_이름>
```

#### 2단계: Metro 번들러 시작
```bash
cd mobile
npm start
# 또는
npx react-native start
```

#### 3단계: 새 터미널에서 앱 빌드 및 실행
```bash
cd mobile
npx react-native run-android
```

### 방법 2: 실제 디바이스 사용 (SMS 테스트용)

#### 1단계: USB 디버깅 활성화
1. 디바이스 설정 → 개발자 옵션 활성화
2. USB 디버깅 활성화
3. USB로 PC에 연결

#### 2단계: 디바이스 확인
```bash
adb devices
# 연결된 디바이스 목록이 표시되어야 함
```

#### 3단계: 앱 빌드 및 실행
```bash
cd mobile
npx react-native run-android
```

## 🔧 문제 해결

### 문제 1: "SDK location not found"
**해결책**: 환경 변수 설정
```bash
# Windows PowerShell
$env:ANDROID_HOME = "C:\Users\<사용자명>\AppData\Local\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"

# 영구적으로 설정하려면 시스템 환경 변수에 추가
```

### 문제 2: "Gradle build failed"
**해결책**: 
```bash
cd mobile/android
./gradlew clean
cd ..
npx react-native run-android
```

### 문제 3: "Metro bundler not found"
**해결책**:
```bash
cd mobile
npm install
npm start
# 새 터미널에서
npx react-native run-android
```

### 문제 4: "Permission denied"
**해결책**: AndroidManifest.xml 권한 확인
- 이미 모든 권한이 추가되어 있음 ✅

## 📱 빌드 성공 확인

빌드가 성공하면:
1. 앱이 디바이스/에뮬레이터에 설치됨
2. 앱이 자동으로 실행됨
3. "BizConnect" 앱이 보임
4. 권한 요청 다이얼로그가 표시됨

## ⚠️ 주의사항

1. **SMS 기능**: 에뮬레이터에서는 SMS 발송이 작동하지 않음. 실제 디바이스 필요
2. **첫 빌드**: 첫 빌드는 시간이 오래 걸릴 수 있음 (10-20분)
3. **인터넷 연결**: Gradle이 의존성을 다운로드하므로 인터넷 필요

## 🎯 다음 단계

빌드가 성공하면:
1. 앱이 정상적으로 실행되는지 확인
2. 권한 요청이 정상적으로 표시되는지 확인
3. 인증 시스템 구현 시작




