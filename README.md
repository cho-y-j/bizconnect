# BizConnect - 모바일 통합 CRM

## 프로젝트 구조
- `web/`: Next.js 웹 대시보드
- `mobile/`: React Native Android 앱

## 설정 방법

### 1. 웹 대시보드
1. `web` 디렉토리로 이동: `cd web`
2. 의존성 설치: `npm install`
3. 환경 변수 설정:
   - `.env.local` 파일 생성
   - `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 추가
4. 개발 서버 실행: `npm run dev`
5. `http://localhost:3000` 열기

### 2. 모바일 앱 (Android)
**필수 조건:** Node.js, JDK, Android Studio

1. `mobile` 디렉토리로 이동: `cd mobile`
2. **중요:** 자동 초기화가 실패했을 수 있으므로 다음을 실행하세요:
   ```bash
   npm install
   ```
3. React Native 프로젝트 구조(android/ios 폴더)를 초기화하지 않은 경우 다음을 실행해야 할 수 있습니다:
   ```bash
   npx react-native init BizConnectMobile --template react-native-template-typescript
   # 덮어쓰기된 경우 제공된 App.tsx와 package.json 내용을 다시 복사하세요.
   ```
   *그러나 이 MVP에서는 소스 코드를 제공했습니다. 작동하는 React Native 환경이 필요합니다.*

4. Supabase 설정:
   - `mobile/lib/supabaseClient.ts` 파일 열기
   - `supabaseUrl`과 `supabaseAnonKey` 입력

5. Android 디바이스/에뮬레이터에서 실행:
   ```bash
   npx react-native run-android
   ```

## 구현된 기능 (MVP)
- **웹**: "오늘의 작업" UI, SMS 전송 API (Supabase)
- **모바일**:
  - SMS 및 통화 기록 권한
  - 통화 감지 (스마트 콜백 트리거)
  - 실시간 SMS 전송 (Supabase 수신 대기)
  - 스로틀링 (기본 구현)

## 다음 단계
- **Supabase 데이터베이스 마이그레이션 실행** (필수)
  - 자세한 방법: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 참고
  - 빠른 실행: `npm run setup:supabase:cli` (PowerShell)
- 실제 Supabase 프로젝트 키 연결
- 실제 Android 디바이스에서 테스트 (에뮬레이터에서는 SMS 전송이 작동하지 않음)

## 📚 추가 문서
- [MASTER_PLAN.md](./MASTER_PLAN.md) - 프로젝트 마스터 플랜 및 비전
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) - 상세 개발 계획 및 작업 목록
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Supabase 데이터베이스 스키마 설계
- [SECURITY_PLAN.md](./SECURITY_PLAN.md) - 보안 정책 및 구현 가이드
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase 설정 및 마이그레이션 가이드 ⭐
