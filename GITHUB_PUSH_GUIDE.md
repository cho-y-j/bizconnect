# 🚀 GitHub 푸시 가이드

## 현재 상태

✅ Git 저장소 초기화 완료
✅ 원격 저장소 연결 완료
✅ 초기 커밋 완료

## GitHub에 푸시하기

### 방법 1: 기본 브랜치로 푸시

```powershell
git push -u origin main
```

또는 `master` 브랜치인 경우:

```powershell
git branch -M main  # 브랜치 이름을 main으로 변경
git push -u origin main
```

### 방법 2: 현재 브랜치 확인 후 푸시

```powershell
# 현재 브랜치 확인
git branch

# main 브랜치로 변경 (필요시)
git checkout -b main

# 푸시
git push -u origin main
```

## 인증 문제 해결

### Personal Access Token 사용

GitHub에서 Personal Access Token을 생성해야 할 수 있습니다:

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" 클릭
3. 권한 선택: `repo` (전체)
4. 토큰 생성 후 복사
5. 푸시 시 비밀번호 대신 토큰 사용

### SSH 키 사용 (권장)

```powershell
# SSH URL로 변경
git remote set-url origin git@github.com:cho-y-j/bizconnect.git

# 푸시
git push -u origin main
```

## 푸시 후 확인

GitHub에서 확인:
- https://github.com/cho-y-j/bizconnect

파일이 모두 업로드되었는지 확인하세요.

## 다음 단계

1. ✅ GitHub에 푸시 완료
2. ✅ 원격 저장소에서 코드 확인
3. ✅ 협업자와 공유
4. ✅ CI/CD 설정 (선택사항)

---

**참고**: `.env` 파일과 빌드 아티팩트는 `.gitignore`에 포함되어 있어 푸시되지 않습니다.


