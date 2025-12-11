'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/admin'

interface User {
  id: string
  email: string
  created_at: string
  customer_count?: number
  sms_count?: number
  subscription?: {
    plan_type: string
    status: string
  }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [isSuper, setIsSuper] = useState(false)

  useEffect(() => {
    checkAuth()
    loadUsers()
  }, [])

  const checkAuth = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const superAdmin = await isSuperAdmin()
    setIsSuper(superAdmin)
  }

  const loadUsers = async () => {
    try {
      setLoading(true)

      // 사용자 목록 로드 (customers 테이블에서 user_id 추출)
      const { data: customersData } = await supabase
        .from('customers')
        .select('user_id, created_at')
        .order('created_at', { ascending: false })

      // 고유한 user_id 추출
      const uniqueUserIds = Array.from(
        new Set(customersData?.map((c) => c.user_id) || [])
      )

      // 각 사용자별 통계 수집
      const usersWithStats: User[] = []

      for (const userId of uniqueUserIds) {
        // 고객 수
        const { count: customerCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        // SMS 발송 수
        const { count: smsCount } = await supabase
          .from('sms_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        // 구독 정보
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan_type, status')
          .eq('user_id', userId)
          .single()

        // 첫 번째 고객의 created_at을 사용자 가입일로 사용
        const firstCustomer = customersData?.find((c) => c.user_id === userId)

        usersWithStats.push({
          id: userId,
          email: `user-${userId.substring(0, 8)}@example.com`, // 실제로는 auth.users에서 가져와야 함
          created_at: firstCustomer?.created_at || new Date().toISOString(),
          customer_count: customerCount || 0,
          sms_count: smsCount || 0,
          subscription: subscription || undefined,
        })
      }

      setUsers(usersWithStats)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase())

    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'active') {
      return matchesSearch && (user.sms_count || 0) > 0
    }
    return matchesSearch && (user.sms_count || 0) === 0
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 및 검색 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
            <p className="text-sm text-gray-500 mt-1">
              총 {users.length}명의 사용자
            </p>
          </div>

          <div className="flex gap-4">
            {/* 검색 */}
            <input
              type="text"
              placeholder="이메일 또는 ID로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* 필터 */}
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as 'all' | 'active' | 'inactive'
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="active">활성 사용자</option>
              <option value="inactive">비활성 사용자</option>
            </select>
          </div>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SMS 발송
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  구독
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    사용자를 찾을 수 없습니다.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.id.substring(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.customer_count?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.sms_count?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.subscription ? (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.subscription.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.subscription.plan_type} ({user.subscription.status})
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          없음
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        상세보기
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


