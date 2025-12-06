# Android Studio 빌드 및 테스트 가이드

**작성일**: 2025년 1월 27일  
**대상**: Android Studio 초보자용 상세 가이드

---

## 📋 목차

1. [Android Studio 설치 확인](#1-android-studio-설치-확인)
2. [프로젝트 열기](#2-프로젝트-열기)
3. [Gradle 동기화](#3-gradle-동기화)
4. [SDK 및 도구 설정](#4-sdk-및-도구-설정)
5. [에뮬레이터 설정 (선택)](#5-에뮬레이터-설정-선택)
6. [실제 디바이스 연결](#6-실제-디바이스-연결)
7. [프로젝트 빌드](#7-프로젝트-빌드)
8. [앱 실행](#8-앱-실행)
9. [문제 해결](#9-문제-해결)

---

## 1. Android Studio 설치 확인

### 1.1 Android Studio가 설치되어 있는지 확인

1. **시작 메뉴**에서 "Android Studio" 검색
2. 설치되어 있지 않다면: [https://developer.android.com/studio](https://developer.android.com/studio) 에서 다운로드

### 1.2 Android Studio 실행

1. Android Studio 아이콘 더블클릭
2. 처음 실행 시 설정 마법사가 나타남
   - **"Standard"** 선택
   - SDK 다운로드 대기 (시간이 걸릴 수 있음)

---

## 2. 프로젝트 열기

### 2.1 프로젝트 열기

1. Android Studio 실행 후 **"Open"** 클릭
   - 또는 **File → Open** 메뉴 선택

2. 프로젝트 폴더 선택
   ```
   C:\cho\call\BizConnect\mobile
   ```
   ⚠️ **중요**: `mobile` 폴더를 선택해야 합니다! (프로젝트 루트가 아님)

3. **"OK"** 클릭

### 2.2 프로젝트 구조 확인

왼쪽 **Project** 패널에서 다음 구조가 보여야 합니다:
```
mobile/
├── android/          ← Android 프로젝트
├── src/              ← React Native 소스
├── App.tsx
├── package.json
└── ...
```

---

## 3. Gradle 동기화

### 3.1 자동 동기화

프로젝트를 열면 자동으로 Gradle 동기화가 시작됩니다.

- 하단에 **"Gradle Sync"** 진행 상황 표시
- 완료될 때까지 대기 (5-10분 소요 가능)

### 3.2 수동 동기화

만약 자동 동기화가 안 되면:

1. 상단 메뉴: **File → Sync Project with Gradle Files**
   - 또는 상단 툴바의 **🔄 아이콘** 클릭

2. 동기화 완료까지 대기

### 3.3 동기화 오류 해결

**오류가 발생하면:**

1. **File → Invalidate Caches / Restart**
2. **"Invalidate and Restart"** 선택
3. Android Studio 재시작 후 다시 동기화

---

## 4. SDK 및 도구 설정

### 4.1 SDK Manager 열기

1. 상단 메뉴: **Tools → SDK Manager**
   - 또는 상단 툴바의 **🔧 아이콘** 클릭

### 4.2 필요한 SDK 설치 확인

**SDK Platforms** 탭에서:
- ✅ **Android 13.0 (Tiramisu)** - API Level 33
- ✅ **Android 12.0 (S)** - API Level 31
- ✅ **Android 11.0 (R)** - API Level 30

**SDK Tools** 탭에서:
- ✅ **Android SDK Build-Tools**
- ✅ **Android SDK Platform-Tools**
- ✅ **Android SDK Command-line Tools**
- ✅ **Google Play services**
- ✅ **Intel x86 Emulator Accelerator (HAXM installer)** (에뮬레이터 사용 시)

### 4.3 설치

1. 필요한 항목 체크
2. **"Apply"** 클릭
3. 라이선스 동의 후 설치 대기

---

## 5. 에뮬레이터 설정 (선택)

> ⚠️ **참고**: SMS 발송 기능은 실제 디바이스에서만 테스트 가능합니다.  
> 에뮬레이터는 UI 테스트용으로만 사용하세요.

### 5.1 AVD Manager 열기

1. 상단 메뉴: **Tools → Device Manager**
   - 또는 상단 툴바의 **📱 아이콘** 클릭

### 5.2 가상 디바이스 생성

1. **"Create Device"** 클릭
2. **"Phone"** 선택 → **"Pixel 5"** 선택 → **"Next"**
3. 시스템 이미지 선택:
   - **"Tiramisu"** (API 33) 또는 **"S"** (API 31) 선택
   - **"Download"** 클릭 (없는 경우)
   - 다운로드 완료 후 **"Next"**
4. AVD 구성 확인:
   - **"Finish"** 클릭

### 5.3 에뮬레이터 실행

1. Device Manager에서 생성한 디바이스 옆 **▶️ 재생 버튼** 클릭
2. 에뮬레이터가 시작될 때까지 대기 (1-2분)

---

## 6. 실제 디바이스 연결

### 6.1 USB 디버깅 활성화

**Android 기기에서:**

1. **설정** 앱 열기
2. **휴대전화 정보** (또는 **디바이스 정보**) 찾기
3. **빌드 번호**를 **7번 연속 탭**
   - "개발자 모드가 활성화되었습니다" 메시지 확인

4. **설정**으로 돌아가기
5. **개발자 옵션** (또는 **개발자 옵션**) 찾기
6. **USB 디버깅** 활성화

### 6.2 기기 연결

1. USB 케이블로 PC와 Android 기기 연결
2. 기기에 **"USB 디버깅 허용"** 팝업이 나타나면:
   - ✅ **"이 컴퓨터에서 항상 허용"** 체크
   - **"허용"** 클릭

### 6.3 기기 인식 확인

1. Android Studio 하단 **"Terminal"** 탭 열기
2. 다음 명령어 입력:
   ```bash
   adb devices
   ```
3. 기기가 목록에 나타나면 성공:
   ```
   List of devices attached
   ABC123XYZ    device
   ```

---

## 7. 프로젝트 빌드

### 7.1 React Native 의존성 설치

1. Android Studio 하단 **"Terminal"** 탭 열기
2. 다음 명령어 실행:
   ```bash
   npm install
   ```
   - 또는 PowerShell에서 `mobile` 폴더로 이동 후 실행

### 7.2 Metro 번들러 시작 (별도 터미널)

1. **새 터미널 창** 열기 (Android Studio 외부)
2. `mobile` 폴더로 이동:
   ```powershell
   cd C:\cho\call\BizConnect\mobile
   ```
3. Metro 번들러 시작:
   ```powershell
   npm start
   ```
   - 또는 `npx react-native start`

4. **이 터미널은 계속 실행 상태로 두세요!**

### 7.3 Android 프로젝트 빌드

**방법 1: Android Studio에서 빌드**

1. 상단 메뉴: **Build → Make Project**
   - 또는 단축키: **Ctrl + F9**

2. 하단 **"Build"** 탭에서 빌드 진행 상황 확인

**방법 2: 터미널에서 빌드**

1. Android Studio 하단 **"Terminal"** 탭에서:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   - Windows의 경우: `gradlew.bat assembleDebug`

---

## 8. 앱 실행

### 8.1 실행 설정

1. 상단 툴바에서 **디바이스 선택** 드롭다운 클릭
   - 연결된 실제 디바이스 또는 에뮬레이터 선택

2. **실행 버튼** (▶️) 클릭
   - 또는 상단 메뉴: **Run → Run 'app'**
   - 또는 단축키: **Shift + F10**

### 8.2 빌드 및 설치

1. **"Gradle Build Running"** 진행 상황 표시
2. 빌드 완료 후 자동으로 디바이스에 설치
3. 앱이 자동으로 실행됨

### 8.3 첫 실행 확인

앱이 실행되면:
- ✅ 로그인 화면이 나타나야 함
- ✅ 권한 요청 다이얼로그가 나타날 수 있음
   - **"허용"** 클릭

---

## 9. 문제 해결

### 9.1 Gradle 동기화 실패

**증상**: "Gradle sync failed" 오류

**해결 방법:**

1. **File → Invalidate Caches / Restart**
2. **"Invalidate and Restart"** 선택
3. 재시작 후 다시 동기화

4. 그래도 안 되면:
   - `android/gradle/wrapper/gradle-wrapper.properties` 파일 확인
   - Gradle 버전 확인

### 9.2 빌드 오류

**증상**: "Build failed" 오류

**해결 방법:**

1. **Build** 탭에서 오류 메시지 확인
2. 일반적인 오류:
   - **SDK 누락**: SDK Manager에서 필요한 SDK 설치
   - **권한 오류**: `AndroidManifest.xml` 확인
   - **의존성 오류**: `npm install` 재실행

### 9.3 앱이 실행되지 않음

**증상**: 빌드는 성공했지만 앱이 실행되지 않음

**해결 방법:**

1. **Logcat** 탭에서 오류 로그 확인
   - 하단 **"Logcat"** 탭 클릭
   - 빨간색 오류 메시지 확인

2. 일반적인 원인:
   - **Metro 번들러가 실행되지 않음**: `npm start` 실행 확인
   - **권한 거부**: 기기 설정에서 권한 허용
   - **포트 충돌**: 다른 앱이 8081 포트 사용 중인지 확인

### 9.4 "adb devices"에 기기가 나타나지 않음

**해결 방법:**

1. USB 케이블 확인 (데이터 전송 가능한 케이블인지)
2. 기기에서 USB 디버깅 재확인
3. USB 드라이버 설치:
   - 기기 제조사 웹사이트에서 USB 드라이버 다운로드
   - 또는 **Universal ADB Driver** 설치

### 9.5 Metro 번들러 연결 실패

**증상**: "Unable to connect to Metro" 오류

**해결 방법:**

1. Metro 번들러가 실행 중인지 확인
2. 방화벽 설정 확인
3. 수동으로 연결:
   - 기기에서 앱 실행
   - 기기를 흔들어서 개발자 메뉴 열기
   - **"Settings"** → **"Debug server host & port for device"**
   - PC의 IP 주소 입력: `192.168.x.x:8081`

---

## 10. 디버깅 팁

### 10.1 Logcat 사용

1. 하단 **"Logcat"** 탭 클릭
2. 필터 설정:
   - 태그: `ReactNativeJS`
   - 레벨: `Debug` 또는 `Error`

### 10.2 React Native 개발자 메뉴

앱 실행 중:
- **기기를 흔들기** (에뮬레이터: `Ctrl + M` 또는 `Cmd + M`)
- 또는 **메뉴 버튼** (에뮬레이터: `Ctrl + M`)

메뉴 옵션:
- **Reload**: 앱 재시작
- **Debug**: Chrome DevTools 열기
- **Settings**: 개발자 설정

### 10.3 핫 리로드

코드 수정 후:
- **Ctrl + R** (Windows) 또는 **Cmd + R** (Mac)
- 또는 기기를 흔들어서 **"Reload"** 선택

---

## 11. 성공 확인 체크리스트

빌드 및 실행이 성공했다면:

- ✅ Android Studio에서 프로젝트가 정상적으로 열림
- ✅ Gradle 동기화 완료
- ✅ 빌드 성공 (오류 없음)
- ✅ 디바이스에 앱 설치 완료
- ✅ 앱 실행 및 로그인 화면 표시
- ✅ 권한 요청 다이얼로그 표시
- ✅ Metro 번들러 연결 성공

---

## 12. 다음 단계

빌드가 성공했다면:

1. **로그인 테스트**
   - 회원가입 → 로그인
   - 자동 로그인 확인

2. **기능 테스트**
   - 주소록 업로드
   - SMS 발송 (실제 디바이스 필요)
   - 통화 감지 (실제 디바이스 필요)

3. **성능 확인**
   - 앱 반응 속도
   - 메모리 사용량
   - 배터리 소모

---

## 📞 추가 도움말

문제가 계속되면:

1. **Android Studio 로그 확인**
   - Help → Show Log in Explorer

2. **React Native 문서 참고**
   - [https://reactnative.dev/docs/getting-started](https://reactnative.dev/docs/getting-started)

3. **Stack Overflow 검색**
   - 오류 메시지를 그대로 검색

---

**행운을 빕니다!** 🚀

