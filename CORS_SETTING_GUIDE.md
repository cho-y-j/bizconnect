# CORS 설정 확인 가이드

## 현재 화면 (API Settings)
현재 보고 계신 화면은 **API Settings** 페이지입니다.
여기에는 CORS 설정이 **없습니다**.

## CORS 설정 위치

CORS 설정은 **Authentication 설정**에 있습니다.

### 확인 방법

1. **왼쪽 사이드바에서 "Authentication" 클릭**
   - 또는 URL로 직접 이동:
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx/auth/url-configuration

2. **"URL Configuration" 섹션 확인**
   - "Site URL" 필드 확인
   - "Redirect URLs" 필드 확인

3. **"Redirect URLs"에 추가**
   - `http://localhost:3000` 추가
   - `http://localhost:3000/**` 추가 (모든 경로 허용)

---

## 하지만 실제로는...

**Supabase는 기본적으로 모든 origin을 허용합니다.**

CORS 에러가 발생하는 다른 원인들:

### 1. 브라우저 확장 프로그램
- CORS 관련 확장 프로그램이 요청을 차단할 수 있습니다
- **해결**: 시크릿 모드에서 테스트 (Ctrl+Shift+N)

### 2. 개발 서버 재시작 필요
- 환경 변수 변경 후 서버를 재시작하지 않았을 수 있습니다
- **해결**: 서버 중지 후 다시 시작

### 3. 네트워크/방화벽
- 회사/학교 네트워크가 요청을 차단할 수 있습니다
- **해결**: 다른 네트워크에서 테스트

---

## 즉시 시도할 것

### 방법 1: 시크릿 모드 테스트 (가장 빠름)
1. Ctrl+Shift+N (Chrome 시크릿 모드)
2. http://localhost:3000 접속
3. 로그인 시도

### 방법 2: 개발 서버 재시작
```powershell
# 1. 서버 중지 (Ctrl+C)
# 2. 다시 시작
cd web
npm run dev
```

### 방법 3: Authentication 설정 확인
1. 왼쪽 사이드바에서 **"Authentication"** 클릭
2. **"URL Configuration"** 클릭
3. "Redirect URLs"에 `http://localhost:3000` 추가

---

## 가장 가능성 높은 원인

**브라우저 확장 프로그램**이 요청을 차단하고 있을 가능성이 높습니다.

**시크릿 모드에서 테스트**해보세요!

