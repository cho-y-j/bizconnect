# ✅ Vercel 설정 체크리스트

## 📋 Vercel 프로젝트 설정

### 1. GitHub 저장소 연결
- **저장소**: `cho-y-j/bizconnect` ✅
- **브랜치**: `main` ✅

### 2. 프로젝트 설정 (중요!)

Vercel 대시보드에서 다음 설정을 확인하세요:

#### Framework Preset
- **Next.js** (자동 감지됨)

#### Root Directory
- **`web`** ← 이것이 중요합니다! ✅

#### Build Command
- 자동 감지: `npm run build` (또는 `cd web && npm run build`)

#### Output Directory
- 자동 감지: `.next`

#### Install Command
- 자동 감지: `npm install` (또는 `cd web && npm install`)

---

## 🔧 환경 변수 설정

Vercel 대시보드 → **Settings** → **Environment Variables**에서 다음 변수들을 추가하세요:

### 필수 환경 변수

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hdeebyhwoogxawjkwufx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_supabase_anon_key` | Production, Preview, Development |

### 선택적 환경 변수

| Name | Value | Environment |
|------|-------|-------------|
| `DEEPSEEK_API_KEY` | `your_deepseek_key` | Production, Preview, Development |
| `FCM_SERVER_KEY` | `BId_vvFEd4mlHbGrpUdAqGTYQgivGFaA6ewSgXwxvbxeqgF9hV88wy-Mw3writkpdBO4YQd3HQeAdD_7KCy7f_o` | Production, Preview, Development |

---

## 📝 설정 확인 방법

### 방법 1: Vercel 대시보드에서 확인

1. **Vercel 대시보드** 접속
2. 프로젝트 선택: **bizconnect** (또는 프로젝트 이름)
3. **Settings** → **General** 클릭
4. **Root Directory** 확인:
   - ✅ `web`으로 설정되어 있어야 함
   - ❌ 비어있거나 `.`로 되어 있으면 안 됨

### 방법 2: vercel.json 파일 확인

프로젝트 루트에 `vercel.json` 파일이 있고 다음 내용이 있어야 합니다:

```json
{
  "rootDirectory": "web"
}
```

---

## 🚨 주의사항

### Root Directory 설정이 잘못된 경우

만약 Root Directory가 설정되지 않았거나 잘못 설정된 경우:

1. Vercel 대시보드 → **Settings** → **General**
2. **Root Directory** 필드에 `web` 입력
3. **Save** 클릭
4. **Redeploy** 클릭

### 환경 변수가 설정되지 않은 경우

환경 변수가 없으면:
- ❌ 빌드는 성공하지만
- ❌ 런타임에서 Supabase 연결 실패
- ❌ 로그인/회원가입 작동 안 함

---

## ✅ 최종 확인

배포 전 확인 사항:

- [ ] GitHub 저장소: `cho-y-j/bizconnect` 연결됨
- [ ] Root Directory: `web` 설정됨
- [ ] 환경 변수: `NEXT_PUBLIC_SUPABASE_URL` 설정됨
- [ ] 환경 변수: `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정됨
- [ ] 환경 변수: `FCM_SERVER_KEY` 설정됨 (푸시 알림용)
- [ ] 빌드 성공 확인
- [ ] 사이트 접속 및 로그인 테스트

---

**모든 설정이 완료되면 Vercel이 자동으로 배포를 시작합니다!** 🚀


