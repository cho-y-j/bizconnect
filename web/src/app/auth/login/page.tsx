'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmail, signInWithGoogle } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await signInWithEmail(email, password)
    
    if (error) {
      console.error('Login error:', error)
      
      // 특정 에러 메시지 처리
      let errorMessage = error.message || '로그인에 실패했습니다.'
      if (error.message?.includes('Email not confirmed')) {
        errorMessage = '이메일을 확인해주세요. 회원가입 시 발송된 이메일의 링크를 클릭하세요.'
      } else if (error.message?.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
      } else if (error.message?.includes('Email rate limit exceeded')) {
        errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
      }
      
      setError(errorMessage)
      setLoading(false)
    } else if (data?.session) {
      // 로그인 성공 - 세션이 있음
      console.log('[Login Page] Login successful, session:', data.session.user.id)
      
      // 세션이 저장될 때까지 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 세션 재확인
      const { data: { session: verifySession } } = await supabase.auth.getSession()
      console.log('[Login Page] Session verification:', {
        original: !!data.session,
        verified: !!verifySession,
        userId: verifySession?.user?.id
      })
      
      // 관리자 권한 확인
      const { isAdmin } = await import('@/lib/admin')
      const admin = await isAdmin()
      console.log('[Login Page] Admin check:', admin)
      
      if (admin) {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } else {
      // 세션이 없는 경우 (이메일 확인 필요 등)
      console.warn('[Login Page] Login successful but no session')
      router.push('/dashboard')
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    const { error } = await signInWithGoogle()
    
    if (error) {
      setError(error.message || '구글 로그인에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">비즈커넥트</h1>
          <p className="text-gray-600">로그인하여 시작하세요</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">또는</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          구글로 로그인
        </button>

        <div className="mt-6 text-center">
          <Link
            href="/auth/signup"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            계정이 없으신가요? 회원가입
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            비밀번호를 잊으셨나요?
          </Link>
        </div>
      </div>
    </div>
  )
}

