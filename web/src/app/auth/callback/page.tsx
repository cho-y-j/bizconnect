'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URL에서 에러 파라미터 확인
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription)
          setError(errorDescription || errorParam)
          setTimeout(() => {
            router.push('/auth/login?error=' + encodeURIComponent(errorDescription || errorParam))
          }, 3000)
          return
        }

        // PKCE 플로우: detectSessionInUrl이 true이면 Supabase가 자동으로 URL의 code를 처리
        // 잠시 대기 후 세션 확인 (Supabase가 URL에서 code를 처리할 시간 필요)
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
          setTimeout(() => {
            router.push('/auth/login?error=' + encodeURIComponent(sessionError.message))
          }, 3000)
          return
        }

        if (data.session) {
          // 로그인 성공 - 대시보드로 이동
          console.log('Login successful, redirecting to dashboard')
          router.push('/dashboard')
        } else {
          // 세션이 없으면 로그인 페이지로
          console.warn('No session found after OAuth callback')
          setError('세션을 찾을 수 없습니다.')
          setTimeout(() => {
            router.push('/auth/login?error=no_session')
          }, 3000)
        }
      } catch (err: any) {
        console.error('Callback error:', err)
        setError(err.message || '알 수 없는 오류가 발생했습니다.')
        setTimeout(() => {
          router.push('/auth/login?error=' + encodeURIComponent(err.message || 'unknown_error'))
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        {error ? (
          <>
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인 실패</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">잠시 후 로그인 페이지로 이동합니다...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로그인 처리 중...</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}

