'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import ConversationSummary from '@/components/ConversationSummary'
import type { Customer, CustomerTag } from '@/lib/types/customer'
import type { SMSLog } from '@/lib/types/sms'
import { tagsToText } from '@/lib/utils/tagParser'

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<(Customer & { tags?: CustomerTag[]; group?: any }) | null>(null)
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)

  useEffect(() => {
    loadCustomer()
    loadSMSLogs()
  }, [customerId])

  const loadCustomer = async () => {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          group:customer_groups(*),
          tags:customer_tags(*)
        `)
        .eq('id', customerId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading customer:', error)
        router.push('/dashboard/customers')
      } else {
        setCustomer(data)
      }
    } catch (err) {
      console.error('Error:', err)
      router.push('/dashboard/customers')
    } finally {
      setLoading(false)
    }
  }

  const loadSMSLogs = async () => {
    try {
      setLogsLoading(true)
      const user = await getCurrentUser()
      if (!user) return

      // 고객의 전화번호로 발송 내역 조회
      if (!customer) return

      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone_number', customer.phone.replace(/\D/g, ''))
        .order('sent_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error loading SMS logs:', error)
      } else {
        setSmsLogs(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLogsLoading(false)
    }
  }

  // customer가 로드된 후 SMS 로그 로드
  useEffect(() => {
    if (customer) {
      loadSMSLogs()
    }
  }, [customer])

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ko-KR')
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

  if (!customer) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/customers" className="text-2xl font-bold text-blue-600">
              비즈커넥트
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/dashboard/customers" className="text-gray-600 hover:text-gray-900">
              고객 관리
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-xl font-semibold text-gray-900">{customer.name}</h1>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* 고객 정보 카드 */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                <Link
                  href={`/dashboard/customers/${customer.id}/edit`}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  수정
                </Link>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">전화번호</label>
                  <p className="text-sm text-gray-900">{formatPhone(customer.phone)}</p>
                </div>

                {customer.group && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">그룹</label>
                    <div className="mt-1">
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded-full text-white"
                        style={{ backgroundColor: customer.group.color }}
                      >
                        {customer.group.name}
                      </span>
                    </div>
                  </div>
                )}

                {customer.tags && customer.tags.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">태그</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {customer.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                        >
                          {tag.tag_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {customer.birthday && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">생일</label>
                    <p className="text-sm text-gray-900">{formatDate(customer.birthday)}</p>
                  </div>
                )}

                {customer.anniversary && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">기념일</label>
                    <p className="text-sm text-gray-900">{formatDate(customer.anniversary)}</p>
                  </div>
                )}

                {customer.address && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">주소</label>
                    <p className="text-sm text-gray-900">{customer.address}</p>
                  </div>
                )}

                {customer.occupation && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">직업</label>
                    <p className="text-sm text-gray-900">{customer.occupation}</p>
                  </div>
                )}

                {(customer.age || customer.birth_year) && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">나이</label>
                    <p className="text-sm text-gray-900">
                      {customer.age ? `${customer.age}세` : customer.birth_year ? `${new Date().getFullYear() - customer.birth_year}세 (추정)` : '-'}
                    </p>
                  </div>
                )}

                {customer.notes && (
                  <div>
                    <label className="text-xs font-medium text-slate-500">메모</label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{customer.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <Link
                    href={`/dashboard/send?customerId=${customer.id}`}
                    className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    문자 보내기
                  </Link>
                  
                  {/* 생일/기념일 자동 발송 예약 */}
                  {(customer.birthday || customer.anniversary) && (
                    <div className="pt-2 border-t border-gray-200">
                      <h3 className="text-xs font-semibold text-slate-700 mb-2">자동 발송 예약</h3>
                      {customer.birthday && (
                        <Link
                          href={`/dashboard/send?customerId=${customer.id}&autoSchedule=birthday`}
                          className="block w-full px-3 py-2 mb-2 bg-pink-50 text-pink-700 text-center rounded-lg hover:bg-pink-100 transition-colors text-sm"
                        >
                          생일 축하 문자 예약
                        </Link>
                      )}
                      {customer.anniversary && (
                        <Link
                          href={`/dashboard/send?customerId=${customer.id}&autoSchedule=anniversary`}
                          className="block w-full px-3 py-2 bg-purple-50 text-purple-700 text-center rounded-lg hover:bg-purple-100 transition-colors text-sm"
                        >
                          기념일 문자 예약
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 대화 요약 카드 */}
            <ConversationSummary
              customerId={customer.id}
              customerPhone={customer.phone}
              customerName={customer.name}
            />
          </div>

          {/* 발송 내역 카드 */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">발송 내역</h2>
                <Link
                  href={`/dashboard/history?customer=${customer.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  전체 보기
                </Link>
              </div>

              {logsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">로딩 중...</p>
                </div>
              ) : smsLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>발송 내역이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {smsLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm text-gray-500 mb-1">
                            {formatDateTime(log.sent_at)}
                          </div>
                          <div className="text-sm text-gray-900 whitespace-pre-wrap">
                            {log.message || '메시지 없음'}
                          </div>
                          {log.image_url && (
                            <div className="mt-2">
                              <img
                                src={log.image_url}
                                alt={log.image_name || '첨부 이미지'}
                                className="max-w-xs max-h-32 rounded"
                              />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(log.status)}
                        </div>
                      </div>
                      {log.error_message && (
                        <div className="mt-2 text-xs text-red-600">
                          오류: {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

