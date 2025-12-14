# 🔧 Vercel 배포 오류 해결

## 현재 문제

Vercel이 이전 커밋(edc6956)을 사용하고 있어서 오류가 발생합니다.

## 해결 방법

### 방법 1: Vercel 대시보드에서 Root Directory 설정 (권장)

1. **Vercel 대시보드** 접속
2. 프로젝트 선택
3. **Settings** → **General** 클릭
4. **Root Directory** 필드에 `web` 입력
5. **Save** 클릭
6. **Deployments** 탭으로 이동
7. 최신 배포에서 **"..."** 메뉴 → **"Redeploy"** 클릭
8. **"Use existing Build Cache"** 체크 해제
9. **"Redeploy"** 클릭

### 방법 2: vercel.json 제거 (더 간단)

Root Directory를 대시보드에서 설정했다면, `vercel.json` 파일이 필요 없을 수 있습니다.

```bash
# vercel.json 삭제
rm vercel.json
git add vercel.json
git commit -m "Remove vercel.json, use dashboard settings"
git push origin main
```

### 방법 3: vercel.json을 최소화

Root Directory를 대시보드에서 설정했다면, `vercel.json`은 비워두거나 최소한만 설정:

```json
{
  "framework": "nextjs"
}
```

---

## ✅ 확인 사항

1. **Root Directory 설정 확인**
   - Vercel 대시보드 → Settings → General
   - Root Directory가 `web`으로 설정되어 있는지 확인

2. **최신 커밋 사용 확인**
   - Vercel이 최신 커밋(55c44d4)을 사용하는지 확인
   - 필요시 수동으로 Redeploy

3. **환경 변수 확인**
   - Settings → Environment Variables
   - `NEXT_PUBLIC_SUPABASE_URL` 설정 확인
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 확인

---

## 🚀 권장 해결 순서

1. **Vercel 대시보드에서 Root Directory를 `web`으로 설정**
2. **vercel.json 파일 삭제 또는 최소화**
3. **수동으로 Redeploy (캐시 없이)**

이렇게 하면 문제가 해결될 것입니다!


