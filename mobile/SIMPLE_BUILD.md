# 간단한 빌드 가이드 (터미널만 사용)

## 🚀 3단계로 빌드하기

### Step 1: Metro 번들러 시작 (별도 터미널)

**새 PowerShell 창을 열고:**
```powershell
cd C:\cho\call\BizConnect\mobile
npm start
```

이 터미널은 **계속 실행 상태로 두세요!**

---

### Step 2: Android 기기 연결

**옵션 A: 실제 Android 기기**
1. USB로 PC에 연결
2. 기기에서 "USB 디버깅 허용" 확인

**옵션 B: 에뮬레이터**
- Android Studio에서 에뮬레이터 실행
- 또는 명령어로 실행 (에뮬레이터 이름 확인 필요)

---

### Step 3: 앱 빌드 및 실행

**현재 터미널에서:**
```powershell
cd C:\cho\call\BizConnect\mobile
npx react-native run-android
```

---

## ✅ 성공 확인

- 앱이 디바이스에 설치됨
- 앱이 자동으로 실행됨
- 로그인 화면이 표시됨

---

## ❌ 문제 발생 시

### Java 버전 오류
- Gradle 캐시 삭제: `Remove-Item -Path "$env:USERPROFILE\.gradle\caches" -Recurse -Force`
- 다시 빌드

### Metro 연결 실패
- Metro 번들러가 실행 중인지 확인
- 포트 8081이 사용 중인지 확인

### 디바이스 인식 안 됨
- `adb devices` 명령어로 확인
- USB 디버깅 재확인

---

**빌드가 완료되면 앱이 자동으로 실행됩니다!** 🎉


