# 🔧 Vercel 대시보드 설정 수정 가이드

## 현재 문제

Vercel이 이전 커밋을 사용하고, Install Command가 `cd web && npm install`로 설정되어 있습니다.

## 해결 방법

### Step 1: Vercel 대시보드 접속
1. https://vercel.com 접속
2. 프로젝트 선택 (bizconnect)

### Step 2: Settings → General 확인

다음 설정을 확인하고 수정하세요:

#### Root Directory
- **값**: `web` ✅
- 설정되어 있지 않다면 `web` 입력

#### Build Command
- **현재**: `cd web && npm install && npm run build` ❌
- **변경**: `npm run build` ✅
- 또는 **비워두기** (자동 감지)

#### Install Command  
- **현재**: `cd web && npm install` ❌
- **변경**: `npm install` ✅
- 또는 **비워두기** (자동 감지)

#### Output Directory
- **값**: `.next` ✅
- 또는 **비워두기** (자동 감지)

### Step 3: 저장 및 재배포

1. **Save** 클릭
2. **Deployments** 탭으로 이동
3. 최신 배포에서 **"..."** 메뉴 클릭
4. **"Redeploy"** 선택
5. **"Use existing Build Cache"** 체크 해제
6. **"Redeploy"** 클릭

### Step 4: 최신 커밋 확인

재배포 시 최신 커밋(d4d5cb1)을 사용하는지 확인하세요.

---

## 📋 설정 요약

Root Directory가 `web`으로 설정되어 있다면:

| 항목 | 설정 값 |
|------|---------|
| Root Directory | `web` |
| Build Command | (비워두기) 또는 `npm run build` |
| Install Command | (비워두기) 또는 `npm install` |
| Output Directory | (비워두기) 또는 `.next` |

**모든 커맨드는 Root Directory 기준으로 실행되므로 `cd web`이 필요 없습니다!**

---

## ⚠️ 중요

Root Directory를 `web`으로 설정했다면:
- ✅ `npm install` (O)
- ❌ `cd web && npm install` (X)

Root Directory가 설정되지 않았다면:
- ✅ `cd web && npm install` (O)
- ❌ `npm install` (X)

현재는 Root Directory가 `web`으로 설정되어 있으므로, **모든 커맨드에서 `cd web`을 제거**해야 합니다!


