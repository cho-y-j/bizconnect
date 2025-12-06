# Gradle 캐시 문제 해결 방법

## 현재 문제

Gradle transforms 캐시가 계속 손상되어 빌드가 실패합니다.
- 오류: `Could not read workspace metadata from ...\transforms\...\metadata.bin`

## 해결 방법

### 방법 1: Gradle 버전 낮추기 (권장)

Gradle 8.10.2가 너무 최신일 수 있습니다. 8.5로 낮춰보세요:

1. `mobile/android/gradle/wrapper/gradle-wrapper.properties` 파일 열기
2. 다음 줄 수정:
   ```properties
   distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-all.zip
   ```
3. 다시 빌드

### 방법 2: Android Studio에서 빌드

터미널 빌드 대신 Android Studio를 사용:

1. Android Studio에서 프로젝트 열기
2. **Build → Make Project**
3. **Run → Run 'app'**

Android Studio는 자체 JDK를 사용하므로 호환성 문제가 적습니다.

### 방법 3: 수동으로 APK 빌드

```powershell
cd android
.\gradlew assembleDebug --no-daemon
```

빌드된 APK는 `android/app/build/outputs/apk/debug/app-debug.apk`에 있습니다.

### 방법 4: Gradle 캐시 비활성화 (임시)

`mobile/android/gradle.properties`에 추가:

```properties
org.gradle.caching=false
org.gradle.configureondemand=false
```

---

## 현재 상태

- ✅ Java 21 설치 완료
- ✅ Gradle 8.10.2 설정 완료
- ✅ Kotlin 오류 해결 완료
- ❌ Gradle transforms 캐시 문제 (진행 중)

---

**가장 빠른 해결책: Android Studio에서 빌드하세요!**


