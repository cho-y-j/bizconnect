# AI 비서 기능 개발 플랜

**작성일:** 2025.12.05  
**우선순위:** 높음 ⭐⭐⭐  
**예상 소요 시간:** 8-10시간

---

## 📋 기능 개요

### 1. 문자 메시지 추천
고객에게 보낼 문자 메시지를 AI가 자동으로 추천해주는 기능입니다. 과거 대화 이력과 현재 상황을 분석하여 3가지 버전(정중한, 친근한, 간결한)의 메시지를 생성합니다.

### 2. 대화 내용 요약
고객과의 과거 대화 이력을 AI가 분석하여 요약해주는 기능입니다. 주요 내용, 약속, 다음 액션 아이템 등을 정리합니다.

---

## 🎯 사용 시나리오

### 웹 버전 (우선 구현)
1. 고객 상세 페이지 또는 문자 보내기 페이지에서
2. "✨ AI 추천" 버튼 클릭
3. 최근 발송 내역 3개 자동 수집
4. AI가 3가지 버전의 메시지 생성
5. 사용자가 선택하여 수정 후 발송

### 모바일 버전 (추후 구현)
1. 특정 고객과의 문자 방 입장
2. 입력창 옆 "✨ AI 추천" 버튼 클릭
3. 최근 주고받은 문자 3개 자동 분석
4. 화면 하단에 AI 추천 문구 3개 표시
5. 터치하면 입력창에 자동 입력
6. 수정 후 전송

---

## 🏗️ 기술 스택

- **AI API**: DeepSeek API (직접 호출)
- **API 키**: `sk-af010f64eb7d44d0bb82ef6d3ff0d539`
- **모델**: `deepseek-chat` (비사고 모드)
- **호출 방식**: 직접 `fetch` API 사용 (OpenAI SDK 불필요)
- **Base URL**: `https://api.deepseek.com`

---

## 📊 데이터 구조

### AI에게 전달하는 정보

```typescript
interface AIRequest {
  customer: {
    name: string
    phone: string
    industry_type?: string
    group?: string
    tags?: string[]
    birthday?: string
    anniversary?: string
  }
  conversationHistory: Array<{
    date: string
    sender: 'me' | 'customer'
    message: string
  }>
  currentContext: {
    date: string
    dayOfWeek: string
    time: string
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  }
  intent: string // 사용자의 의도 (예: "약속 잡기", "안부 인사", "상품 소개")
}
```

### AI 응답 구조

#### 문자 메시지 추천 응답
```typescript
interface AIMessageResponse {
  versions: {
    formal: string    // 정중한 버전
    friendly: string  // 친근한 버전
    concise: string   // 간결한 버전
  }
  reasoning?: string  // AI의 추론 과정 (선택사항)
}
```

#### 대화 내용 요약 응답
```typescript
interface AISummaryResponse {
  summary: string           // 전체 대화 요약
  keyPoints: string[]       // 주요 포인트 (3-5개)
  promises: string[]        // 약속된 사항들
  nextActions: string[]     // 다음 액션 아이템
  sentiment: 'positive' | 'neutral' | 'negative'  // 대화 톤
}
```

---

## 🔧 구현 단계

### Phase 1: 백엔드 API 구현 (웹)

#### 1.1 환경 변수 설정
- `web/.env.local`에 DeepSeek API 키 추가
- 서버 사이드에서만 사용하므로 `NEXT_PUBLIC_` 접두사 없이

#### 1.2 AI API 엔드포인트 생성
- `web/src/app/api/ai/suggest-message/route.ts` - 문자 메시지 추천
- `web/src/app/api/ai/summarize-conversation/route.ts` - 대화 내용 요약
- DeepSeek API 직접 호출 (fetch API 사용)
- 프롬프트 엔지니어링

#### 1.3 프롬프트 설계

##### 문자 메시지 추천 프롬프트

