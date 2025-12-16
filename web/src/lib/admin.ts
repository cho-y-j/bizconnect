import { supabase } from './supabaseClient'
import { getCurrentUser } from './auth'

/**
 * 관리자 권한 확인 유틸리티
 */

export interface AdminUser {
  id: string
  user_id: string
  role: 'super_admin' | 'admin'
  created_at: string
  updated_at: string
}

/**
 * 현재 사용자가 관리자인지 확인
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.log('[Admin Check] No user found')
      return false
    }

    console.log('[Admin Check] Checking admin status for user:', user.id)

    const { data, error } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('[Admin Check] Error:', error)
      return false
    }

    if (!data) {
      console.log('[Admin Check] No admin record found for user')
      return false
    }

    console.log('[Admin Check] Admin record found:', data)
    return true
  } catch (error) {
    console.error('[Admin Check] Exception:', error)
    return false
  }
}

/**
 * 현재 사용자가 슈퍼 관리자인지 확인
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.log('[isSuperAdmin] No user found')
      return false
    }

    console.log('[isSuperAdmin] Checking for user:', user.id)

    const { data, error } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle()

    if (error) {
      console.error('[isSuperAdmin] Error:', error)
      return false
    }

    if (!data) {
      console.log('[isSuperAdmin] No super admin record found')
      return false
    }

    console.log('[isSuperAdmin] Super admin confirmed:', data)
    return true
  } catch (error) {
    console.error('[isSuperAdmin] Exception:', error)
    return false
  }
}

/**
 * 현재 사용자의 관리자 정보 가져오기
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return null
    }

    return data as AdminUser
  } catch (error) {
    console.error('Error getting admin user:', error)
    return null
  }
}

/**
 * 관리자 권한 체크 미들웨어 (서버 사이드)
 * API 라우트에서 사용
 */
export async function checkAdminAccess(): Promise<{ authorized: boolean; user: any | null }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { authorized: false, user: null }
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminUser) {
      return { authorized: false, user: null }
    }

    return { authorized: true, user }
  } catch (error) {
    console.error('Error checking admin access:', error)
    return { authorized: false, user: null }
  }
}

/**
 * 슈퍼 관리자 권한 체크 미들웨어 (서버 사이드)
 * API 라우트에서 사용
 * @param request NextRequest 객체 (쿠키에서 세션 읽기용)
 */
export async function checkSuperAdminAccess(request?: any): Promise<{ authorized: boolean; user: any | null }> {
  try {
    // 서버 사이드에서는 쿠키에서 세션을 읽어야 함
    let user: any = null
    
    if (request) {
      // NextRequest에서 쿠키 읽기
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      
      // 쿠키에서 세션 토큰 추출
      const cookies = request.cookies
      const accessToken = cookies.get('sb-access-token')?.value || 
                         cookies.get('sb-hdeebyhwoogxawjkwufx-auth-token')?.value
      
      if (accessToken) {
        const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        })
        
        const { data: { user: authUser }, error: authError } = await supabaseServer.auth.getUser(accessToken)
        if (!authError && authUser) {
          user = authUser
        }
      }
    }
    
    // 쿠키에서 가져오지 못했으면 클라이언트 사이드 방식 시도
    if (!user) {
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      if (!error && authUser) {
        user = authUser
      }
    }
    
    if (!user) {
      console.log('[checkSuperAdminAccess] No user found')
      return { authorized: false, user: null }
    }

    console.log('[checkSuperAdminAccess] Checking admin status for user:', user.id)

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle()

    if (adminError) {
      console.error('[checkSuperAdminAccess] Error:', adminError)
      return { authorized: false, user: null }
    }

    if (!adminUser) {
      console.log('[checkSuperAdminAccess] No super admin record found')
      return { authorized: false, user: null }
    }

    console.log('[checkSuperAdminAccess] Super admin confirmed')
    return { authorized: true, user }
  } catch (error) {
    console.error('[checkSuperAdminAccess] Exception:', error)
    return { authorized: false, user: null }
  }
}

