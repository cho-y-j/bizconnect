# BizConnect 개발 TODO 리스트

**최종 업데이트**: 2025-12-14 (작업 일지: WORK_LOG_2025-12-14.md 참고)

---

## 꼭 지켜야 할 규칙

### 1. 빌드 관련

```
JAVA_HOME을 반드시 C:\Java\jdk-17.0.13+11로 설정할 것!
```

- **Gradle 빌드 시**: 반드시 `build-release.cmd` 스크립트 사용 또는 JAVA_HOME 환경변수 설정
- **한국어 경로 주의**: 사용자 폴더에 한국어가 있으면 Gradle 캐시 경로 문제 발생
  - 해결: `gradle.properties`에 `gradle.user.home=C:\\call\\gradle_cache` 설정
- **단일 아키텍처 빌드**: 빌드 시간 단축을 위해 `-PreactNativeArchitectures=arm64-v8a` 사용

### 2. 코드 수정 관련

```
supabaseClient.ts의 persistSession을 절대 false로 바꾸지 말 것!
```

- `persistSession: true` → 자동 로그인 기능
- `storage: AsyncStorage` → 세션 저장소
- 이 설정을 변경하면 자동 로그인이 작동하지 않음

### 3. 버전 관리

```
react-native-screens는 3.29.0 버전을 유지할 것!
```

- 상위 버전 사용 시 흰색 화면 문제 발생
- `package.json`에서 버전 고정 확인

### 4. 파일 구조

```
React Navigation을 사용하지 말 것! useState로 화면 전환할 것!
```

- React Navigation 사용 시 흰색 화면 문제 발생
- `App.tsx`에서 `useState<AppScreen>`으로 화면 전환 관리

---

## 개발 로드맵

### Phase 1: 핵심 MVP (진행 중)

| 상태 | 작업 | 파일 |
|:----:|------|------|
| ✅ | 자동 로그인 구현 | `mobile/lib/supabaseClient.ts` |
| ✅ | 웹 설정 바로가기 버튼 | `mobile/src/screens/HomeScreen.tsx` |
| ⬜ | 콜백 설정 화면 (ON/OFF) | `mobile/src/screens/CallbackSettingsScreen.tsx` (신규) |
| ⬜ | 카테고리별 발송 설정 | 위 파일에 포함 |
| ⬜ | 기본 인사말 편집 | 위 파일에 포함 |
| ⬜ | 명함 이미지 설정 | 웹에서 처리 → 앱에서 불러오기 |
| ⬜ | 콜백 자동 발송 로직 | `mobile/src/services/callbackService.ts` (신규) |
| ⬜ | 명함 이미지 첨부 (MMS) | `mobile/src/lib/smsSender.ts` 수정 |

### Phase 2: AI 연동

| 상태 | 작업 | 파일 |
|:----:|------|------|
| ⬜ | AI 맞춤 문자 API 연동 | `web/src/app/api/ai/suggest-message/route.ts` 활용 |
| ⬜ | 거래처/VIP만 AI 사용 | 카테고리 확인 로직 |
| ⬜ | 발송 이력 저장 | Supabase DB |
| ⬜ | 발송 이력 표시 | 앱 + 웹 |

### Phase 3: 완성도

| 상태 | 작업 | 파일 |
|:----:|------|------|
| ⬜ | 웹-앱 설정 동기화 | 실시간 Supabase 동기화 |
| ⬜ | 오류 처리 및 안정화 | 전체 |
| ⬜ | 테스트 및 배포 준비 | - |

### Phase 4: 수익화

| 상태 | 작업 | 파일 |
|:----:|------|------|
| ⬜ | 알리고 API 연동 | 199건 초과 시 사용 |
| ⬜ | 요금제 구현 | 무료/프로/비즈니스 |

---

## 중요 파일 위치

### 핵심 설정 파일
- **Supabase 클라이언트**: `mobile/lib/supabaseClient.ts`
- **Gradle 설정**: `mobile/android/gradle.properties`
- **앱 진입점**: `mobile/App.tsx`
- **빌드 스크립트**: `mobile/build-release.cmd`

### 주요 화면
- **로그인**: `mobile/src/screens/LoginScreen.tsx`
- **회원가입**: `mobile/src/screens/SignUpScreen.tsx`
- **홈**: `mobile/src/screens/HomeScreen.tsx`
- **주소록 업로드**: `mobile/src/screens/ContactsUploadScreen.tsx`

### 서비스
- **통화 감지**: `mobile/src/services/callDetectionService.ts`
- **SMS 발송**: `mobile/src/lib/smsSender.ts`
- **고객 서비스**: `mobile/src/services/customerService.ts`

### 웹 API (AI 기능)
- **AI 문자 추천**: `web/src/app/api/ai/suggest-message/route.ts`
- **대화 요약**: `web/src/app/api/ai/summarize-conversation/route.ts`

---

