'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import { useMessageTemplates } from '@/lib/hooks/useMessageTemplates'

interface AIMessageSuggestionsProps {
  customerId?: string
  customerPhone?: string
  customerName?: string
  onSelect: (message: string) => void
  onClose: () => void
  onIntentSelect?: (intent: string) => void // 의도 선택 시 콜백
}

// 기본 의도 샘플
const INTENT_SAMPLES = [
  '기존 대화를 확인하고 온화한 말투로 고객 안부를 물어주는 문자',
  '고객과의 관계를 유지하며 간단한 인사 문자',
  '새로운 상품이나 서비스를 소개하는 영업 문자',
  '약속이나 미팅 일정을 확인하는 문자',
  '고객의 문의나 불만에 대한 답변 문자',
  '명절이나 기념일 인사 문자',
  '고객의 구매 결정을 돕는 추진 문자',
]

export default function AIMessageSuggestions({
  customerId,
  customerPhone,
  customerName,
  onSelect,
  onClose,
  onIntentSelect,
}: AIMessageSuggestionsProps) {
  const { addTemplate } = useMessageTemplates()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentSuggestion, setCurrentSuggestion] = useState<string | null>(null)
  const [currentVersion, setCurrentVersion] = useState<'formal' | 'friendly' | 'concise' | null>(null)
  const [allSuggestions, setAllSuggestions] = useState<{
    formal: string
    friendly: string
    concise: string
  } | null>(null)
  const [customIntent, setCustomIntent] = useState('')
  const [selectedIntentSample, setSelectedIntentSample] = useState<string | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)

  const handleGetSuggestions = async (intent?: string) => {
    if (!customerId && !customerPhone) {
      setError('고객 정보가 필요합니다.')
      return
    }

    const finalIntent = intent || customIntent || selectedIntentSample || '안부 인사 및 관계 유지'

    setLoading(true)
    setError('')
    setCurrentSuggestion(null)
    setCurrentVersion(null)

    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('로그인이 필요합니다.')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('세션이 만료되었습니다.')
        return
      }

      const response = await fetch('/api/ai/suggest-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customerId: customerId || null,
          customerPhone: customerPhone?.replace(/\D/g, '') || null,
          customerName: customerName || null,
          intent: finalIntent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'AI 추천을 받을 수 없습니다.')
      }

      const data = await response.json()
      setAllSuggestions(data.suggestions)
      // 첫 번째 추천 (정중한 버전)을 기본으로 표시
      setCurrentSuggestion(data.suggestions.formal)
      setCurrentVersion('formal')
    } catch (err: any) {
      console.error('AI 추천 오류:', err)
      setError(err.message || 'AI 추천을 받는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (message: string) => {
    onSelect(message)
    onClose()
  }

  const handleSaveAsTemplate = async () => {
    if (!currentSuggestion) return

    setSavingTemplate(true)
    setError('')

    try {
      const templateName = `${customerName || '고객'} ${currentVersion === 'formal' ? '정중' : currentVersion === 'friendly' ? '친근' : '간결'} 버전`
      
      const result = await addTemplate({
        name: templateName,
        content: currentSuggestion,
        category: 'general',
        is_favorite: false,
      })

      if (result) {
        alert('템플릿으로 저장되었습니다!')
      } else {
        setError('템플릿 저장에 실패했습니다.')
      }
    } catch (err: any) {
      console.error('템플릿 저장 오류:', err)
      setError(err.message || '템플릿 저장 중 오류가 발생했습니다.')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleGetAnotherVersion = () => {
    if (!allSuggestions) return

    // 다음 버전으로 순환
    if (currentVersion === 'formal') {
      setCurrentSuggestion(allSuggestions.friendly)
      setCurrentVersion('friendly')
    } else if (currentVersion === 'friendly') {
      setCurrentSuggestion(allSuggestions.concise)
      setCurrentVersion('concise')
    } else {
      setCurrentSuggestion(allSuggestions.formal)
      setCurrentVersion('formal')
    }
  }

  const handleGetAnotherAnswer = () => {
    // 다른 답변 요청 (같은 의도로 다시 생성)
    const finalIntent = customIntent || selectedIntentSample || '안부 인사 및 관계 유지'
    handleGetSuggestions(finalIntent)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto border-2 border-gray-200">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">✨ AI 메시지 추천</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 의도 입력 섹션 */}
          {!currentSuggestion && !loading && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  요청 의도 (선택사항)
                </label>
                <textarea
                  value={customIntent}
                  onChange={(e) => setCustomIntent(e.target.value)}
                  placeholder="예: 기존 대화를 확인하고 온화한 말투로 고객 안부를 물어주는 문자"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  또는 샘플 선택
                </label>
                <div className="space-y-2">
                  {INTENT_SAMPLES.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedIntentSample(sample)
                        setCustomIntent(sample)
                        // 의도 선택 시 부모 컴포넌트에 전달 (텍스트 입력 필드에 자동 입력)
                        if (onIntentSelect) {
                          onIntentSelect(sample)
                        }
                      }}
                      className={`w-full text-left px-4 py-2 border rounded-lg transition-colors ${
                        selectedIntentSample === sample
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleGetSuggestions()}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                ✨ AI 추천 받기
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">AI가 메시지를 생성하는 중...</p>
            </div>
          )}

          {currentSuggestion && (
            <div className="space-y-4">
              {/* 현재 버전 표시 */}
              <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {currentVersion === 'formal' ? '정중한 버전' : currentVersion === 'friendly' ? '친근한 버전' : '간결한 버전'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedIntentSample || customIntent || '안부 인사 및 관계 유지'}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap mb-4">{currentSuggestion}</p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelect(currentSuggestion)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    적용하기
                  </button>
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={savingTemplate}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {savingTemplate ? '저장 중...' : '템플릿 저장'}
                  </button>
                </div>
              </div>

              {/* 다른 버전 보기 / 다른 답변 받기 */}
              <div className="flex gap-2">
                <button
                  onClick={handleGetAnotherVersion}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  다른 버전 보기 ({currentVersion === 'formal' ? '친근한' : currentVersion === 'friendly' ? '간결한' : '정중한'} 버전)
                </button>
                <button
                  onClick={handleGetAnotherAnswer}
                  className="flex-1 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  다른 답변 받기
                </button>
              </div>

              {/* 의도 변경 */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setCurrentSuggestion(null)
                    setAllSuggestions(null)
                    setCurrentVersion(null)
                  }}
                  className="w-full px-4 py-2 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  다른 의도로 다시 요청하기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
