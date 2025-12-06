# 빌드 문제 해결 가이드

## 현재 문제: Java 23 호환성

Java 23이 Android Gradle Plugin과 완전히 호환되지 않아 빌드가 실패하고 있습니다.

## 해결 방법

### 방법 1: Java 17 또는 21 사용 (권장)

1. **Java 17 또는 21 다운로드**
   - [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) 또는
   - [OpenJDK](https://adoptium.net/)

2. **JAVA_HOME 환경 변수 설정**
   ```powershell
   # Java 17 설치 경로 예시
   $env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
   $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
   ```

3. **Java 버전 확인**
   ```powershell
   java -version
   ```

4. **다시 빌드**
   ```powershell
   npx react-native run-android
   ```

### 방법 2: Android Studio의 내장 JDK 사용

Android Studio는 자체 JDK를 포함하고 있습니다:

1. Android Studio 실행
2. **File → Settings → Build, Execution, Deployment → Build Tools → Gradle**
3. **Gradle JDK**를 **jbr-17** 또는 **jbr-21**로 변경
4. 터미널에서 다시 빌드

### 방법 3: gradle.properties에서 Java 경로 지정

`mobile/android/gradle.properties`에 추가:

```properties
org.gradle.java.home=C:\\Program Files\\Android\\Android Studio\\jbr
```

(Android Studio의 JDK 경로로 변경)

---

## 완료된 수정 사항

✅ Gradle 8.10.2로 업그레이드 (Java 23 지원)  
✅ Kotlin 경고를 오류로 처리하지 않도록 수정  
✅ AndroidManifest 충돌 해결  

---

## 다음 단계

Java 17 또는 21을 설치한 후 다시 빌드를 시도하세요.


