-- user-images Storage 버킷 생성 및 정책 설정
-- 명함 이미지 및 프로필 이미지 업로드를 위한 Storage 버킷

-- ============================================
-- 1. user-images 버킷 생성
-- ============================================

-- 버킷이 이미 존재하는지 확인하고 없으면 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-images',
  'user-images',
  true, -- Public bucket (이미지 URL로 직접 접근 가능)
  10485760, -- 10MB 파일 크기 제한
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'] -- 허용된 MIME 타입
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Storage Objects RLS 정책 설정
-- ============================================

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;

-- 1. 업로드 정책: 인증된 사용자는 자신의 폴더에만 업로드 가능
-- 파일 경로 형식: {user_id}/{timestamp}-{random}.{ext}
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-images' AND
  (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- 2. 조회 정책: Public bucket이므로 모든 사용자가 조회 가능
CREATE POLICY "Public can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'user-images');

-- 3. 업데이트 정책: 인증된 사용자는 자신의 파일만 업데이트 가능
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-images' AND
  (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'user-images' AND
  (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- 4. 삭제 정책: 인증된 사용자는 자신의 파일만 삭제 가능
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-images' AND
  (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- ============================================
-- 3. 확인 쿼리
-- ============================================

-- 버킷 생성 확인
-- SELECT * FROM storage.buckets WHERE id = 'user-images';

-- 정책 확인
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

