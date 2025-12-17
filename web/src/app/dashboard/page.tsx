'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'

interface Task {
  id: string
  type: string
  customer_name: string | null
  customer_phone: string
  message_content: string
  status: string
  scheduled_at?: string | null
  created_at: string
}

interface Stats {
  totalCustomers: number
  pendingTasks: number
  todaySent: number
  totalGroups: number
}

interface TodayEvent {
  id: string
  type: 'birthday' | 'anniversary'
  customer_name: string
  customer_phone: string
  date: string
  age?: number
  years?: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    pendingTasks: 0,
    todaySent: 0,
    totalGroups: 0,
  })
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
    loadTodayTasks()
    loadStats()
    loadTodayEvents()
  }, [])

  const checkAuth = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/auth/login')
      return
    }
    setUser(currentUser)
  }

  const loadTodayTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 오늘 날짜 범위 계산
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // 오늘 예약된 문자만 조회 (scheduled_at이 오늘인 것만)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'queued'])
        .not('scheduled_at', 'is', null) // 예약된 것만
        .gte('scheduled_at', today.toISOString()) // 오늘 이후
        .lt('scheduled_at', tomorrow.toISOString()) // 내일 이전 (즉, 오늘)
        .order('scheduled_at', { ascending: true })
        .limit(20)

      if (error) {
        console.error('Error loading tasks:', error)
      } else {
        setTasks(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 사용자 설정에서 이름 가져오기
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('full_name')
        .eq('user_id', user.id)
        .single()
      
      if (userSettings?.full_name) {
        setUserName(userSettings.full_name)
      }

      // 고객 수
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // 대기 중인 작업 수 (예약 발송만 - pending 상태이면서 scheduled_at이 있는 것)
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .not('scheduled_at', 'is', null)

      // 오늘 발송된 문자 수 (sent + failed 포함, pending 제외)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: sentCount, error: sentCountError } = await supabase
        .from('sms_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['sent', 'failed', 'delivered']) // pending 제외
        .gte('sent_at', today.toISOString())
      
      if (sentCountError) {
        console.error('❌ Error loading today sent count:', sentCountError)
      } else {
        console.log('📊 Today sent count:', sentCount)
      }

      // 그룹 수
      const { count: groupCount } = await supabase
        .from('customer_groups')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setStats({
        totalCustomers: customerCount || 0,
        pendingTasks: taskCount || 0,
        todaySent: sentCount || 0,
        totalGroups: groupCount || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadTodayEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const todayMonth = today.getMonth() + 1 // 1-12
      const todayDay = today.getDate()

      // 오늘 생일인 고객 조회
      const { data: birthdayCustomers } = await supabase
        .from('customers')
        .select('id, name, phone, birthday')
        .eq('user_id', user.id)
        .not('birthday', 'is', null)

      // 오늘 기념일인 고객 조회
      const { data: anniversaryCustomers } = await supabase
        .from('customers')
        .select('id, name, phone, anniversary')
        .eq('user_id', user.id)
        .not('anniversary', 'is', null)

      const events: TodayEvent[] = []

      // 생일 처리
      if (birthdayCustomers) {
        birthdayCustomers.forEach(customer => {
          if (customer.birthday) {
            const birthday = new Date(customer.birthday)
            const birthdayMonth = birthday.getMonth() + 1
            const birthdayDay = birthday.getDate()

            if (birthdayMonth === todayMonth && birthdayDay === todayDay) {
              const age = today.getFullYear() - birthday.getFullYear()
              events.push({
                id: customer.id,
                type: 'birthday',
                customer_name: customer.name,
                customer_phone: customer.phone,
                date: customer.birthday,
                age,
              })
            }
          }
        })
      }

      // 기념일 처리
      if (anniversaryCustomers) {
        anniversaryCustomers.forEach(customer => {
          if (customer.anniversary) {
            const anniversary = new Date(customer.anniversary)
            const anniversaryMonth = anniversary.getMonth() + 1
            const anniversaryDay = anniversary.getDate()

            if (anniversaryMonth === todayMonth && anniversaryDay === todayDay) {
              const years = today.getFullYear() - anniversary.getFullYear()
              events.push({
                id: customer.id,
                type: 'anniversary',
                customer_name: customer.name,
                customer_phone: customer.phone,
                date: customer.anniversary,
                years,
              })
            }
          }
        })
      }

      setTodayEvents(events)
    } catch (error) {
      console.error('Error loading today events:', error)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 개인 설정 안내 배너 */}
        {!userName && (
          <div className="mb-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6 sm:p-8 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">개인 설정을 통하여 나만의 맞춤 AI를 만드세요</h3>
                <p className="text-sm sm:text-base text-slate-300 mb-4">
                  이름, 회사명, 직책 등 개인정보를 입력하면 AI가 더 정확하고 개인화된 메시지를 자동 생성할 수 있습니다.
                </p>
                <Link
                  href="/dashboard/settings"
                  className="inline-block px-5 py-2.5 bg-white text-slate-900 rounded-xl hover:bg-slate-100 transition-all font-semibold text-sm"
                >
                  개인 설정 바로가기 →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 환영 메시지 */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
            {userName ? `${userName}님, ` : ''}오늘도 효율적인 영업 활동을 시작해보세요.
          </h1>
          <p className="text-sm sm:text-base text-slate-600">대시보드에서 모든 기능을 한눈에 확인하고 관리하세요.</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white text-sm font-semibold">
                고객
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium mb-1">총 고객 수</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalCustomers.toLocaleString()}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link href="/dashboard/customers" className="text-sm text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1">
                고객 관리 <span>→</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white text-sm font-semibold">
                예약
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium mb-1">예약 발송</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.pendingTasks.toLocaleString()}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link href="/dashboard/scheduled" className="text-sm text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1">
                예약 확인 <span>→</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-sm font-semibold">
                발송
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium mb-1">오늘 발송</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{stats.todaySent.toLocaleString()}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link href="/dashboard/history" className="text-sm text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1">
                발송 기록 <span>→</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center text-white text-sm font-semibold">
                그룹
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium mb-1">그룹 수</p>
                <p className="text-2xl sm:text-3xl font-bold text-violet-600">{stats.totalGroups.toLocaleString()}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link href="/dashboard/customers/groups" className="text-sm text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1">
                그룹 관리 <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 오늘의 이벤트 (생일/기념일) - 개선된 디자인 */}
        {todayEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">오늘의 특별한 날</h2>
              <span className="px-3 py-1 bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 text-sm font-semibold rounded-full">
                {todayEvents.length}건
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {todayEvents.map((event) => (
                <div
                  key={`${event.type}-${event.id}`}
                  className={`rounded-2xl border border-slate-200 bg-white shadow-md p-6 hover:shadow-lg transition-all transform hover:-translate-y-0.5`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {event.type === 'birthday' ? '생일' : '기념일'}
                      </div>
                      <h3 className="text-xl font-semibold mb-1 text-slate-900">{event.customer_name}님</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        {event.type === 'birthday'
                          ? `${event.age}세 생일입니다.`
                          : `${event.years}주년 기념일입니다.`}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/send?customerId=${event.id}`}
                      className="ml-4 px-6 py-3 bg-slate-900 text-white rounded-xl transition-all text-sm font-semibold hover:bg-slate-800 whitespace-nowrap"
                    >
                      축하 문자 보내기 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 오늘의 할 일 섹션 */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">오늘의 할 일</h2>
            <p className="text-sm sm:text-base text-slate-600">
              {tasks.length > 0 || todayEvents.length > 0
                ? `오늘 예약된 문자 ${tasks.length}개${todayEvents.length > 0 ? `와 오늘 생일/기념일 ${todayEvents.length}개` : ''}가 있습니다.`
                : todayEvents.length > 0
                ? `오늘 생일/기념일 ${todayEvents.length}개가 있습니다.`
                : '오늘 예약된 문자가 없습니다.'}
            </p>
          </div>

          {/* 작업 카드들 */}
          <div className="space-y-4">
            {tasks.length === 0 && todayEvents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                <p className="text-slate-600 text-base sm:text-lg mb-6 font-medium">오늘 예약된 문자가 없습니다.</p>
                <Link
                  href="/dashboard/send"
                  className="inline-block px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm hover:shadow-md font-semibold"
                >
                  문자 보내기 시작하기 →
                </Link>
              </div>
            ) : tasks.length > 0 ? (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border border-gray-100/50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-lg text-gray-900">
                          {task.type === 'birthday' ? '생일 축하 문자' :
                           task.type === 'anniversary' ? '기념일 문자' :
                           task.type === 'callback' ? '콜백 문자' :
                           '일반 문자'}
                        </h3>
                      </div>
                      <div className="ml-11 space-y-2">
                        <p className="text-gray-700 font-medium">
                          {task.customer_name || '고객'} <span className="text-gray-500">({task.customer_phone})</span>
                        </p>
                        {task.scheduled_at && (
                          <p className="text-sm text-blue-600 font-semibold flex items-center gap-2">
                            <span>
                              {new Date(task.scheduled_at).toLocaleString('ko-KR', { 
                                month: 'long', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </p>
                        )}
                        <p className="text-gray-600 text-sm line-clamp-2 mt-2">
                          {task.message_content}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/send?taskId=${task.id}&phone=${encodeURIComponent(task.customer_phone)}&name=${encodeURIComponent(task.customer_name || '')}&message=${encodeURIComponent(task.message_content)}`}
                      className="ml-4 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-semibold whitespace-nowrap"
                    >
                      수정/발송 →
                    </Link>
                  </div>
                </div>
              ))
            ) : null}
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">빠른 액션</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/send"
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
            >
              <h3 className="font-semibold text-base mb-2 text-slate-900">문자 보내기</h3>
              <p className="text-sm text-slate-600">새로운 문자를 발송합니다</p>
            </Link>

            <Link
              href="/dashboard/customers"
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
            >
              <h3 className="font-semibold text-base mb-2 text-slate-900">고객 관리</h3>
              <p className="text-sm text-slate-600">고객 정보를 관리합니다</p>
            </Link>

            <Link
              href="/dashboard/history"
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
            >
              <h3 className="font-semibold text-base mb-2 text-slate-900">발송 기록</h3>
              <p className="text-sm text-slate-600">발송 이력을 확인합니다</p>
            </Link>

            <Link
              href="/dashboard/templates"
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
            >
              <h3 className="font-semibold text-base mb-2 text-slate-900">문자 템플릿</h3>
              <p className="text-sm text-slate-600">자주 쓰는 메시지를 저장합니다</p>
            </Link>

            <Link
              href="/dashboard/images"
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
            >
              <h3 className="font-semibold text-base mb-2 text-slate-900">이미지 관리</h3>
              <p className="text-sm text-slate-600">명함, 로고 등 이미지 저장</p>
            </Link>

            <Link
              href="/dashboard/settings"
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
            >
              <h3 className="font-semibold text-base mb-2 text-slate-900">설정</h3>
              <p className="text-sm text-slate-600">개인정보 및 명함 설정</p>
            </Link>

            <Link
              href="/dashboard/scheduled"
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
            >
              <h3 className="font-semibold text-base mb-2 text-slate-900">예약된 발송</h3>
              <p className="text-sm text-slate-600">예약된 발송을 관리합니다</p>
            </Link>

            <Link
              href="/dashboard/customers/groups"
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
            >
              <h3 className="font-semibold text-base mb-2 text-slate-900">고객 그룹</h3>
              <p className="text-sm text-slate-600">고객 그룹을 관리합니다</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
