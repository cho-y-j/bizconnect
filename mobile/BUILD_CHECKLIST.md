# 빌드 전 체크리스트 ✅

빌드를 시작하기 전에 다음 항목들을 확인하세요.

## 필수 확인 사항

### 1. 프로젝트 구조 ✅
- [ ] `mobile` 폴더에 `android` 폴더가 있음
- [ ] `mobile` 폴더에 `package.json` 파일이 있음
- [ ] `mobile` 폴더에 `App.tsx` 파일이 있음

### 2. Node.js 및 npm ✅
- [ ] Node.js 설치 확인 (버전 18 이상)
  ```powershell
  node --version
  ```
- [ ] npm 설치 확인
  ```powershell
  npm --version
  ```

### 3. React Native 의존성 ✅
- [ ] `mobile` 폴더에서 `npm install` 실행 완료
- [ ] `node_modules` 폴더가 존재함

### 4. Android Studio ✅
- [ ] Android Studio 설치됨
- [ ] Android SDK 설치됨 (API 30 이상)
- [ ] JDK 설치됨 (Android Studio에 포함)

### 5. 환경 변수 (선택) ✅
- [ ] `ANDROID_HOME` 환경 변수 설정 (선택 사항)
  - 보통 Android Studio가 자동으로 처리함

## 빌드 단계별 체크리스트

### Step 1: 프로젝트 열기
- [ ] Android Studio 실행
- [ ] `File → Open` 클릭
- [ ] `C:\cho\call\BizConnect\mobile` 폴더 선택
- [ ] 프로젝트가 정상적으로 열림

### Step 2: Gradle 동기화
- [ ] Gradle 동기화 시작됨 (자동)
- [ ] 하단에 "Gradle Sync" 진행 상황 표시
- [ ] 동기화 완료 (오류 없음)
- [ ] 빌드 오류 없음

### Step 3: Metro 번들러
- [ ] 별도 터미널에서 `npm start` 실행
- [ ] Metro 번들러가 정상적으로 시작됨
- [ ] "Metro waiting on..." 메시지 표시

### Step 4: 디바이스 연결
- [ ] 실제 Android 기기 연결
  - [ ] USB 디버깅 활성화됨
  - [ ] 기기가 인식됨 (`adb devices`로 확인)
- [ ] 또는 에뮬레이터 실행
  - [ ] 에뮬레이터가 정상적으로 시작됨

### Step 5: 빌드 및 실행
- [ ] Android Studio에서 디바이스 선택
- [ ] 실행 버튼 (▶️) 클릭
- [ ] 빌드 진행 중 (오류 없음)
- [ ] 앱이 디바이스에 설치됨
- [ ] 앱이 자동으로 실행됨

### Step 6: 앱 실행 확인
- [ ] 로그인 화면이 표시됨
- [ ] 권한 요청 다이얼로그 표시됨
- [ ] Metro 번들러와 연결됨
- [ ] 오류 없이 정상 작동

## 문제 발생 시 확인 사항

### Gradle 동기화 실패
- [ ] 인터넷 연결 확인
- [ ] `File → Invalidate Caches / Restart` 실행
- [ ] Android SDK 업데이트 확인

### 빌드 오류
- [ ] `Build` 탭에서 오류 메시지 확인
- [ ] 필요한 SDK 설치 확인
- [ ] `npm install` 재실행

### 앱 실행 안 됨
- [ ] Metro 번들러가 실행 중인지 확인
- [ ] `Logcat` 탭에서 오류 로그 확인
- [ ] 디바이스 권한 확인

### 디바이스 인식 안 됨
- [ ] USB 케이블 확인
- [ ] USB 디버깅 재확인
- [ ] USB 드라이버 설치 확인

## 성공 기준 ✅

다음 항목들이 모두 체크되면 성공입니다:

- ✅ Android Studio에서 프로젝트 열기 성공
- ✅ Gradle 동기화 완료 (오류 없음)
- ✅ Metro 번들러 실행 중
- ✅ 디바이스 연결 및 인식
- ✅ 빌드 성공 (오류 없음)
- ✅ 앱 설치 및 실행 성공
- ✅ 로그인 화면 표시
- ✅ 권한 요청 정상 작동

---

**모든 항목이 체크되면 빌드가 성공한 것입니다!** 🎉



