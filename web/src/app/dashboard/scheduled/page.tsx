'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'

interface ScheduledTask {
  id: string
  type: string
  customer_name: string | null
  customer_phone: string
  message_content: string
  status: string
  scheduled_at: string
  created_at: string
}

export default function ScheduledPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuth()
    loadScheduledTasks()
  }, [])

  const checkAuth = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/auth/login')
    }
  }

  const loadScheduledTasks = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date().toISOString()

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .not('scheduled_at', 'is', null)
        .gte('scheduled_at', now)
        .in('status', ['pending', 'queued'])
        .order('scheduled_at', { ascending: true })

      if (fetchError) {
        throw fetchError
      }
      setTasks(data || [])
    } catch (err: any) {
      console.error('Error loading scheduled tasks:', err)
      setError(err.message || '예약된 발송을 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (taskId: string) => {
    if (!confirm('예약된 발송을 취소하시겠습니까?')) return

    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (deleteError) {
        throw deleteError
      }
      loadScheduledTasks()
    } catch (err: any) {
      console.error('Error canceling task:', err)
      alert('예약 취소 중 오류가 발생했습니다: ' + err.message)
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

  const getTimeUntil = (scheduledAt: string) => {
    const now = new Date()
    const scheduled = new Date(scheduledAt)
    const diff = scheduled.getTime() - now.getTime()
    
    if (diff < 0) return '지난 시간'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) return `${days}일 ${hours}시간 후`
    if (hours > 0) return `${hours}시간 ${minutes}분 후`
    return `${minutes}분 후`
  }

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
              <h1 className="text-xl font-semibold text-gray-900">예약된 발송</h1>
            </div>
            <Link
              href="/dashboard/send"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 새 발송 예약
            </Link>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">예약된 발송을 불러오는 중...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500 mb-4">예약된 발송이 없습니다.</p>
            <Link
              href="/dashboard/send"
              className="mt-4 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 새 발송 예약
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800 mb-1">
                      {task.type === 'birthday' ? '생일 축하 문자' :
                       task.type === 'anniversary' ? '기념일 문자' :
                       task.type === 'callback' ? '콜백 문자' :
                       '일반 문자'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {task.customer_name || '고객'} ({formatPhone(task.customer_phone)})
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-blue-600">
                        <span>📅</span>
                        <span className="font-semibold">{formatDateTime(task.scheduled_at)}</span>
                      </div>
                      <span className="text-gray-500">
                        ({getTimeUntil(task.scheduled_at)})
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    task.status === 'queued' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status === 'pending' ? '대기 중' :
                     task.status === 'queued' ? '발송 대기' :
                     task.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {task.message_content}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCancel(task.id)}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    예약 취소
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

