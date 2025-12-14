# 빠른 빌드 테스트 가이드

## 현재 상태
- ✅ Java 설치됨 (v23.0.1)
- ❌ Android SDK 경로 미설정 (ANDROID_HOME)
- ❌ adb 명령어 사용 불가

## 🚀 빌드 테스트 방법 (2가지)

### 방법 1: Android Studio에서 직접 빌드 (권장 - 가장 쉬움)

#### 1단계: Android Studio에서 프로젝트 열기
1. Android Studio 실행
2. "Open" 클릭
3. `C:\cho\call\BizConnect\mobile\android` 폴더 선택
4. "OK" 클릭

#### 2단계: Gradle 동기화
- Android Studio가 자동으로 Gradle을 동기화합니다
- 하단의 진행 상황을 확인하세요

#### 3단계: 에뮬레이터 실행 또는 디바이스 연결
**에뮬레이터 사용:**
1. 상단 툴바에서 "Device Manager" 클릭
2. 에뮬레이터 생성 (없는 경우)
3. 에뮬레이터 실행

**실제 디바이스 사용:**
1. USB로 디바이스 연결
2. USB 디버깅 활성화
3. 디바이스가 인식되는지 확인

#### 4단계: 앱 실행
1. 상단 툴바에서 "Run" 버튼 클릭 (▶️)
2. 또는 `Shift + F10`
3. 디바이스/에뮬레이터 선택
4. 빌드 및 실행 시작

### 방법 2: 명령어로 빌드 (환경 변수 설정 필요)

#### 1단계: Android SDK 경로 찾기
일반적인 위치:
- `C:\Users\<사용자명>\AppData\Local\Android\Sdk`
- 또는 Android Studio 설치 경로

#### 2단계: 환경 변수 설정 (PowerShell - 현재 세션)
```powershell
# Android SDK 경로 설정 (실제 경로로 변경 필요)
$env:ANDROID_HOME = "C:\Users\<사용자명>\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
$env:PATH += ";$env:ANDROID_HOME\tools"
$env:PATH += ";$env:ANDROID_HOME\tools\bin"

# 확인
adb --version
```

#### 3단계: 영구적으로 설정 (선택사항)
1. Windows 설정 → 시스템 → 정보
2. "고급 시스템 설정" 클릭
3. "환경 변수" 클릭
4. "시스템 변수"에서 "새로 만들기":
   - 변수 이름: `ANDROID_HOME`
   - 변수 값: Android SDK 경로
5. PATH 변수에 추가:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

#### 4단계: Metro 번들러 시작
```bash
cd mobile
npm start
```

#### 5단계: 새 터미널에서 빌드
```bash
cd mobile
npx react-native run-android
```

## ⚡ 가장 빠른 방법 (Android Studio 사용)

1. **Android Studio 열기**
2. **`mobile/android` 폴더 열기**
3. **에뮬레이터 실행** (또는 디바이스 연결)
4. **Run 버튼 클릭** (▶️)

끝! 🎉

## 🔍 빌드 성공 확인

빌드가 성공하면:
- ✅ 앱이 디바이스/에뮬레이터에 설치됨
- ✅ 앱이 자동 실행됨
- ✅ "BizConnect" 앱 화면이 보임
- ✅ 권한 요청 다이얼로그 표시

## ⚠️ 주의사항

1. **첫 빌드**: 10-20분 소요 가능 (의존성 다운로드)
2. **인터넷 연결**: 필수 (Gradle이 라이브러리 다운로드)
3. **SMS 테스트**: 실제 디바이스 필요 (에뮬레이터 불가)

## 🐛 문제 발생 시

### "SDK location not found"
→ Android Studio에서 프로젝트를 열면 자동으로 해결됨

### "Gradle sync failed"
→ Android Studio에서 "File" → "Sync Project with Gradle Files"

### "Build failed"
→ Android Studio에서 "Build" → "Clean Project" → "Rebuild Project"




