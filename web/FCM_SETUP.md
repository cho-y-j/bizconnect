# FCM (Firebase Cloud Messaging) 설정 가이드

## FCM 서버 키
```
BId_vvFEd4mlHbGrpUdAqGTYQgivGFaA6ewSgXwxvbxeqgF9hV88wy-Mw3writkpdBO4YQd3HQeAdD_7KCy7f_o
```

## Vercel 환경 변수 설정

### 1. Vercel 대시보드에서 환경 변수 추가
1. Vercel 대시보드 접속: https://vercel.com
2. 프로젝트 선택: `bizconnect-ten` (또는 해당 프로젝트)
3. **Settings** → **Environment Variables** 이동
4. 다음 환경 변수 추가:

| 변수명 | 값 | 환경 |
|--------|-----|------|
| `FCM_SERVER_KEY` | `BId_vvFEd4mlHbGrpUdAqGTYQgivGFaA6ewSgXwxvbxeqgF9hV88wy-Mw3writkpdBO4YQd3HQeAdD_7KCy7f_o` | Production, Preview, Development 모두 |

### 2. 환경 변수 확인
- Production: ✅
- Preview: ✅
- Development: ✅

## 사용 방법

### API 라우트에서 사용
```typescript
// web/src/app/api/send-push/route.ts
const fcmServerKey = process.env.FCM_SERVER_KEY;

if (!fcmServerKey) {
  return NextResponse.json(
    { error: 'FCM 서버 키가 설정되지 않았습니다.' },
    { status: 500 }
  );
}

// FCM 메시지 발송
const response = await fetch('https://fcm.googleapis.com/fcm/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `key=${fcmServerKey}`,
  },
  body: JSON.stringify({
    to: fcmToken,
    notification: {
      title: '알림 제목',
      body: '알림 내용',
    },
  }),
});
```

## 로컬 개발 환경 설정

### .env.local 파일에 추가
로컬 개발을 위해 `web/.env.local` 파일에 다음을 추가하세요:

```bash
# Firebase Cloud Messaging (FCM) 서버 키
FCM_SERVER_KEY=BId_vvFEd4mlHbGrpUdAqGTYQgivGFaA6ewSgXwxvbxeqgF9hV88wy-Mw3writkpdBO4YQd3HQeAdD_7KCy7f_o
```

**중요:** `.env.local` 파일은 Git에 커밋되지 않으므로 안전합니다. (`.gitignore`에 포함됨)

## 보안 주의사항
- FCM 서버 키는 절대 클라이언트 코드에 노출하지 마세요
- `.env.local` 파일은 Git에 커밋하지 마세요 (자동으로 제외됨)
- Vercel 대시보드에서 프로덕션 환경 변수 관리
- 로컬 개발용으로만 `.env.local` 사용

## 참고
- Firebase 콘솔: https://console.firebase.google.com
- 프로젝트 ID: `call-93289`
- 프로젝트 번호: `680990103964`

