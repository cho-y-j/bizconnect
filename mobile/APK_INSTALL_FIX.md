# APK 설치 충돌 문제 해결 가이드

## 🔍 문제 원인

같은 패키지 이름(`com.bizconnectmobile`)을 가진 다른 앱이 이미 설치되어 있어서 발생하는 문제입니다.

## ✅ 해결 방법

### 방법 1: 기존 앱 제거 후 설치 (권장)

#### 1단계: 연결된 디바이스 확인
```powershell
adb devices
```

#### 2단계: 기존 앱 제거
```powershell
# 패키지 이름으로 제거
adb uninstall com.bizconnectmobile

# 또는 앱 이름으로 제거 (앱 이름이 다른 경우)
adb shell pm list packages | findstr bizconnect
adb uninstall [찾은_패키지_이름]
```

#### 3단계: 새 APK 설치
```powershell
cd mobile
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### 방법 2: 강제 재설치 (덮어쓰기)

```powershell
cd mobile
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

`-r` 옵션은 기존 앱을 제거하고 새로 설치합니다.

### 방법 3: 패키지 이름 변경 (충돌 방지)

다른 프로젝트와 완전히 분리하려면 패키지 이름을 변경할 수 있습니다.

#### 변경할 파일들:
1. `android/app/build.gradle` - `applicationId` 변경
2. `android/app/src/main/AndroidManifest.xml` - 패키지 참조 확인
3. Kotlin 파일들의 `package` 선언 변경
4. 디렉토리 구조 변경

## 🔧 빠른 해결 스크립트

다음 PowerShell 스크립트를 실행하세요:

```powershell
# 1. 기존 앱 제거
Write-Host "기존 앱 제거 중..." -ForegroundColor Yellow
adb uninstall com.bizconnectmobile

# 2. 새 APK 설치
Write-Host "새 APK 설치 중..." -ForegroundColor Cyan
cd mobile
adb install android\app\build\outputs\apk\debug\app-debug.apk

if ($LASTEXITCODE -eq 0) {
    Write-Host "설치 성공!" -ForegroundColor Green
} else {
    Write-Host "설치 실패. 오류를 확인하세요." -ForegroundColor Red
}
```

## 📱 수동 제거 방법 (ADB 없이)

1. **Android 기기에서 직접 제거**
   - 설정 → 앱 → BizConnect (또는 관련 앱) 찾기
   - 앱 선택 → 제거

2. **APK 파일 직접 설치**
   - APK 파일을 기기로 복사
   - 파일 관리자에서 APK 파일 열기
   - "알 수 없는 소스" 허용 (필요시)
   - 설치 진행

## ⚠️ 주의사항

- **데이터 손실**: 기존 앱을 제거하면 앱 내 데이터가 삭제됩니다.
- **서명 키**: 다른 서명 키로 빌드된 APK는 덮어쓸 수 없습니다.
- **버전 코드**: 새 APK의 버전 코드가 더 낮으면 설치가 실패할 수 있습니다.

## 🚀 다음 단계

설치가 완료되면:
1. 앱 실행 확인
2. 로그인 테스트
3. 권한 요청 확인
4. 기본 기능 테스트

