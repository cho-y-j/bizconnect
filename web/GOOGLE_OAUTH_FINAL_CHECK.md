# 구글 로그인 최종 확인 체크리스트

## ✅ Google Cloud Console (완료)
- [x] Client ID: `680990103964-uaeqrtphi0os3vdfj01u8tn68dslrve8.apps.googleusercontent.com`
- [x] Authorized redirect URI: `https://hdeebyhwoogxawjkwufx.supabase.co/auth/v1/callback`

## ⚠️ Supabase Dashboard (확인 필요)

### Step 1: Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트: **bizconnedt** (hdeebyhwoogxawjkwufx)
3. **Authentication** → **Providers** → **Google** 클릭

### Step 2: 다음 항목 확인

#### 필수 확인 사항:
- [ ] **Enable Google provider** 토글이 **ON**인가?
- [ ] **Client ID (for OAuth)** 필드에 `680990103964-uaeqrtphi0os3vdfj01u8tn68dslrve8.apps.googleusercontent.com` 입력되어 있는가?
- [ ] **Client Secret (for OAuth)** 필드에 값이 입력되어 있는가? ⚠️ **가장 중요!**
- [ ] **Save** 버튼을 눌렀는가?

### Step 3: Client Secret 확인 방법

**Google Cloud Console에서:**
1. 현재 보고 있는 페이지에서 **Client secret** 확인
2. 표시되지 않으면:
   - **RESET** 버튼 클릭
   - 새로 생성된 Secret 복사 (한 번만 표시됨!)

**Supabase에 입력:**
1. **Client Secret (for OAuth)** 필드에 붙여넣기
2. 앞뒤 공백 확인 (없어야 함)
3. **Save** 클릭

## 🧪 테스트

모든 설정 완료 후:
1. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
2. https://bizconnect-ten.vercel.app 접속
3. **로그인** → **구글로 로그인** 클릭
4. Google 계정 선택 및 권한 승인
5. 대시보드로 이동 확인

## 📝 현재 상태

- ✅ Google Cloud Console: 설정 완료
- ✅ Supabase Client ID: 입력됨
- ⚠️ **Supabase Client Secret: 입력 필요** ← 이것만 하면 됩니다!

