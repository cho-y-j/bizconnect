import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export interface User {
  id: string
  email?: string
  name?: string
}

/**
 * 현재 로그인한 사용자 정보 가져오기
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // 세션 확인
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('[getCurrentUser] Session error:', sessionError)
    }
    
    if (!session) {
      console.log('[getCurrentUser] No session found')
      // 세션이 없어도 getUser()를 시도 (토큰이 있을 수 있음)
    } else {
      console.log('[getCurrentUser] Session found:', session.user.id)
    }

    // getUser()는 자동으로 토큰을 사용하여 사용자 정보를 가져옴
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.log('[getCurrentUser] Error getting user:', error)
      return null
    }
    
    if (!user) {
      console.log('[getCurrentUser] No user found')
      return null
    }

    console.log('[getCurrentUser] User found:', user.id, user.email)
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0]
    }
  } catch (error) {
    console.error('[getCurrentUser] Exception:', error)
    return null
  }
}

/**
 * 로그인 상태 확인
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

/**
 * 이메일/비밀번호로 로그인
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    // 에러 상세 정보 로깅
    if (error) {
      console.error('Supabase login error:', error)
      
      // 특정 에러 메시지 개선
      if (error.message?.includes('Email not confirmed')) {
        error.message = '이메일을 확인해주세요. 이메일 확인 링크를 클릭하거나 관리자에게 문의하세요.'
      } else if (error.message?.includes('Invalid login credentials')) {
        error.message = '이메일 또는 비밀번호가 올바르지 않습니다.'
      }
    } else if (data?.session) {
      // 로그인 성공 시 세션 확인
      console.log('[Login] Session created:', data.session.user.id)
      
      // 세션이 제대로 저장되었는지 확인
      const { data: { session: verifySession } } = await supabase.auth.getSession()
      if (verifySession) {
        console.log('[Login] Session verified:', verifySession.user.id)
      } else {
        console.warn('[Login] Session not found after login!')
      }
    }
    
    return { data, error }
  } catch (err) {
    console.error('Login exception:', err)
    return { 
      data: null, 
      error: { 
        message: err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.' 
      } 
    }
  }
}

/**
 * 이메일/비밀번호로 회원가입
 */
export async function signUpWithEmail(email: string, password: string, name?: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      }
    })
    
    // 에러 상세 정보 로깅
    if (error) {
      console.error('Supabase signup error:', error)
    }
    
    // 회원가입 성공 시 user_settings 자동 생성 (트리거가 없을 경우)
    if (data?.user && !error) {
      try {
        const { error: settingsError } = await supabase
          .from('user_settings')
          .insert([{ user_id: data.user.id }])
          .select()
        
        if (settingsError) {
          console.warn('user_settings 자동 생성 실패 (트리거가 있을 수 있음):', settingsError)
          // 에러를 던지지 않음 - 회원가입은 성공한 것으로 처리
        }
      } catch (settingsErr) {
        console.warn('user_settings 생성 중 오류:', settingsErr)
        // 무시하고 계속 진행
      }
      
      // 세션 확인 (이메일 확인이 비활성화된 경우 즉시 세션 생성됨)
      if (!data.session) {
        // 세션이 없으면 잠시 대기 후 다시 확인
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          data.session = session
        }
      }
    }
    
    return { data, error }
  } catch (err) {
    console.error('Signup exception:', err)
    return { 
      data: null, 
      error: { 
        message: err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.' 
      } 
    }
  }
}

/**
 * 구글 로그인
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    }
  })
  
  return { data, error }
}

/**
 * 로그아웃
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * 비밀번호 재설정 이메일 발송
 */
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  
  return { data, error }
}

