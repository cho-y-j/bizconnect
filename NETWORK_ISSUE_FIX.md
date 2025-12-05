# 네트워크 문제 해결

## 문제 진단 결과

테스트 결과:
- ✅ 환경 변수: 정상
- ❌ fetchTest: "Failed to fetch" - 네트워크 요청 실패
- ❌ table: "Failed to fetch" - Supabase 서버 접근 불가

**이것은 CORS 문제가 아닙니다.**
**네트워크 레벨에서 Supabase 서버에 접근하지 못하는 문제입니다.**

---

## 가능한 원인

### 1. 방화벽/프록시 차단 (가장 가능성 높음)
- 회사/학교 네트워크가 `supabase.co` 도메인을 차단
- Windows 방화벽 설정
- 회사 프록시 서버

### 2. DNS 문제
- `hdeebyhwoogxawjkwufx.supabase.co` 도메인을 해석하지 못함

### 3. 네트워크 정책
- 특정 도메인 접근 제한

---

## 해결 방법

### 방법 1: 다른 네트워크에서 테스트 (가장 확실)

1. **모바일 핫스팟 사용**
   - 스마트폰 핫스팟 켜기
   - PC를 핫스팟에 연결
   - 다시 테스트

2. **다른 Wi-Fi 네트워크**
   - 집/카페 등 다른 네트워크에서 테스트

### 방법 2: VPN 사용/비활성화

- VPN을 사용 중이면 **비활성화** 후 테스트
- VPN을 사용하지 않으면 **VPN 활성화** 후 테스트

### 방법 3: 방화벽 설정 확인

```powershell
# Windows 방화벽에서 차단 확인
# 제어판 > 시스템 및 보안 > Windows Defender 방화벽
```

### 방법 4: DNS 변경

1. **네트워크 설정**
   - 제어판 > 네트워크 및 공유 센터
   - 어댑터 설정 변경
   - IPv4 속성
   - DNS 서버: `8.8.8.8` (Google DNS) 또는 `1.1.1.1` (Cloudflare DNS)

### 방법 5: Supabase 프로젝트 상태 확인

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/hdeebyhwoogxawjkwufx
   - 프로젝트가 "Active" 상태인지 확인
   - 일시 중지되었는지 확인

---

## 빠른 확인

### 터미널에서 직접 테스트

```powershell
# Supabase 서버 연결 테스트
Test-NetConnection -ComputerName hdeebyhwoogxawjkwufx.supabase.co -Port 443
```

또는 브라우저에서 직접 접속:
```
https://hdeebyhwoogxawjkwufx.supabase.co
```

이것도 안 되면 네트워크 문제입니다.

---

## 가장 가능성 높은 해결책

**모바일 핫스팟을 사용해서 테스트**해보세요.

핫스팟에서 작동하면 → 네트워크/방화벽 문제
핫스팟에서도 안 되면 → 다른 원인 (Supabase 서버 문제 등)

---

## 임시 해결책 (네트워크 문제인 경우)

네트워크 문제가 확실하면:
1. 다른 네트워크 사용
2. VPN 사용
3. 회사 IT 부서에 문의 (회사 네트워크인 경우)

