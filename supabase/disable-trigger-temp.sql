-- 트리거 임시 비활성화 (회원가입 테스트용)
-- 이 SQL을 Supabase Dashboard > SQL Editor에서 실행하세요

-- 트리거 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 완료 메시지
SELECT '트리거가 비활성화되었습니다. 회원가입 후 수동으로 user_settings를 생성하세요.' as status;

