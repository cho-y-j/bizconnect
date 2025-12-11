# 🚀 Vercel 배포 가이드

## 📋 사전 준비

### 1. 필요한 환경 변수

다음 환경 변수들이 필요합니다:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPSEEK_API_KEY=your_deepseek_api_key (선택사항)
```

### 2. Supabase 정보 확인

Supabase 대시보드에서 다음 정보를 확인하세요:
- **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🚀 배포 방법

### 방법 1: Vercel CLI로 배포 (권장)

#### Step 1: Vercel CLI 설치

```bash
npm i -g vercel
```

#### Step 2: 로그인

```bash
vercel login
```

#### Step 3: 프로젝트 배포

```bash
cd web
vercel
```

첫 배포 시 질문에 답변:
- **Set up and deploy?** → `Y`
- **Which scope?** → 본인 계정 선택
- **Link to existing project?** → `N` (새 프로젝트)
- **What's your project's name?** → `bizconnect-web` (또는 원하는 이름)
- **In which directory is your code located?** → `./` (현재 디렉토리)

#### Step 4: 환경 변수 설정

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add DEEPSEEK_API_KEY
```

각 환경 변수 입력 시:
- **Production, Preview, Development 모두에 추가할까요?** → `Y`

#### Step 5: 프로덕션 배포

```bash
vercel --prod
```

---

### 방법 2: GitHub 연동으로 배포 (더 편리)

#### Step 1: GitHub에 푸시

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

#### Step 2: Vercel 웹사이트에서 배포

1. **Vercel 웹사이트 접속**: https://vercel.com
2. **"Add New Project"** 클릭
3. **GitHub 저장소 선택**: `cho-y-j/bizconnect`
4. **프로젝트 설정**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `web`
   - **Build Command**: `npm run build` (자동 감지됨)
   - **Output Directory**: `.next` (자동 감지됨)

#### Step 3: 환경 변수 설정

Vercel 대시보드에서:
1. **Settings** → **Environment Variables** 클릭
2. 다음 변수 추가:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `your_supabase_url` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_supabase_anon_key` | Production, Preview, Development |
| `DEEPSEEK_API_KEY` | `your_deepseek_key` | Production, Preview, Development (선택) |

#### Step 4: 배포

**"Deploy"** 버튼 클릭

---

## ✅ 배포 확인

### 1. 빌드 로그 확인

Vercel 대시보드의 **Deployments** 탭에서:
- ✅ 빌드 성공 여부 확인
- ⚠️ 오류가 있으면 로그 확인

### 2. 사이트 접속

배포 완료 후 제공되는 URL로 접속:
- 예: `https://bizconnect-web.vercel.app`

### 3. 기능 테스트

- [ ] 로그인 화면 표시
- [ ] 로그인/회원가입 작동
- [ ] 대시보드 로드
- [ ] Supabase 연결 확인

---

## 🔧 문제 해결

### 빌드 실패

**증상**: 빌드가 실패함

**해결**:
1. **환경 변수 확인**: 모든 필수 환경 변수가 설정되었는지 확인
2. **빌드 로그 확인**: Vercel 대시보드에서 상세 로그 확인
3. **로컬 빌드 테스트**:
   ```bash
   cd web
   npm run build
   ```

### 환경 변수 오류

**증상**: `NEXT_PUBLIC_SUPABASE_URL is not defined`

**해결**:
1. Vercel 대시보드에서 환경 변수 확인
2. 환경 변수 이름이 정확한지 확인 (대소문자 구분)
3. 재배포:
   ```bash
   vercel --prod
   ```

### Supabase 연결 실패

**증상**: 로그인/회원가입이 작동하지 않음

**해결**:
1. Supabase URL과 키 확인
2. Supabase 대시보드에서 **Authentication** → **URL Configuration** 확인
3. **Redirect URLs**에 Vercel URL 추가:
   ```
   https://your-app.vercel.app/auth/callback
   ```

---

## 📝 추가 설정

### 커스텀 도메인 (선택사항)

1. Vercel 대시보드 → **Settings** → **Domains**
2. 도메인 추가
3. DNS 설정 안내 따르기

### 환경별 설정

**Production**: 프로덕션 환경 변수
**Preview**: PR/브랜치별 미리보기
**Development**: 로컬 개발용

---

## 🎯 배포 체크리스트

배포 전 확인:

- [ ] GitHub에 코드 푸시 완료
- [ ] 환경 변수 준비 완료
- [ ] 로컬 빌드 테스트 성공 (`npm run build`)
- [ ] Supabase Redirect URL 설정 완료
- [ ] Vercel 프로젝트 생성 완료
- [ ] 환경 변수 설정 완료
- [ ] 배포 성공 확인
- [ ] 사이트 접속 및 기능 테스트 완료

---

## 🚀 빠른 배포 (한 번에)

```bash
# 1. 웹 디렉토리로 이동
cd web

# 2. Vercel 로그인 (처음만)
vercel login

# 3. 배포
vercel

# 4. 환경 변수 설정 (대화형)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add DEEPSEEK_API_KEY

# 5. 프로덕션 배포
vercel --prod
```

---

**배포 완료 후 Vercel URL을 알려주세요!** 🎉


