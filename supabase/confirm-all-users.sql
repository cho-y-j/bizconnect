-- 모든 사용자의 이메일 확인 상태를 true로 변경
-- 이 SQL을 Supabase Dashboard > SQL Editor에서 실행하세요

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- 확인: 사용자 목록 조회
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 완료 메시지
SELECT '모든 사용자의 이메일이 확인되었습니다.' as status;

