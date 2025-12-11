'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { isSuperAdmin } from '@/lib/admin'

interface FinanceStats {
  totalSubscriptions: number
  activeSubscriptions: number
  monthlyRevenue: number
  yearlyRevenue: number
  planDistribution: {
    free: number
    basic: number
    premium: number
    enterprise: number
  }
}

export default function FinancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isSuper, setIsSuper] = useState(false)
  const [stats, setStats] = useState<FinanceStats | null>(null)
  const [period, setPeriod] = useState<'month' | 'year'>('month')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isSuper) {
      loadFinanceStats()
    }
  }, [isSuper, period])

  const checkAuth = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const superAdmin = await isSuperAdmin()
    if (!superAdmin) {
      router.push('/admin')
      return
    }

    setIsSuper(true)
  }

  const loadFinanceStats = async () => {
    try {
      setLoading(true)

      // 구독 통계
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')

      const totalSubscriptions = subscriptions?.length || 0
      const activeSubscriptions =
        subscriptions?.filter((s) => s.status === 'active').length || 0

      // 플랜별 분포
      const planDistribution = {
        free: subscriptions?.filter((s) => s.plan_type === 'free').length || 0,
        basic: subscriptions?.filter((s) => s.plan_type === 'basic').length || 0,
        premium: subscriptions?.filter((s) => s.plan_type === 'premium').length || 0,
        enterprise:
          subscriptions?.filter((s) => s.plan_type === 'enterprise').length || 0,
      }

      // 수익 계산
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfYear = new Date(now.getFullYear(), 0, 1)

      const monthlySubscriptions = subscriptions?.filter(
        (s) =>
          s.status === 'active' &&
          new Date(s.start_date) <= now &&
          (!s.end_date || new Date(s.end_date) >= startOfMonth)
      ) || []

      const yearlySubscriptions = subscriptions?.filter(
        (s) =>
          s.status === 'active' &&
          new Date(s.start_date) <= now &&
          (!s.end_date || new Date(s.end_date) >= startOfYear)
      ) || []

      const monthlyRevenue = monthlySubscriptions.reduce(
        (sum, s) => sum + Number(s.billing_amount || 0),
        0
      )

      const yearlyRevenue = yearlySubscriptions.reduce(
        (sum, s) => sum + Number(s.billing_amount || 0),
        0
      )

      setStats({
        totalSubscriptions,
        activeSubscriptions,
        monthlyRevenue,
        yearlyRevenue,
        planDistribution,
      })
    } catch (error) {
      console.error('Error loading finance stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isSuper) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">슈퍼 관리자만 접근할 수 있습니다.</p>
      </div>
    )
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
      {/* 기간 선택 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4">
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            월별
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            연별
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">총 구독자</div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.totalSubscriptions.toLocaleString()}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">활성 구독</div>
              <div className="text-3xl font-bold text-green-600">
                {stats.activeSubscriptions.toLocaleString()}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">월간 수익 (MRR)</div>
              <div className="text-3xl font-bold text-blue-600">
                {stats.monthlyRevenue.toLocaleString()}원
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">연간 수익 (ARR)</div>
              <div className="text-3xl font-bold text-purple-600">
                {stats.yearlyRevenue.toLocaleString()}원
              </div>
            </div>
          </div>

          {/* 플랜별 분포 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              플랜별 구독자 분포
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Free</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.planDistribution.free}
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Basic</div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.planDistribution.basic}
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Premium</div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.planDistribution.premium}
                </div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Enterprise</div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.planDistribution.enterprise}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


