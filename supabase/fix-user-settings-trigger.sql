-- user_settings 트리거 수정
-- 이 SQL을 Supabase Dashboard > SQL Editor에서 실행하세요

-- 기존 트리거 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS create_default_user_settings();

-- 함수 재생성 (권한 수정)
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- 에러 발생 시에도 사용자 생성은 계속되도록
        RAISE WARNING 'Failed to create user_settings: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 트리거 재생성
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();

-- 함수 권한 확인
GRANT EXECUTE ON FUNCTION create_default_user_settings() TO service_role;
GRANT EXECUTE ON FUNCTION create_default_user_settings() TO anon;

-- 완료 메시지
SELECT 'user_settings 트리거 수정 완료!' as status;

