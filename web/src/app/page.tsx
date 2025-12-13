'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Link from 'next/link'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // OAuth 콜백 code 파라미터가 있으면 /auth/callback으로 리다이렉트
    const code = searchParams.get('code')
    if (code) {
      console.log('OAuth code detected in root, redirecting to /auth/callback')
      router.replace(`/auth/callback?code=${code}`)
      return
    }

    // 로그인 상태 확인 후 대시보드로 리다이렉트
    isAuthenticated().then((authenticated) => {
      if (authenticated) {
        router.push('/dashboard')
      }
    })
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              비즈커넥트
            </div>
            <div className="flex gap-4">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                로그인
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                시작하기
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6 animate-pulse">
            🎉 1개월 무료 체험 진행 중
          </div>
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            월 15만 원의 문자 비용을<br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              0원으로
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            영업인을 위한 가장 쉬운 AI 비서.<br />
            <span className="font-semibold text-gray-700">PC에서 입력하면 내 폰이 자동으로 발송합니다.</span>
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/auth/signup"
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
            >
              무료로 시작하기 →
            </Link>
            <Link
              href="/auth/login"
              className="px-10 py-5 bg-white text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-lg border-2 border-gray-200 hover:border-gray-300"
            >
              로그인
            </Link>
          </div>
        </div>

        {/* 주요 기능 - 개선된 디자인 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-100">
            <div className="text-5xl mb-4">📞</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">콜백 자동화</h3>
            <p className="text-gray-600 leading-relaxed">
              통화 종료 후 자동으로<br />
              <span className="font-semibold text-gray-700">명함과 함께 문자 발송</span>
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-100">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">무료 문자</h3>
            <p className="text-gray-600 leading-relaxed">
              내 휴대폰 무제한 요금제를<br />
              <span className="font-semibold text-gray-700">100% 활용</span>
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-100">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">AI 비서</h3>
            <p className="text-gray-600 leading-relaxed">
              생일·기념일 자동 감지<br />
              <span className="font-semibold text-gray-700">맞춤 메시지 생성</span>
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-100">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">고객 관리</h3>
            <p className="text-gray-600 leading-relaxed">
              통합 CRM으로<br />
              <span className="font-semibold text-gray-700">고객 정보 체계적 관리</span>
            </p>
          </div>
        </div>

        {/* 작동 방식 - 시각적 개선 */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl shadow-2xl p-12 md:p-16 mb-20 border border-gray-100">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            어떻게 작동하나요?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">회원가입</h3>
              <p className="text-gray-600 leading-relaxed">
                간단한 정보만 입력하면<br />
                <span className="font-semibold">바로 시작</span>
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">모바일 앱 설치</h3>
              <p className="text-gray-600 leading-relaxed">
                안드로이드 앱을 설치하고<br />
                <span className="font-semibold">권한 허용</span>
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">자동 발송</h3>
              <p className="text-gray-600 leading-relaxed">
                PC에서 입력하면<br />
                <span className="font-semibold">폰이 자동 발송</span>
              </p>
            </div>
          </div>
        </div>

        {/* 가격 정보 - 세부화 */}
        <div className="bg-white rounded-3xl shadow-2xl p-12 md:p-16 text-center mb-20 border-2 border-blue-100">
          <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-6">
            ✨ 1개월 무료 체험
          </div>
          <h2 className="text-4xl font-bold mb-6 text-gray-900">가격</h2>
          <div className="mb-4">
            <span className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              월 9,900원
            </span>
          </div>
          <p className="text-xl text-gray-600 mb-8">
            무제한 문자 발송 + AI 기능 + 콜백 자동화
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-8 text-left max-w-2xl mx-auto">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">✓ 무제한 문자</div>
              <div className="text-sm text-gray-600">내 휴대폰 요금제 활용</div>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">✓ AI 자동화</div>
              <div className="text-sm text-gray-600">생일·기념일 자동 감지</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">✓ 콜백 자동화</div>
              <div className="text-sm text-gray-600">통화 후 자동 문자</div>
            </div>
          </div>
          <Link
            href="/auth/signup"
            className="inline-block px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
          >
            지금 시작하기 →
          </Link>
        </div>
      </main>

      {/* 푸터 - 회사 정보 추가 */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                비즈커넥트
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                영업인을 위한 가장 쉬운 AI 비서.<br />
                PC에서 입력하면 내 폰이 자동으로 발송합니다.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">회사 정보</h3>
              <div className="text-gray-400 text-sm space-y-2">
                <p><span className="font-semibold text-gray-300">회사명:</span> 다인</p>
                <p><span className="font-semibold text-gray-300">사업자번호:</span> 202-18-18299</p>
                <p><span className="font-semibold text-gray-300">대표:</span> 조수민</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">빠른 링크</h3>
              <div className="space-y-2">
                <Link href="/auth/login" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  로그인
                </Link>
                <Link href="/auth/signup" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  회원가입
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 다인. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
