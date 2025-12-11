'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface AccessLog {
  id: string
  user_id: string | null
  ip_address: string
  user_agent: string
  route: string
  method: string
  status_code: number
  response_time: number
  created_at: string
}

export default function AccessLogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRoute, setFilterRoute] = useState('')
  const [filterMethod, setFilterMethod] = useState('all')
  const [dateFilter, setDateFilter] = useState('today')

  useEffect(() => {
    checkAuth()
    loadLogs()
  }, [dateFilter])

  const checkAuth = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
  }

  const loadLogs = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)

      // 날짜 필터
      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        query = query.gte('created_at', today.toISOString())
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('created_at', monthAgo.toISOString())
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading access logs:', error)
      } else {
        setLogs(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_agent && log.user_agent.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesRoute = !filterRoute || log.route.includes(filterRoute)
    const matchesMethod = filterMethod === 'all' || log.method === filterMethod

    return matchesSearch && matchesRoute && matchesMethod
  })

  // 고유한 경로 목록 (필터용)
  const uniqueRoutes = Array.from(new Set(logs.map((log) => log.route))).slice(0, 20)

  // User-Agent 파싱 (간단한 버전)
  const parseUserAgent = (ua: string) => {
    if (!ua) return 'Unknown'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Other'
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
      {/* 필터 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색
            </label>
            <input
              type="text"
              placeholder="경로, IP, User-Agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              경로 필터
            </label>
            <select
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              {uniqueRoutes.map((route) => (
                <option key={route} value={route}>
                  {route}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메서드
            </label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              기간
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">오늘</option>
              <option value="week">최근 7일</option>
              <option value="month">최근 30일</option>
              <option value="all">전체</option>
            </select>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">총 접속</div>
          <div className="text-3xl font-bold text-gray-900">
            {filteredLogs.length.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">평균 응답 시간</div>
          <div className="text-3xl font-bold text-blue-600">
            {filteredLogs.length > 0
              ? Math.round(
                  filteredLogs.reduce((sum, log) => sum + log.response_time, 0) /
                    filteredLogs.length
                )
              : 0}
            ms
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">고유 IP</div>
          <div className="text-3xl font-bold text-green-600">
            {new Set(filteredLogs.map((log) => log.ip_address)).size}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">고유 경로</div>
          <div className="text-3xl font-bold text-purple-600">
            {new Set(filteredLogs.map((log) => log.route)).size}
          </div>
        </div>
      </div>

      {/* 접속 로그 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  경로
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  메서드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP 주소
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  브라우저
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  응답 시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    접속 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 100).map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                      {log.route}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          log.method === 'GET'
                            ? 'bg-blue-100 text-blue-800'
                            : log.method === 'POST'
                            ? 'bg-green-100 text-green-800'
                            : log.method === 'DELETE'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {log.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {log.ip_address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {parseUserAgent(log.user_agent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.response_time}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          log.status_code >= 200 && log.status_code < 300
                            ? 'bg-green-100 text-green-800'
                            : log.status_code >= 400
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {log.status_code}
                      </span>
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


