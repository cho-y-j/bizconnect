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

      // 고객 수
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // 대기 중인 작업 수
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending', 'queued'])

      // 오늘 발송된 문자 수
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: sentCount } = await supabase
        .from('sms_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'sent')
        .gte('sent_at', today.toISOString())

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-blue-600">비즈커넥트</div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-700 hover:text-red-600 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드 */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">총 고객 수</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">대기 중인 작업</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingTasks}</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">오늘 발송</p>
                <p className="text-3xl font-bold text-blue-600">{stats.todaySent}</p>
              </div>
              <div className="text-4xl">📤</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">그룹 수</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalGroups}</p>
              </div>
              <div className="text-4xl">🏷️</div>
            </div>
          </div>
        </div>

        {/* 오늘의 이벤트 (생일/기념일) */}
        {todayEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🎉 오늘의 특별한 날</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {todayEvents.map((event) => (
                <div
                  key={`${event.type}-${event.id}`}
                  className={`bg-gradient-to-r ${
                    event.type === 'birthday'
                      ? 'from-pink-500 to-rose-500'
                      : 'from-purple-500 to-indigo-500'
                  } rounded-xl shadow-lg p-6 text-white`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium opacity-90 mb-1">
                        {event.type === 'birthday' ? '🎂 생일' : '💝 기념일'}
                      </div>
                      <h3 className="text-xl font-bold mb-1">{event.customer_name}님</h3>
                      <p className="text-sm opacity-90">
                        {event.type === 'birthday'
                          ? `${event.age}세 생일을 축하합니다!`
                          : `${event.years}주년 기념일입니다!`}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/send?customerId=${event.id}`}
                      className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors text-sm font-semibold"
                    >
                      축하 문자 보내기
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">오늘의 할 일</h1>
          <p className="text-gray-600">
            {tasks.length > 0 || todayEvents.length > 0
              ? `오늘 예약된 문자 ${tasks.length}개${todayEvents.length > 0 ? `와 오늘 생일/기념일 ${todayEvents.length}개` : ''}가 있습니다.`
              : todayEvents.length > 0
              ? `오늘 생일/기념일 ${todayEvents.length}개가 있습니다.`
              : '오늘 예약된 문자가 없습니다.'}
          </p>
        </div>

        {/* 작업 카드들 */}
        <div className="space-y-4 mb-8">
          {tasks.length === 0 && todayEvents.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <p className="text-gray-500 mb-4">오늘 예약된 문자가 없습니다.</p>
              <Link
                href="/dashboard/send"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                문자 보내기
              </Link>
            </div>
          ) : tasks.length > 0 ? (
            tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 mb-1">
                      {task.type === 'birthday' ? '🎂 생일 축하 문자' :
                       task.type === 'anniversary' ? '💝 기념일 문자' :
                       task.type === 'callback' ? '📞 콜백 문자' :
                       '📱 일반 문자'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {task.customer_name || '고객'} ({task.customer_phone})
                    </p>
                    {task.scheduled_at && (
                      <p className="text-sm text-blue-600 mt-1 font-medium">
                        📅 {new Date(task.scheduled_at).toLocaleString('ko-KR', { 
                          month: 'long', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {task.message_content}
                </p>
                <Link
                  href={`/dashboard/send?taskId=${task.id}&phone=${encodeURIComponent(task.customer_phone)}&name=${encodeURIComponent(task.customer_name || '')}&message=${encodeURIComponent(task.message_content)}`}
                  className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  수정하거나 지금 보내기
                </Link>
              </div>
            ))
          )}
        </div>

        {/* 빠른 액션 */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/send"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="text-4xl mb-2">📤</div>
            <h3 className="font-bold mb-1">문자 보내기</h3>
            <p className="text-sm text-gray-600">새로운 문자를 발송합니다</p>
          </Link>

          <Link
            href="/dashboard/customers"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="text-4xl mb-2">👥</div>
            <h3 className="font-bold mb-1">고객 관리</h3>
            <p className="text-sm text-gray-600">고객 정보를 관리합니다</p>
          </Link>

          <Link
            href="/dashboard/history"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="text-4xl mb-2">📋</div>
            <h3 className="font-bold mb-1">발송 기록</h3>
            <p className="text-sm text-gray-600">발송 이력을 확인합니다</p>
          </Link>

          <Link
            href="/dashboard/templates"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="text-4xl mb-2">📝</div>
            <h3 className="font-bold mb-1">문자 템플릿</h3>
            <p className="text-sm text-gray-600">자주 쓰는 메시지를 저장합니다</p>
          </Link>

          <Link
            href="/dashboard/images"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="text-4xl mb-2">📷</div>
            <h3 className="font-bold mb-1">이미지 관리</h3>
            <p className="text-sm text-gray-600">명함, 로고 등 이미지 저장</p>
          </Link>

          <Link
            href="/dashboard/settings"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="text-4xl mb-2">⚙️</div>
            <h3 className="font-bold mb-1">설정</h3>
            <p className="text-sm text-gray-600">개인정보 및 명함 설정</p>
          </Link>

          <Link
            href="/dashboard/scheduled"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="text-4xl mb-2">📅</div>
            <h3 className="font-bold mb-1">예약된 발송</h3>
            <p className="text-sm text-gray-600">예약된 발송을 관리합니다</p>
          </Link>
        </div>
      </main>
    </div>
  )
}

