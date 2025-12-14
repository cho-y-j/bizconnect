# ADB 디바이스 연결 문제 해결

## 🔍 현재 문제

`adb.exe: no devices/emulators found` - ADB가 디바이스를 인식하지 못함

## ✅ 해결 방법

### 1. USB 디버깅 확인

**기기에서 확인:**
1. **설정 → 개발자 옵션** 이동
2. **USB 디버깅** 체크 확인
3. 기기를 PC에 연결할 때 나타나는 팝업에서 **"이 컴퓨터에서 항상 허용"** 체크 후 **"허용"** 클릭

**개발자 옵션이 없는 경우:**
1. 설정 → 디바이스 정보 → 빌드 번호를 7번 연속 탭
2. 개발자 옵션이 활성화됨

### 2. USB 연결 모드 확인

**기기에서:**
- USB 연결 시 나타나는 알림에서 **"파일 전송"** 또는 **"MTP"** 모드 선택
- "충전만" 모드에서는 ADB가 작동하지 않음

### 3. USB 케이블 및 포트 확인

- **다른 USB 케이블** 시도
- **다른 USB 포트** 시도 (USB 2.0 포트 권장)
- USB 허브 사용 중이면 직접 연결 시도

### 4. USB 드라이버 확인

**Windows에서:**
1. 기기 관리자 열기 (Win + X → 기기 관리자)
2. "기타 장치" 또는 "Android" 섹션 확인
3. 노란색 경고 표시가 있으면 드라이버 설치 필요
4. Android Studio 설치 시 자동으로 드라이버 설치됨

**수동 드라이버 설치:**
- Google USB Driver 다운로드
- 또는 기기 제조사에서 제공하는 USB 드라이버 설치

### 5. ADB 서버 재시작

```powershell
adb kill-server
adb start-server
adb devices
```

### 6. 기기 재부팅

- 기기 재부팅 후 다시 연결 시도
- PC 재부팅 (필요시)

## 🔧 단계별 확인 체크리스트

- [ ] 개발자 옵션 활성화됨
- [ ] USB 디버깅 체크됨
- [ ] USB 연결 모드: 파일 전송 (MTP)
- [ ] 기기에서 "이 컴퓨터에서 항상 허용" 승인함
- [ ] USB 케이블이 데이터 전송 가능 (충전 전용 케이블 아님)
- [ ] USB 드라이버 설치됨
- [ ] ADB 서버 재시작함
- [ ] 기기 재부팅함

## 📱 기기별 추가 확인사항

### Samsung
- USB 디버깅 (보안 설정) 활성화 필요할 수 있음
- Samsung USB Driver 설치 필요할 수 있음

### Xiaomi
- USB 디버깅 (보안 설정) 활성화 필요
- MIUI 최적화 비활성화 필요할 수 있음

### Huawei
- 개발자 옵션에서 "USB 디버깅 (보안 설정)" 활성화

## 🚀 빠른 해결 스크립트

```powershell
# ADB 서버 재시작
adb kill-server
Start-Sleep -Seconds 2
adb start-server
Start-Sleep -Seconds 2

# 디바이스 확인
adb devices -l

# 연결된 경우 설치 진행
if ($LASTEXITCODE -eq 0) {
    adb install -r android\app\build\outputs\apk\debug\app-debug.apk
}
```

## 💡 대안: 핸드폰에서 직접 설치

ADB 연결이 계속 안 되면:
1. APK 파일을 핸드폰으로 복사
2. 파일 관리자에서 APK 열기
3. 설치 진행

APK 파일 위치:
`C:\cho\call\BizConnect\mobile\android\app\build\outputs\apk\debug\app-debug.apk`

