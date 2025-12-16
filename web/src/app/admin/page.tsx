'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  todayAccess: number
  todaySmsSent: number
  activeSubscriptions: number
}

interface RecentUser {
  id: string
  email: string
  created_at: string
}

interface RecentAccess {
  id: string
  user_id: string | null
  route: string
  ip_address: string
  created_at: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    todayAccess: 0,
    todaySmsSent: 0,
    activeSubscriptions: 0,
  })
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentAccess, setRecentAccess] = useState<RecentAccess[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // 전체 통계 로드
      await Promise.all([
        loadStats(),
        loadRecentUsers(),
        loadRecentAccess(),
      ])
    } catch (error) {
      console.error('Error loading admin dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // 총 사용자 수 (API를 통해 가져오기)
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      let totalUsers = 0
      if (response.ok) {
        const data = await response.json()
        totalUsers = data.users?.length || 0
      }

      // 최근 30일 내 활성 사용자 (SMS 발송한 사용자)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: activeUsersData } = await supabase
        .from('sms_logs')
        .select('user_id')
        .gte('sent_at', thirtyDaysAgo.toISOString())

      const activeUserIds = new Set(
        activeUsersData?.map((log) => log.user_id) || []
      )

      // 오늘 접속 수
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { count: todayAccess } = await supabase
        .from('access_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // 오늘 SMS 발송 수
      const { count: todaySmsSent } = await supabase
        .from('sms_logs')
        .select('*', { count: 'exact', head: true })
        .gte('sent_at', today.toISOString())

      // 활성 구독 수
      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUserIds.size,
        todayAccess: todayAccess || 0,
        todaySmsSent: todaySmsSent || 0,
        activeSubscriptions: activeSubscriptions || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadRecentUsers = async () => {
    try {
      // API 엔드포인트를 통해 최근 가입 사용자 로드 (auth.users에서 실제 이메일 가져오기)
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Error loading recent users:', response.statusText)
        return
      }

      const data = await response.json()
      // 최근 5명만 가져오기 (이미 API에서 정렬되어 있음)
      const recentUsers = (data.users || []).slice(0, 5).map((user: any) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      }))

      setRecentUsers(recentUsers)
    } catch (error) {
      console.error('Error loading recent users:', error)
    }
  }

  const loadRecentAccess = async () => {
    try {
      const { data } = await supabase
        .from('access_logs')
        .select('id, user_id, route, ip_address, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      setRecentAccess(data || [])
    } catch (error) {
      console.error('Error loading recent access:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">총 사용자</div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.totalUsers.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">활성 사용자</div>
          <div className="text-3xl font-bold text-blue-600">
            {stats.activeUsers.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">최근 30일</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">오늘 접속</div>
          <div className="text-3xl font-bold text-green-600">
            {stats.todayAccess.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">오늘 SMS 발송</div>
          <div className="text-3xl font-bold text-purple-600">
            {stats.todaySmsSent.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">활성 구독</div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.activeSubscriptions.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 가입 사용자 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              최근 가입 사용자
            </h2>
          </div>
          <div className="p-6">
            {recentUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">데이터가 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {recentUsers.map((user) => (
                  <li
                    key={user.id}
                    className="flex justify-between items-center py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{user.email}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      상세보기
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Link
                href="/admin/users"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                전체 보기 →
              </Link>
            </div>
          </div>
        </div>

        {/* 최근 접속 로그 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">최근 접속 로그</h2>
          </div>
          <div className="p-6">
            {recentAccess.length === 0 ? (
              <p className="text-gray-500 text-center py-4">데이터가 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {recentAccess.map((access) => (
                  <li
                    key={access.id}
                    className="py-2 border-b last:border-0"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{access.route}</p>
                        <p className="text-sm text-gray-500">
                          {access.ip_address} •{' '}
                          {new Date(access.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Link
                href="/admin/access-logs"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                전체 보기 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


