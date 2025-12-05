'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // 로그인 상태 확인 후 대시보드로 리다이렉트
    isAuthenticated().then((authenticated) => {
      if (authenticated) {
        router.push('/dashboard')
      }
    })
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-blue-600">비즈커넥트</div>
            <div className="flex gap-4">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                시작하기
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            월 15만 원의 문자 비용을<br />
            <span className="text-blue-600">0원으로</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            영업인을 위한 가장 쉬운 AI 비서.<br />
            PC에서 입력하면 내 폰이 자동으로 발송합니다.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-lg border border-gray-200"
            >
              로그인
            </Link>
          </div>
        </div>

        {/* 주요 기능 */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">💸</div>
            <h3 className="text-xl font-bold mb-2">비용 절감</h3>
            <p className="text-gray-600">
              월 10~30만 원이 드는 문자 비용을 0원으로.<br />
              내 휴대폰 무제한 요금제를 활용하세요.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-bold mb-2">PC-Mobile 연동</h3>
            <p className="text-gray-600">
              PC 웹에서 편리하게 입력하고,<br />
              안드로이드 폰이 자동으로 발송합니다.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">AI 자동화</h3>
            <p className="text-gray-600">
              생일, 기념일 자동 감지.<br />
              통화 후 자동 콜백 문자 발송.
            </p>
          </div>
        </div>

        {/* 사용 방법 */}
        <div className="bg-white rounded-xl shadow-lg p-12 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">사용 방법</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-bold mb-2">회원가입</h3>
              <p className="text-gray-600">간단한 정보만 입력하면 바로 시작</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-bold mb-2">모바일 앱 설치</h3>
              <p className="text-gray-600">안드로이드 앱을 설치하고 권한 허용</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-bold mb-2">문자 발송</h3>
              <p className="text-gray-600">PC에서 입력하면 폰이 자동 발송</p>
            </div>
          </div>
        </div>

        {/* 가격 정보 */}
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">가격</h2>
          <div className="text-5xl font-bold text-blue-600 mb-2">월 9,900원</div>
          <p className="text-gray-600 mb-8">무제한 문자 발송 + AI 기능</p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            지금 시작하기
          </Link>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2025 비즈커넥트. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
