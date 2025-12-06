# Java 17 설치 가이드

## 현재 문제

Java 21과 Android Gradle Plugin의 `jlink` 호환성 문제로 빌드가 실패하고 있습니다.

## 해결책: Java 17 설치

### 1. Java 17 다운로드

**Eclipse Temurin (권장):**
- 링크: https://adoptium.net/temurin/releases/?version=17
- **Windows x64** 버전 선택
- **JDK** (JRE 아님) 다운로드

### 2. 설치

1. 다운로드한 설치 파일 실행
2. 기본 경로로 설치: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot`
3. 설치 완료

### 3. 자동 설정

설치 후 다음 명령어로 자동 설정:

```powershell
cd C:\cho\call\BizConnect\mobile
# Java 17 경로 찾기 및 설정
$java17 = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory | Where-Object { $_.Name -like "jdk-17*" } | Select-Object -First 1
if($java17) {
    $env:JAVA_HOME = $java17.FullName
    # gradle.properties 업데이트
    $gradleProps = Get-Content "android\gradle.properties" -Raw
    $javaPath = $java17.FullName -replace '\\', '\\'
    $gradleProps = $gradleProps -replace 'org\.gradle\.java\.home=.*', "org.gradle.java.home=$javaPath"
    Set-Content "android\gradle.properties" -Value $gradleProps -NoNewline
    Write-Host "✅ Java 17 설정 완료: $($java17.FullName)"
}
```

### 4. 빌드 재시도

```powershell
npx react-native run-android
```

---

## 대안: 수동 설정

Java 17을 다른 경로에 설치했다면:

1. `mobile/android/gradle.properties` 파일 열기
2. 다음 줄 수정:
   ```properties
   org.gradle.java.home=C:\\Program Files\\Eclipse Adoptium\\jdk-17.x.x-hotspot
   ```
   (실제 설치 경로로 변경)

---

**Java 17 설치 후 알려주시면 자동으로 설정하겠습니다!**


