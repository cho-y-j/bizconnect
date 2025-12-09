'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import type { SMSLog } from '@/lib/types/sms'

export default function HistoryPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<SMSLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all')
  const [customers, setCustomers] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20

  useEffect(() => {
    checkAuth()
    loadCustomers()
    loadLogs()
  }, [currentPage, selectedStatus, selectedDate, selectedCustomerId, searchQuery])

  const checkAuth = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/auth/login')
    }
  }

  const loadCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      setCustomers(data || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const loadLogs = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // sms_logs만 먼저 조회
      let query = supabase
        .from('sms_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })

      // 상태 필터 (pending도 포함)
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus)
      }

      // 날짜 필터
      if (selectedDate) {
        const startDate = new Date(selectedDate)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(selectedDate)
        endDate.setHours(23, 59, 59, 999)
        
        query = query
          .gte('sent_at', startDate.toISOString())
          .lte('sent_at', endDate.toISOString())
      }

      // 검색 필터 (전화번호 또는 메시지 내용)
      if (searchQuery.trim()) {
        query = query.or(`phone_number.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`)
      }

      // 고객 필터 (전화번호로 매칭)
      if (selectedCustomerId !== 'all') {
        const customer = customers.find(c => c.id === selectedCustomerId)
        if (customer) {
          const normalizedPhone = customer.phone.replace(/\D/g, '')
          query = query.eq('phone_number', normalizedPhone)
        }
      }

      // 페이지네이션
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data: logsData, error, count } = await query

      if (error) {
        console.error('Error loading logs:', error)
        setLogs([])
        setTotalCount(0)
        return
      }

      // 고객 정보 매칭 (phone_number로)
      if (logsData && logsData.length > 0) {
        // 모든 고객 정보 가져오기
        const { data: allCustomers } = await supabase
          .from('customers')
          .select(`
            id,
            name,
            phone,
            group:customer_groups(
              id,
              name,
              color
            )
          `)
          .eq('user_id', user.id)

        // phone_number로 매칭
        const logsWithCustomers = logsData.map((log: any) => {
          const normalizedLogPhone = log.phone_number.replace(/\D/g, '')
          const customer = allCustomers?.find((c: any) => {
            const normalizedCustomerPhone = c.phone.replace(/\D/g, '')
            return normalizedCustomerPhone === normalizedLogPhone
          })

          return {
            ...log,
            customer: customer || undefined,
          }
        })

        setLogs(logsWithCustomers)
        setTotalCount(count || 0)
      } else {
        setLogs([])
        setTotalCount(0)
      }
    } catch (error) {
      console.error('Error:', error)
      setLogs([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const formatDateTime = (date: string) => {
    const d = new Date(date)
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }
    const labels = {
      sent: '발송됨',
      delivered: '전달됨',
      failed: '실패',
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
                비즈커넥트
              </Link>
              <span className="text-gray-400">/</span>
              <h1 className="text-xl font-semibold text-gray-900">발송 기록</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 필터 */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            {/* 검색 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="전화번호 또는 메시지"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 상태 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">전체</option>
                <option value="sent">발송됨</option>
                <option value="delivered">전달됨</option>
                <option value="failed">실패</option>
              </select>
            </div>

            {/* 날짜 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                날짜
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 고객 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                고객
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">전체</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({formatPhone(customer.phone)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 발송 기록 목록 */}
        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500 mb-4">발송 기록이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      발송 시간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      고객
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      전화번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      메시지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(log.sent_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.customer ? (
                          <Link
                            href={`/dashboard/customers/${log.customer.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-900 flex items-center gap-2"
                          >
                            {log.customer.name}
                            {log.customer.group && (
                              <span
                                className="px-2 py-0.5 text-xs rounded-full text-white"
                                style={{ backgroundColor: log.customer.group.color }}
                              >
                                {log.customer.group.name}
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">고객 정보 없음</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPhone(log.phone_number)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-md">
                        <div className="line-clamp-2">{log.message}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                        {log.error_message && (
                          <div className="mt-1 text-xs text-red-600">
                            {log.error_message}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  이전
                </button>
                <span className="px-4 py-2 text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  다음
                </button>
              </div>
            )}

            {/* 통계 */}
            <div className="mt-6 text-sm text-gray-600 text-center">
              총 {totalCount}건의 발송 기록
            </div>
          </>
        )}
      </main>
    </div>
  )
}

