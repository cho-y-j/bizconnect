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
      return false
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single()

    if (error || !data) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking super admin status:', error)
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
 */
export async function checkSuperAdminAccess(): Promise<{ authorized: boolean; user: any | null }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { authorized: false, user: null }
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single()

    if (adminError || !adminUser) {
      return { authorized: false, user: null }
    }

    return { authorized: true, user }
  } catch (error) {
    console.error('Error checking super admin access:', error)
    return { authorized: false, user: null }
  }
}