**시스템 프롬프트:**
```
너는 예의 바르고 센스 있는 비즈니스 파트너 '비즈커넥트 비서'야. 
아래 [대화 이력]과 [현재 상황]을 고려해서, 고객에게 보낼 적절한 안부/영업 문자를 
3가지 버전(정중한, 친근한, 간결한)으로 추천해줘.

응답은 반드시 다음 JSON 형식으로 해줘:
{
  "formal": "정중한 버전 메시지",
  "friendly": "친근한 버전 메시지",
  "concise": "간결한 버전 메시지"
}

주의사항:
- 한국어로 작성
- 비즈니스 톤 유지
- 과거 대화 맥락 반영
- 현재 시간/상황 고려
- 불필요한 이모지나 과도한 친근함 지양
```

**사용자 프롬프트 예시:**
```
[현재 상황]
- 날짜: 2025년 12월 05일 금요일
- 시간: 오후 6시 30분 (퇴근 시간, 주말 전)

[고객 정보]
- 이름: 김철수
- 업종: 보험
- 그룹: VIP
- 태그: #장기고객

[최근 대화 이력]
1. (2025-09-05) 나 → 고객: "사장님, 암 보험 상품 제안서 보냈습니다."
2. (2025-09-05) 고객 → 나: "지금 좀 바빠서 나중에 볼게요. 연말쯤 연락 줘요."

[의도]
다시 한번 약속 잡기
```

##### 대화 내용 요약 프롬프트

**시스템 프롬프트:**
```
너는 비즈니스 대화 분석 전문가야. 고객과의 과거 대화 이력을 분석해서 
요약, 주요 포인트, 약속, 다음 액션을 정리해줘.

응답은 반드시 다음 JSON 형식으로 해줘:
{
  "summary": "전체 대화 요약 (2-3문장)",
  "keyPoints": ["주요 포인트 1", "주요 포인트 2", "주요 포인트 3"],
  "promises": ["약속 1", "약속 2"],
  "nextActions": ["다음 액션 1", "다음 액션 2"],
  "sentiment": "positive" 또는 "neutral" 또는 "negative"
}
```

**사용자 프롬프트 예시:**
```
[고객 정보]
- 이름: 김철수
- 업종: 보험

[대화 이력] (최근 10개)
1. (2025-09-05) 나 → 고객: "사장님, 암 보험 상품 제안서 보냈습니다."
2. (2025-09-05) 고객 → 나: "지금 좀 바빠서 나중에 볼게요. 연말쯤 연락 줘요."
3. (2025-06-15) 나 → 고객: "건강하시죠? 오늘 날씨가 좋네요."
4. (2025-06-15) 고객 → 나: "네, 덕분에 잘 지내고 있어요."
...

위 대화 이력을 분석해서 요약해줘.
```

---

### Phase 2: 프론트엔드 UI 구현 (웹)

#### 2.1 문자 보내기 페이지에 AI 버튼 추가
- `web/src/app/dashboard/send/page.tsx`
- "✨ AI 추천" 버튼 추가
- 클릭 시 모달 또는 드롭다운 표시

#### 2.2 AI 추천 모달 컴포넌트
- `web/src/components/AIMessageSuggestions.tsx`
- 3가지 버전 표시
- 선택 시 메시지 입력란에 자동 입력
- 수정 가능

#### 2.3 고객 상세 페이지에도 추가
- `web/src/app/dashboard/customers/[id]/page.tsx`
- 고객별 발송 내역 기반으로 AI 추천

---

### Phase 3: 데이터 수집 로직

#### 3.1 발송 내역 조회
- `sms_logs` 테이블에서 최근 3개 조회
- 고객 전화번호 기준으로 필터링
- 날짜순 정렬

#### 3.2 대화 이력 구성
- 발송된 메시지와 수신된 메시지 구분
- 날짜, 시간 정보 포함
- 메시지 내용 정리

---

