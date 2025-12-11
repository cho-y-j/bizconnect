'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, signOut } from '@/lib/auth'
import { isAdmin, isSuperAdmin, getAdminUser } from '@/lib/admin'
import { supabase } from '@/lib/supabaseClient'
import type { AdminUser } from '@/lib/admin'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [isSuper, setIsSuper] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      // 먼저 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('[Admin Layout] Session check:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        error: sessionError 
      })
      
      if (!session) {
        console.log('[Admin Layout] No session, redirecting to login')
        router.push('/auth/login')
        return
      }

      const currentUser = await getCurrentUser()
      console.log('[Admin Layout] Current user:', currentUser)
      
      if (!currentUser) {
        console.log('[Admin Layout] No user, redirecting to login')
        router.push('/auth/login')
        return
      }

      // 관리자 권한 확인
      console.log('[Admin Layout] Checking admin status...')
      const admin = await isAdmin()
      console.log('[Admin Layout] Admin status:', admin)
      
      if (!admin) {
        console.log('[Admin Layout] Not admin, redirecting to dashboard')
        router.push('/dashboard')
        return
      }

      setUser(currentUser)
      
      // 관리자 정보 가져오기
      const adminInfo = await getAdminUser()
      console.log('[Admin Layout] Admin info:', adminInfo)
      
      if (adminInfo) {
        setAdminUser(adminInfo)
        setIsSuper(adminInfo.role === 'super_admin')
      }

      setLoading(false)
    } catch (error) {
      console.error('[Admin Layout] Error in checkAuth:', error)
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Admin Layout] Auth state change:', event, session)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        checkAuth()
      }
    })

    checkAuth()

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [checkAuth])

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  const menuItems = [
    {
      name: '대시보드',
      href: '/admin',
      icon: '📊',
    },
    {
      name: '사용자 관리',
      href: '/admin/users',
      icon: '👥',
    },
    {
      name: '접속 로그',
      href: '/admin/access-logs',
      icon: '📝',
    },
    {
      name: '통계',
      href: '/admin/statistics',
      icon: '📈',
    },
    // 슈퍼 관리자만 결산 메뉴 표시
    ...(isSuper
      ? [
          {
            name: '결산',
            href: '/admin/finance',
            icon: '💰',
          },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 사이드바 */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-10">
        <div className="p-6 border-b">
          <Link href="/admin" className="text-2xl font-bold text-blue-600">
            관리자
          </Link>
          <p className="text-sm text-gray-500 mt-1">
            {isSuper ? '슈퍼 관리자' : '관리자'}
          </p>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="mb-4">
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="flex-1 px-4 py-2 text-sm text-center text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              일반 대시보드
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2 text-sm text-center text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div className="ml-64">
        {/* 헤더 */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {menuItems.find((item) => item.href === pathname)?.name ||
                  '관리자'}
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}

