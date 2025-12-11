'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface Statistics {
  period: string
  totalUsers: number
  newUsers: number
  activeUsers: number
  totalSmsSent: number
  successfulSms: number
  failedSms: number
  totalCustomers: number
}

export default function StatisticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [stats, setStats] = useState<Statistics | null>(null)

  useEffect(() => {
    checkAuth()
    loadStatistics()
  }, [period, customStart, customEnd])

  const checkAuth = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
  }

  const getDateRange = () => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date()

    if (period === 'day') {
      start.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
      start.setDate(start.getDate() - 7)
    } else if (period === 'month') {
      start.setMonth(start.getMonth() - 1)
    } else if (period === 'year') {
      start.setFullYear(start.getFullYear() - 1)
    } else if (period === 'custom' && customStart && customEnd) {
      return {
        start: new Date(customStart),
        end: new Date(customEnd),
      }
    }

    return { start, end }
  }

  const loadStatistics = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()

      // 총 사용자 수
      const { count: totalUsers } = await supabase
        .from('customers')
        .select('user_id', { count: 'exact', head: true })

      // 신규 사용자 (기간 내)
      const { data: newUsersData } = await supabase
        .from('customers')
        .select('user_id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())

      const newUserIds = new Set(newUsersData?.map((c) => c.user_id) || [])

      // 활성 사용자 (기간 내 SMS 발송한 사용자)
      const { data: activeUsersData } = await supabase
        .from('sms_logs')
        .select('user_id')
        .gte('sent_at', start.toISOString())
        .lte('sent_at', end.toISOString())

      const activeUserIds = new Set(activeUsersData?.map((log) => log.user_id) || [])

      // SMS 통계
      const { data: smsLogs } = await supabase
        .from('sms_logs')
        .select('status')
        .gte('sent_at', start.toISOString())
        .lte('sent_at', end.toISOString())

      const totalSmsSent = smsLogs?.length || 0
      const successfulSms = smsLogs?.filter((log) => log.status === 'sent').length || 0
      const failedSms = smsLogs?.filter((log) => log.status === 'failed').length || 0

      // 고객 수
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      setStats({
        period: period,
        totalUsers: totalUsers || 0,
        newUsers: newUserIds.size,
        activeUsers: activeUserIds.size,
        totalSmsSent,
        successfulSms,
        failedSms,
        totalCustomers: totalCustomers || 0,
      })
    } catch (error) {
      console.error('Error loading statistics:', error)
    } finally {
      setLoading(false)
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
      {/* 기간 선택 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기간 선택</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setPeriod('day')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            오늘
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            최근 7일
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            최근 30일
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            최근 1년
          </button>
          <button
            onClick={() => setPeriod('custom')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            커스텀
          </button>
        </div>

        {period === 'custom' && (
          <div className="mt-4 flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작일
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">총 사용자</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.totalUsers.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">신규 사용자</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats.newUsers.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">활성 사용자</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.activeUsers.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">총 고객 수</div>
            <div className="text-3xl font-bold text-purple-600">
              {stats.totalCustomers.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">총 SMS 발송</div>
            <div className="text-3xl font-bold text-orange-600">
              {stats.totalSmsSent.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">성공한 SMS</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.successfulSms.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">실패한 SMS</div>
            <div className="text-3xl font-bold text-red-600">
              {stats.failedSms.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">성공률</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats.totalSmsSent > 0
                ? ((stats.successfulSms / stats.totalSmsSent) * 100).toFixed(1)
                : 0}
              %
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