### Phase 4: 모바일 앱 구현 (추후)

#### 4.1 React Native에서 AI API 호출
- 서버 API 엔드포인트 호출
- 또는 직접 DeepSeek API 호출 (API 키는 서버에 저장)

#### 4.2 UI 구현
- 입력창 옆 AI 버튼
- 하단에 추천 문구 3개 표시
- 터치 시 입력창에 입력

---

## 📝 프롬프트 예시

### 입력 데이터 예시

```json
{
  "customer": {
    "name": "김철수",
    "phone": "010-1234-5678",
    "industry_type": "보험",
    "group": "VIP"
  },
  "conversationHistory": [
    {
      "date": "2025-09-05",
      "sender": "me",
      "message": "사장님, 암 보험 상품 제안서 보냈습니다."
    },
    {
      "date": "2025-09-05",
      "sender": "customer",
      "message": "지금 좀 바빠서 나중에 볼게요. 연말쯤 연락 줘요."
    }
  ],
  "currentContext": {
    "date": "2025-12-05",
    "dayOfWeek": "금요일",
    "time": "18:30",
    "timeOfDay": "evening"
  },
  "intent": "다시 한번 약속 잡기"
}
```

### 예상 AI 응답

```json
{
  "formal": "김철수 사장님, 행복한 금요일 저녁입니다. 지난번에 연말쯤 연락 달라고 하셔서 조심스럽게 안부 여쭙습니다. 날씨가 많이 추워졌는데 건강은 어떠신지요? 다음 주 편하실 때 차 한잔 모시고 싶습니다.",
  "friendly": "철수 형님! 벌써 12월 첫 주말이네요. 지난번 말씀하신 대로 연말이라 연락드렸습니다. 바쁘신 건 좀 정리되셨나요? ㅎㅎ 시간 되실 때 연락 한번 주세요!",
  "concise": "사장님, 연말이라 연락드립니다. 지난번 말씀하신 상품 검토는 어떠신지요? 편하실 때 연락 부탁드립니다."
}
```

---

## 🔐 보안 고려사항

1. **API 키 보안**
   - 서버 사이드에서만 사용
   - 환경 변수로 관리
   - Git에 커밋하지 않음

2. **데이터 프라이버시**
   - 고객 정보는 사용자별로만 접근
   - RLS 정책 준수
   - AI API에 전송되는 데이터 최소화

3. **비용 관리**
   - API 호출 횟수 제한 (일일 한도)
   - 캐싱 고려 (같은 고객, 같은 상황에서 재사용)

---

## 📊 데이터베이스 변경사항

필요한 경우:
- `ai_suggestions` 테이블 추가 (캐싱용)
- 사용자별 AI 사용 횟수 추적

현재는 추가 테이블 없이 구현 가능 (sms_logs 활용)

---

## ✅ 체크리스트

### Phase 1: 백엔드
- [ ] DeepSeek API 키 환경 변수 설정
- [ ] OpenAI SDK 설치
- [ ] AI API 엔드포인트 생성
- [ ] 프롬프트 설계 및 테스트
- [ ] 발송 내역 조회 로직 구현

### Phase 2: 프론트엔드
- [ ] AI 추천 버튼 UI 추가
- [ ] AI 추천 모달 컴포넌트 구현
- [ ] 3가지 버전 표시 및 선택 기능
- [ ] 메시지 입력란에 자동 입력 기능

### Phase 3: 통합 테스트
- [ ] 전체 플로우 테스트
- [ ] 다양한 고객 시나리오 테스트
- [ ] 에러 처리 테스트

---

## 🚀 다음 단계

1. **즉시 시작**: 백엔드 API 구현
2. **다음**: 프론트엔드 UI 구현
3. **추후**: 모바일 앱 통합

---

## 📚 참고 자료

- [DeepSeek API 문서](https://api-docs.deepseek.com/)
- OpenAI SDK 문서 (DeepSeek과 호환)

