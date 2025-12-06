# Gradle 동기화 수동 실행 가이드

## 🔧 Gradle 동기화 방법

### 방법 1: Android Studio 메뉴에서 (가장 확실함)

1. **Android Studio 상단 메뉴바**
2. **`File` → `Sync Project with Gradle Files`** 클릭
   - 또는 단축키: `Ctrl + Shift + O` (Windows/Linux)
   - 또는 단축키: `Cmd + Shift + O` (Mac)

### 방법 2: 알림 배너에서

1. Android Studio 하단에 **"Gradle files have changed since last project sync"** 알림이 보임
2. **"Sync Now"** 버튼 클릭

### 방법 3: Gradle 탭에서

1. Android Studio 오른쪽에 **"Gradle"** 탭 클릭
2. 상단의 **새로고침 아이콘** (🔄) 클릭
3. 또는 프로젝트 이름 우클릭 → **"Reload Gradle Project"**

### 방법 4: 명령어로 (터미널)

```bash
cd mobile/android
./gradlew --refresh-dependencies
```

Windows에서는:
```powershell
cd mobile\android
.\gradlew.bat --refresh-dependencies
```

## ⚠️ 동기화 중 문제 해결

### 문제 1: "Gradle sync failed"
**해결책:**
1. `File` → `Invalidate Caches / Restart`
2. "Invalidate and Restart" 선택
3. Android Studio 재시작 후 다시 동기화

### 문제 2: "SDK location not found"
**해결책:**
1. `File` → `Project Structure` (또는 `Ctrl + Alt + Shift + S`)
2. `SDK Location` 탭 클릭
3. Android SDK 경로 입력:
   - 일반 경로: `C:\Users\<사용자명>\AppData\Local\Android\Sdk`
4. "Apply" → "OK"
5. 다시 동기화

### 문제 3: "Gradle version mismatch"
**해결책:**
1. `File` → `Project Structure`
2. `Project` 탭에서 Gradle 버전 확인
3. 필요시 `gradle/wrapper/gradle-wrapper.properties` 파일 수정

### 문제 4: 네트워크 오류 (의존성 다운로드 실패)
**해결책:**
1. 인터넷 연결 확인
2. 방화벽/프록시 설정 확인
3. `File` → `Settings` → `Build, Execution, Deployment` → `Gradle`
4. "Offline work" 체크 해제

## 📋 동기화 확인 방법

동기화가 성공하면:
- ✅ 하단 상태바에 "Gradle sync finished" 표시
- ✅ 오른쪽 Gradle 탭에 프로젝트 구조가 보임
- ✅ 빌드 에러가 없음

동기화가 실패하면:
- ❌ 하단에 빨간색 에러 메시지 표시
- ❌ "Gradle sync failed" 알림
- 위의 문제 해결 방법 참고

## 🚀 동기화 후 다음 단계

1. 동기화 완료 대기
2. 에뮬레이터 실행 또는 디바이스 연결
3. Run 버튼 클릭 (▶️)



