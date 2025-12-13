# 구글 로그인 - Client Secret 입력 가이드

## 🔍 현재 상태

Supabase 설정을 확인한 결과:
- ✅ Google 로그인 활성화: **ON**
- ✅ 클라이언트 ID: 입력됨
- ❌ **클라이언트 시크릿(OAuth용): 비어있음** ← 이것이 문제!

## ✅ 해결 방법

### Step 1: Google Cloud Console에서 Client Secret 확인

1. https://console.cloud.google.com 접속
2. 프로젝트: **call-93289**
3. **APIs & Services** → **Credentials**
4. Client ID `680990103964-uaeqrtphi0os3vdfj01u8tn68dslrve8.apps.googleusercontent.com` 클릭
5. **Client secret** 확인

**⚠️ 중요:**
- Client Secret은 한 번만 표시됩니다
- 표시되지 않으면 **RESET** 버튼 클릭하여 새로 생성
- 새로 생성된 Secret을 즉시 복사 (다시 표시되지 않음!)

### Step 2: Supabase에 Client Secret 입력

1. 현재 보고 있는 Supabase 페이지에서
2. **"클라이언트 시크릿(OAuth용)"** 필드 클릭
3. Google Cloud Console에서 복사한 Secret 붙여넣기
4. 오른쪽 하단의 **"구하다" (저장)** 버튼 클릭

### Step 3: 확인

입력 후 다음을 확인:
- [ ] 클라이언트 시크릿 필드에 값이 입력되어 있는가?
- [ ] "구하다" (저장) 버튼을 눌렀는가?
- [ ] 저장 후 페이지가 새로고침되었는가?

## 🧪 테스트

설정 완료 후:
1. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
2. https://bizconnect-ten.vercel.app 접속
3. **로그인** → **구글로 로그인** 클릭
4. Google 계정 선택 및 권한 승인
5. 대시보드로 이동 확인

## ⚠️ 주의사항

- Client Secret은 **공백 없이 정확히** 입력해야 합니다
- 앞뒤 공백이 있으면 작동하지 않습니다
- Secret을 복사할 때 **전체를 복사**했는지 확인하세요
- **"구하다" (저장) 버튼을 반드시 눌러야** 설정이 저장됩니다

## 📝 요약

**현재 상태:**
- Google Cloud Console: ✅ 완료
- Supabase Client ID: ✅ 입력됨
- Supabase Client Secret: ❌ **비어있음** ← 이것만 입력하면 됩니다!

**다음 단계:**
1. Google Cloud Console에서 Client Secret 확인/생성
2. Supabase "클라이언트 시크릿(OAuth용)" 필드에 입력
3. "구하다" (저장) 버튼 클릭
4. 테스트