## 빌드 명령어 모음

### Android Release APK 빌드
```cmd
# 방법 1: 스크립트 사용 (JAVA_HOME 자동 설정)
C:\call\mobile\build-release.cmd

# 방법 2: 직접 명령어 실행
cd C:\call\mobile\android
.\gradlew clean
.\gradlew assembleRelease
```

### APK 설치
```powershell
& 'C:\AndroidSdk\platform-tools\adb.exe' install -r 'C:\call\mobile\android\app\build\outputs\apk\release\app-release.apk'
```

### 앱 실행
```powershell
& 'C:\AndroidSdk\platform-tools\adb.exe' shell am start -n com.bizconnectmobile/.MainActivity
```

### 연결된 기기 확인
```powershell
& 'C:\AndroidSdk\platform-tools\adb.exe' devices
```

### Metro 번들러 (개발용)
```cmd
cd C:\call\mobile
npm start
```

---

## 긴급 수정 필요 (2025-12-11) ⚠️⚠️⚠️

### 1. 웹 SMS 발송 안됨 (Critical - 해결 안됨)
- **증상**: 웹에서 문자 발송 시 앱에서 전혀 감지하지 못함
- **시도한 해결책**:
  - 실시간 구독 로직 개선 (실패)
  - 폴링 간격 1초로 단축 (실패)
  - RECENT_MINUTES 30분으로 증가 (실패)
  - 쿼리 조건 단순화 (실패)
  - 디버깅 로그 대량 추가 (원인 파악 실패)
- **상태**: ❌ 전혀 개선되지 않음
- **관련 파일**: `mobile/src/services/taskService.ts`
- **우선순위**: 최우선

### 2. 앱에서 명함 첨부 버튼 작동 안함 (해결 안됨)
- **증상**: 이미지 선택 모달에 "명함 사용" 버튼은 보이지만 클릭해도 작동 안함
- **코드 상태**: `handleSelectBusinessCard` 함수는 추가됨
- **문제점**: 
  - `businessCardImageUrl`이 제대로 로드되지 않을 수 있음
  - `loadBusinessCard` 함수가 제대로 호출되지 않을 수 있음
- **관련 파일**: `mobile/src/screens/SendSMSScreen.tsx`
- **우선순위**: 높음

### 3. 명함 이미지 업로드 에러 (해결 안됨)
- **증상**: 콜백 설정 화면에서 명함 이미지 변경 시 에러 발생
- **시도한 해결책**: 웹 API 사용하도록 변경 (실패)
- **상태**: ❌ 여전히 에러 발생
- **관련 파일**: `mobile/src/screens/CallbackSettingsScreen.tsx`
- **우선순위**: 높음

### 4. 이미지 미리보기에 "이미지 미리보기" 텍스트 표시 (해결 안됨)
- **증상**: Open Graph 미리보기에서 이미지 하단에 "이미지 미리보기" 텍스트가 표시되어 이미지를 가림
- **시도한 해결책**: CSS로 숨김 처리 시도 (실패)
- **문제점**: `og:title`이 메시지 앱에서 표시되는 것으로 보임
- **관련 파일**: `web/src/app/api/preview/[imageId]/route.ts`
- **우선순위**: 중간

### 5. AI가 사용자 이름을 제대로 인식하지 못함 (해결 안됨)
- **증상**: AI가 이메일 ID를 이름으로 사용하거나, 이름이 설정되어 있어도 "이름을 입력하라"고 함
- **시도한 해결책**: `full_name` 강제 사용 로직 추가 (부분 실패)
- **관련 파일**: `web/src/app/api/ai/suggest-message/route.ts`
- **우선순위**: 중간

---

## 알려진 이슈 및 해결책

### 1. 흰색 화면 문제
**원인**: react-native-screens 버전 또는 React Navigation
**해결**:
- react-native-screens 3.29.0 사용
- React Navigation 대신 useState로 화면 전환

### 2. JAVA_HOME not set
**원인**: 시스템 환경변수에 JAVA_HOME 미설정
**해결**:
- `build-release.cmd` 스크립트 사용
- 또는 `gradle.properties`에 `org.gradle.java.home` 설정

### 3. Gradle 캐시 한국어 경로 에러
**원인**: Windows 사용자 이름에 한국어 포함
**해결**: `gradle.properties`에 `gradle.user.home=C:\\call\\gradle_cache`

### 4. 자동 로그인 안 됨
**원인**: `supabaseClient.ts`에서 `persistSession: false`
**해결**: `persistSession: true`, `storage: AsyncStorage` 설정

---

## 연락처 및 참고

- **웹 배포 URL**: https://bizconnect-web.vercel.app
- **GitHub**: https://github.com/cho-y-j/bizconnect
- **Supabase 프로젝트**: hdeebyhwoogxawjkwufx

---

**이 파일은 프로젝트 루트에 유지하고, 작업 시 항상 참고할 것!**
