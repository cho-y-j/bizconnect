# 구글 로그인 설정 - 다음 단계

## ✅ 완료된 항목
- Client ID 입력됨: `680990103964-uaeqrtphi0os3vdfj01u8tn68dslrve8.apps.googleusercontent.com`

## 🔧 다음에 해야 할 일

### 1. Client Secret 확인 및 입력

#### Google Cloud Console에서 Client Secret 확인
1. https://console.cloud.google.com 접속
2. 프로젝트 선택: **call-93289**
3. **APIs & Services** → **Credentials**
4. Client ID `680990103964-uaeqrtphi0os3vdfj01u8tn68dslrve8.apps.googleusercontent.com` 클릭
5. **Client secret** 확인 (표시되지 않으면 "Reset secret" 클릭하여 새로 생성)

#### Supabase에 Client Secret 입력
1. https://supabase.com/dashboard 접속
2. 프로젝트: **bizconnedt** (hdeebyhwoogxawjkwufx)
3. **Authentication** → **Providers** → **Google**
4. **Client Secret (for OAuth)** 필드에 복사한 Secret 입력
5. **Save** 클릭

### 2. Google Cloud Console Redirect URI 확인

1. Google Cloud Console → **APIs & Services** → **Credentials**
2. Client ID `680990103964-uaeqrtphi0os3vdfj01u8tn68dslrve8.apps.googleusercontent.com` 클릭
3. **Authorized redirect URIs** 섹션 확인
4. 다음 URL이 있는지 확인:
   ```
   https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/callback
   ```

**없다면 추가:**
1. **+ ADD URI** 클릭
2. 위 URL 입력
3. **Save** 클릭

### 3. Supabase Redirect URL 확인

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Redirect URLs** 섹션 확인
3. 다음 URL이 있는지 확인:
   - `https://bizconnect-ten.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (로컬 개발용)

**없다면 추가:**
1. **Add URL** 클릭
2. URL 입력
3. **Save** 클릭

## ✅ 최종 체크리스트

설정 완료 후 다음을 모두 확인:

- [x] Supabase에 Client ID 입력됨
- [ ] Supabase에 **Client Secret** 입력됨
- [ ] Google Cloud Console에 **Authorized redirect URIs**에 Supabase 콜백 URL 등록됨
- [ ] Supabase에 **Redirect URLs**에 웹사이트 콜백 URL 등록됨

## 🧪 테스트

모든 설정 완료 후:

1. 브라우저 캐시 삭제 (Ctrl+Shift+Delete 또는 Cmd+Shift+Delete)
2. https://bizconnect-ten.vercel.app 접속
3. **로그인** → **구글로 로그인** 클릭
4. Google 계정 선택 및 권한 승인
5. 자동으로 대시보드로 이동하는지 확인

## ⚠️ 주의사항

- **Client Secret은 한 번만 표시됩니다.** 복사해두세요.
- Secret을 잃어버렸다면 Google Cloud Console에서 "Reset secret"으로 새로 생성해야 합니다.
- Redirect URI는 정확히 일치해야 합니다. 공백이나 슬래시 하나라도 틀리면 작동하지 않습니다.












