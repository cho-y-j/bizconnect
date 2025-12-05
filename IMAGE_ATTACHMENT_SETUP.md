# 이미지 첨부 기능 설정 가이드

## 📋 개요

문자 발송 시 이미지 첨부 기능을 사용하려면 Supabase Storage를 설정해야 합니다.

---

## 🗄️ 1. 데이터베이스 마이그레이션

### SQL 실행

Supabase Dashboard > SQL Editor에서 다음 파일을 실행하세요:

```sql
-- supabase/add-image-attachments.sql
```

이 마이그레이션은 다음을 수행합니다:
- `tasks` 테이블에 `image_url`, `image_name`, `is_mms` 필드 추가
- `sms_logs` 테이블에 `image_url`, `is_mms` 필드 추가
- `user_images` 테이블 생성 (미리 저장된 이미지 관리)

---

## 📦 2. Supabase Storage 버킷 생성

### 2.1 Storage 버킷 생성

1. Supabase Dashboard > Storage로 이동
2. "New bucket" 클릭
3. 다음 설정 입력:
   - **Name**: `user-images`
   - **Public bucket**: ✅ 체크 (이미지 URL 접근을 위해)
   - **File size limit**: `10485760` (10MB)
   - **Allowed MIME types**: `image/*`

### 2.2 Storage 정책 설정

Storage > Policies에서 다음 정책을 추가하세요:

#### 읽기 정책 (Public)
```sql
-- 모든 사용자가 자신의 이미지만 볼 수 있음
CREATE POLICY "Users can view their own images"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

#### 업로드 정책
```sql
-- 사용자가 자신의 폴더에만 업로드 가능
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

#### 삭제 정책
```sql
-- 사용자가 자신의 이미지만 삭제 가능
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

## 🎨 3. 기능 사용 방법

### 3.1 이미지 관리 페이지

1. 대시보드 > "이미지 관리" 메뉴로 이동
2. 이미지 업로드:
   - "새 이미지 업로드" 섹션에서 파일 선택
   - 명함, 로고, 상품 이미지 등 업로드 가능
3. 이미지 관리:
   - ⭐ 즐겨찾기 설정
   - ✏️ 이름/카테고리 수정
   - 🗑️ 삭제

### 3.2 문자 발송 시 이미지 첨부

1. 문자 보내기 페이지로 이동
2. "📷 이미지 첨부" 버튼 클릭
3. 이미지 선택:
   - 저장된 이미지 목록에서 선택
   - 또는 새 이미지 업로드
4. 선택한 이미지가 표시됨
5. 문자 발송 시 MMS로 자동 전환

### 3.3 이모티콘 추가

1. 문자 보내기 페이지에서 "😀 이모티콘" 버튼 클릭
2. 카테고리별 이모티콘 선택:
   - 😀 스마일리
   - 👋 제스처
   - ❤️ 하트
   - 📱 오브젝트
   - 🔣 심볼
3. 선택한 이모티콘이 메시지에 자동 추가

---

## 📱 4. 모바일 앱 연동

### 4.1 MMS 발송 처리

모바일 앱에서 `tasks` 테이블의 `is_mms` 필드를 확인하여:
- `is_mms = true`인 경우: MMS 발송 (이미지 포함)
- `is_mms = false`인 경우: SMS 발송 (텍스트만)

### 4.2 이미지 다운로드

모바일 앱에서 `image_url`을 사용하여 이미지를 다운로드하고 MMS에 첨부해야 합니다.

---

## ⚠️ 주의사항

1. **파일 크기 제한**: 10MB 이하만 업로드 가능
2. **이미지 형식**: JPG, PNG, GIF 등 이미지 파일만 지원
3. **MMS 비용**: 이미지 첨부 시 MMS로 전환되어 추가 비용이 발생할 수 있습니다
4. **Storage 용량**: Supabase 무료 플랜은 1GB Storage 제공

---

## 🔧 문제 해결

### 이미지 업로드 실패
- Supabase Storage 버킷이 생성되었는지 확인
- Storage 정책이 올바르게 설정되었는지 확인
- 파일 크기가 10MB 이하인지 확인

### 이미지가 표시되지 않음
- 버킷이 Public으로 설정되었는지 확인
- 이미지 URL이 올바른지 확인

---

## ✅ 체크리스트

- [ ] 데이터베이스 마이그레이션 실행
- [ ] Supabase Storage 버킷 생성 (`user-images`)
- [ ] Storage 정책 설정 (읽기, 업로드, 삭제)
- [ ] 이미지 관리 페이지 테스트
- [ ] 문자 발송 시 이미지 첨부 테스트
- [ ] 이모티콘 선택기 테스트

