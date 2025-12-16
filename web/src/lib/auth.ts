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
    console.log('[SignUp] Starting signup process for:', email)
    
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
      console.error('[SignUp] Supabase signup error:', {
        message: error.message,
        status: error.status,
        name: error.name,
        fullError: error,
      })
      
      // 에러 메시지 개선
      if (error.message?.includes('Email signups are disabled')) {
        error.message = '이메일 회원가입이 비활성화되어 있습니다. 관리자에게 문의하세요.'
      } else if (error.message?.includes('User already registered')) {
        error.message = '이미 등록된 이메일입니다. 로그인을 시도해주세요.'
      } else if (error.message?.includes('Email address') && error.message?.includes('is invalid')) {
        error.message = '이메일 주소 형식이 올바르지 않거나 허용되지 않는 도메인입니다. 실제 이메일 주소를 사용해주세요.'
      } else if (error.message?.includes('Password')) {
        error.message = '비밀번호가 요구사항을 만족하지 않습니다. 최소 8자 이상이어야 합니다.'
      }
    }
    
    // 회원가입 성공 시 user_settings 자동 생성 (트리거가 없을 경우)
    if (data?.user && !error) {
      console.log('[SignUp] User created successfully:', data.user.id)
      
      try {
        const { error: settingsError } = await supabase
          .from('user_settings')
          .insert([{ user_id: data.user.id }])
          .select()
        
        if (settingsError) {
          console.warn('[SignUp] user_settings 자동 생성 실패 (트리거가 있을 수 있음):', settingsError)
          // 에러를 던지지 않음 - 회원가입은 성공한 것으로 처리
        } else {
          console.log('[SignUp] user_settings created successfully')
        }
      } catch (settingsErr) {
        console.warn('[SignUp] user_settings 생성 중 오류:', settingsErr)
        // 무시하고 계속 진행
      }
      
      // 세션 확인 (이메일 확인이 비활성화된 경우 즉시 세션 생성됨)
      if (!data.session) {
        console.log('[SignUp] No session found, waiting and checking again...')
        // 세션이 없으면 잠시 대기 후 다시 확인
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (session) {
          console.log('[SignUp] Session found after wait:', session.user.id)
          data.session = session
        } else if (sessionError) {
          console.warn('[SignUp] Session error after wait:', sessionError)
        } else {
          console.log('[SignUp] Email confirmation may be required')
        }
      } else {
        console.log('[SignUp] Session created immediately:', data.session.user.id)
      }
    }
    
    return { data, error }
  } catch (err) {
    console.error('[SignUp] Signup exception:', {
      error: err,
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
    })
    return { 
      data: null, 
      error: { 
        message: err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.' 
      } 
    }
  }
}

/**
 * 인앱 브라우저 감지 (카카오톡, 네이버, 라인 등)
 */
function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
  const ua = userAgent.toLowerCase()
  
  // 카카오톡, 네이버, 라인 등 인앱 브라우저 감지
  const inAppBrowsers = [
    'kakaotalk',      // 카카오톡
    'naver',          // 네이버
    'line',           // 라인
    'daum',           // 다음
    'wv',             // Android WebView
    'webview',        // WebView
    'wv',             // Chrome WebView
  ]
  
  return inAppBrowsers.some(browser => ua.includes(browser))
}

/**
 * 모바일 기기 감지
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
  const ua = userAgent.toLowerCase()
  
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
}

/**
 * 외부 브라우저로 열기 (Android Intent 또는 일반 URL)
 */
function openInExternalBrowser(url: string): void {
  const userAgent = navigator.userAgent.toLowerCase()
  
  // Android에서 카카오톡 인앱 브라우저인 경우
  if (userAgent.includes('android') && userAgent.includes('kakaotalk')) {
    // Android Intent를 사용하여 외부 브라우저로 열기 시도
    const intentUrl = `intent://${url.replace(/https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`
    
    // Intent URL로 먼저 시도
    const intentWindow = window.open(intentUrl, '_blank')
    
    // Intent가 작동하지 않으면 일반 URL로 폴백
    setTimeout(() => {
      if (!intentWindow || intentWindow.closed) {
        window.location.href = url
      }
    }, 500)
  } else {
    // iOS 또는 다른 경우 일반 URL로 리다이렉트
    window.location.href = url
  }
}

/**
 * 구글 로그인
 */
export async function signInWithGoogle() {
  try {
    const isMobile = isMobileDevice()
    const isInApp = isInAppBrowser()
    
    console.log('[Google OAuth] Device type:', isMobile ? 'mobile' : 'desktop')
    console.log('[Google OAuth] In-app browser:', isInApp)
    console.log('[Google OAuth] User-Agent:', typeof window !== 'undefined' ? navigator.userAgent : 'N/A')
    
    // 인앱 브라우저인 경우 사용자에게 안내
    if (isInApp) {
      const confirmMessage = '카카오톡 인앱 브라우저에서는 Google 로그인이 제한됩니다.\n\n외부 브라우저(Chrome, Safari)로 열어주세요.\n\n링크를 복사하여 외부 브라우저에서 열거나, 브라우저에서 직접 접속해주세요.'
      
      if (window.confirm(confirmMessage)) {
        // 사용자가 확인하면 외부 브라우저로 열기 시도
        // 하지만 인앱 브라우저에서는 제한적이므로, 사용자에게 직접 브라우저에서 열도록 안내
        return {
          data: null,
          error: {
            message: '카카오톡 인앱 브라우저에서는 Google 로그인을 지원하지 않습니다. Chrome 또는 Safari 브라우저에서 직접 접속해주세요.'
          }
        }
      } else {
        return { data: null, error: null }
      }
    }
    
    // 모든 환경에서 skipBrowserRedirect: true로 설정하여 직접 제어
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
        skipBrowserRedirect: true,
      }
    })
    
    if (error) {
      console.error('[Google OAuth] Error:', error)
      return { data, error }
    }
    
    // data.url을 받아서 직접 리다이렉트
    if (data?.url) {
      console.log('[Google OAuth] Redirecting to:', data.url)
      
      // 인앱 브라우저가 아닌 경우에만 리다이렉트
      if (!isInApp) {
        window.location.replace(data.url)
      } else {
        // 인앱 브라우저인 경우 외부 브라우저로 열기 시도
        openInExternalBrowser(data.url)
      }
      
      // 리다이렉트 후 함수가 계속 실행되지 않도록 빈 객체 반환
      return { data: null, error: null }
    }
    
    return { data, error }
  } catch (err) {
    console.error('[Google OAuth] Exception:', err)
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : '구글 로그인 중 오류가 발생했습니다.'
      }
    }
  }
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

