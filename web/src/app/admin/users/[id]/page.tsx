'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'

interface UserDetail {
  id: string
  email: string
  created_at: string
  customer_count: number
  sms_count: number
  total_sms_sent: number
  total_sms_failed: number
  subscription?: {
    plan_type: string
    status: string
    start_date: string
    end_date: string | null
    billing_amount: number
  }
}

interface RecentSMS {
  id: string
  phone_number: string
  message: string
  status: string
  sent_at: string
}

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [loading, setLoading] = useState(true)
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [recentSMS, setRecentSMS] = useState<RecentSMS[]>([])
  const [showTrialForm, setShowTrialForm] = useState(false)

  useEffect(() => {
    if (userId) {
      loadUserDetail()
      loadRecentSMS()
    }
  }, [userId])

  const loadUserDetail = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // API 엔드포인트를 통해 사용자 상세 정보 로드 (auth.users에서 실제 이메일 가져오기)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id, // 사용자 ID를 헤더로 전달
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error loading user detail:', errorData)
        if (response.status === 401 || response.status === 403) {
          router.push('/auth/login')
          return
        }
        if (response.status === 404) {
          // 사용자를 찾을 수 없음
          setUserDetail(null)
          setLoading(false)
          return
        }
        throw new Error(errorData.error || '사용자 정보를 불러오는데 실패했습니다.')
      }

      const data = await response.json()
      setUserDetail(data.user)
    } catch (error) {
      console.error('Error loading user detail:', error)
      setUserDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentSMS = async () => {
    try {
      // 현재 사용자 정보 가져오기
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // API를 통해 최근 SMS 로드
      const response = await fetch(`/api/admin/users/${userId}/sms`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id, // 사용자 ID를 헤더로 전달
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRecentSMS(data.sms || [])
      } else {
        console.error('Error loading recent SMS:', response.statusText)
        setRecentSMS([])
      }
    } catch (error) {
      console.error('Error loading recent SMS:', error)
      setRecentSMS([])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!userDetail) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">사용자를 찾을 수 없습니다.</p>
        <Link
          href="/admin/users"
          className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
        >
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/users"
            className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
          >
            ← 목록으로
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">사용자 상세 정보</h1>
        </div>
      </div>

      {/* 사용자 정보 카드 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">이메일</label>
            <p className="text-gray-900 font-medium">{userDetail.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">사용자 ID</label>
            <p className="text-gray-900 font-mono text-sm">{userDetail.id}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">가입일</label>
            <p className="text-gray-900">
              {new Date(userDetail.created_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">고객 수</label>
            <p className="text-gray-900 font-medium">
              {userDetail.customer_count.toLocaleString()}명
            </p>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">총 SMS 발송</div>
          <div className="text-3xl font-bold text-blue-600">
            {userDetail.total_sms_sent.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">실패한 SMS</div>
          <div className="text-3xl font-bold text-red-600">
            {userDetail.total_sms_failed.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">성공률</div>
          <div className="text-3xl font-bold text-green-600">
            {userDetail.total_sms_sent > 0
              ? (
                  ((userDetail.total_sms_sent - userDetail.total_sms_failed) /
                    userDetail.total_sms_sent) *
                  100
                ).toFixed(1)
              : 0}
            %
          </div>
        </div>
      </div>

      {/* 구독 정보 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">구독 정보</h2>
          {userDetail.subscription && (
            <button
              onClick={() => setShowTrialForm(!showTrialForm)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              무료 기간 설정
            </button>
          )}
        </div>
        
        {userDetail.subscription ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">플랜</label>
              <p className="text-gray-900 font-medium">
                {userDetail.subscription.plan_type}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">상태</label>
              <p className="text-gray-900">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    userDetail.subscription.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {userDetail.subscription.status}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">시작일</label>
              <p className="text-gray-900">
                {new Date(userDetail.subscription.start_date).toLocaleDateString(
                  'ko-KR'
                )}
              </p>
            </div>
            {userDetail.subscription.end_date && (
              <div>
                <label className="text-sm text-gray-500">종료일</label>
                <p className="text-gray-900">
                  {new Date(
                    userDetail.subscription.end_date
                  ).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-500">결제 금액</label>
              <p className="text-gray-900 font-medium">
                {userDetail.subscription.billing_amount.toLocaleString()}원
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">구독 정보가 없습니다.</p>
            <button
              onClick={() => setShowTrialForm(!showTrialForm)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              무료 기간 설정
            </button>
          </div>
        )}

        {/* 무료 기간 설정 폼 */}
        {showTrialForm && (
          <TrialPeriodForm
            userId={userId}
            currentSubscription={userDetail.subscription}
            onSuccess={() => {
              setShowTrialForm(false)
              loadUserDetail()
            }}
            onCancel={() => setShowTrialForm(false)}
          />
        )}
      </div>

      {/* 최근 SMS 발송 내역 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">최근 SMS 발송 내역</h2>
        </div>
        <div className="p-6">
          {recentSMS.length === 0 ? (
            <p className="text-gray-500 text-center py-4">발송 내역이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {recentSMS.map((sms) => (
                <div
                  key={sms.id}
                  className="flex justify-between items-start py-3 border-b last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{sms.phone_number}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {sms.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(sms.sent_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ml-4 ${
                      sms.status === 'sent'
                        ? 'bg-green-100 text-green-800'
                        : sms.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {sms.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 무료 기간 설정 폼 컴포넌트
function TrialPeriodForm({
  userId,
  currentSubscription,
  onSuccess,
  onCancel,
}: {
  userId: string
  currentSubscription?: UserDetail['subscription']
  onSuccess: () => void
  onCancel: () => void
}) {
  const [trialStartDate, setTrialStartDate] = useState('2026-01-01')
  const [trialEndDate, setTrialEndDate] = useState('2026-01-31')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/admin/set-trial-period', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          start_date: trialStartDate,
          end_date: trialEndDate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '무료 기간 설정에 실패했습니다.')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">무료 사용 기간 설정</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시작일
            </label>
            <input
              type="date"
              value={trialStartDate}
              onChange={(e) => setTrialStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종료일
            </label>
            <input
              type="date"
              value={trialEndDate}
              onChange={(e) => setTrialEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}


