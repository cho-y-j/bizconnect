# 구글 로그인 에러 해결: "missing OAuth secret"

## 🔍 MCP 로그 분석 결과

Supabase 로그에서 다음 에러가 확인되었습니다:
```
"400: Unsupported provider: missing OAuth secret"
```

## ❌ 문제 원인

**Client Secret이 Supabase에 입력되지 않았거나 잘못 입력되었습니다.**

## ✅ 해결 방법

### Step 1: Google Cloud Console에서 Client Secret 확인

1. https://console.cloud.google.com 접속
2. 프로젝트 선택: **call-93289**
3. **APIs & Services** → **Credentials**
4. Client ID `680990103964-uaeqrtphi0os3vdfj01u8tn68dslrve8.apps.googleusercontent.com` 클릭
5. **Client secret** 확인

**⚠️ 중요:** Client Secret은 한 번만 표시됩니다. 표시되지 않으면:
- **RESET** 버튼 클릭하여 새로 생성
- 새로 생성된 Secret을 복사 (다시 표시되지 않으므로 즉시 복사!)

### Step 2: Supabase에 Client Secret 입력

1. https://supabase.com/dashboard 접속
2. 프로젝트: **bizconnedt** (hdeebyhwoogxawjkwufx)
3. **Authentication** → **Providers** → **Google** 클릭
4. 다음을 확인:
   - ✅ **Enable Google provider** 토글이 **ON**인지 확인
   - ✅ **Client ID (for OAuth)** 필드에 `680990103964-uaeqrtphi0os3vdfj01u8tn68dslrve8.apps.googleusercontent.com` 입력되어 있는지 확인
   - ✅ **Client Secret (for OAuth)** 필드에 Google Cloud Console에서 복사한 Secret 입력
5. **Save** 버튼 클릭 (중요!)

### Step 3: 설정 확인

다음 항목을 모두 확인하세요:

- [ ] **Enable Google provider** 토글이 **ON**
- [ ] **Client ID (for OAuth)** 필드에 값 입력됨
- [ ] **Client Secret (for OAuth)** 필드에 값 입력됨 (가장 중요!)
- [ ] **Save** 버튼을 눌렀는지 확인

## 🧪 테스트

설정 완료 후:

1. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
2. https://bizconnect-ten.vercel.app 접속
3. **로그인** → **구글로 로그인** 클릭
4. Google 계정 선택 및 권한 승인
5. 자동으로 대시보드로 이동하는지 확인

## ⚠️ 주의사항

- **Client Secret은 공백 없이 정확히 입력**해야 합니다
- 앞뒤 공백이 있으면 작동하지 않습니다
- Secret을 복사할 때 전체를 복사했는지 확인하세요
- **Save 버튼을 반드시 눌러야** 설정이 저장됩니다

## 🔄 여전히 안 되면

1. Supabase Dashboard에서 Google Provider 설정 페이지를 새로고침
2. Client Secret 필드를 비우고 다시 입력
3. Save 클릭
4. 1-2분 기다린 후 다시 테스트






