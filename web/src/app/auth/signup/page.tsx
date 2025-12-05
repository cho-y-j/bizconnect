'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUpWithEmail, signInWithGoogle } from '@/lib/auth'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    // 비밀번호 길이 확인
    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    const { data, error } = await signUpWithEmail(email, password, name)
    
    if (error) {
      console.error('Signup error:', error)
      
      // 특정 에러 메시지 처리
      let errorMessage = error.message || '회원가입에 실패했습니다.'
      if (error.message?.includes('Email signups are disabled')) {
        errorMessage = '이메일 회원가입이 비활성화되어 있습니다. 관리자에게 문의하세요.'
      } else if (error.message?.includes('User already registered')) {
        errorMessage = '이미 등록된 이메일입니다. 로그인을 시도해주세요.'
      } else if (error.message?.includes('Email address') && error.message?.includes('is invalid')) {
        errorMessage = '이메일 주소 형식이 올바르지 않거나 허용되지 않는 도메인입니다. 실제 이메일 주소를 사용해주세요.'
      }
      
      setError(errorMessage)
      setLoading(false)
    } else {
      // 회원가입 성공
      // 이메일 확인이 필요한 경우와 아닌 경우 처리
      if (data?.user && !data.session) {
        // 이메일 확인이 필요한 경우
        setError('회원가입이 완료되었습니다. 이메일을 확인해주세요.')
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      } else if (data?.session) {
        // 즉시 로그인된 경우
        router.push('/dashboard')
      } else {
        // 기타 경우
        router.push('/auth/login')
      }
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
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
          <p className="text-gray-600">무료로 시작하세요</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="space-y-4 mb-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              이름 (선택)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="홍길동"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일 *
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
              비밀번호 *
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="최소 8자 이상"
            />
            <p className="mt-1 text-xs text-gray-500">최소 8자 이상 입력해주세요</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인 *
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '가입 중...' : '회원가입'}
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
          onClick={handleGoogleSignup}
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
          구글로 시작하기
        </button>

        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            이미 계정이 있으신가요? 로그인
          </Link>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          회원가입 시{' '}
          <Link href="/terms" className="text-blue-600 hover:text-blue-700">
            이용약관
          </Link>
          과{' '}
          <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
            개인정보 처리방침
          </Link>
          에 동의하게 됩니다.
        </div>
      </div>
    </div>
  )
}

