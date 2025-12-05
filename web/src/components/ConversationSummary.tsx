'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'

interface ConversationSummary {
  id: string
  summary: string
  key_points: string[]
  promises: string[]
  next_actions: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  conversation_count: number
  updated_at: string
}

interface ConversationSummaryProps {
  customerId: string
  customerPhone: string
  customerName: string
  onSummaryUpdate?: () => void
}

export default function ConversationSummary({
  customerId,
  customerPhone,
  customerName,
  onSummaryUpdate,
}: ConversationSummaryProps) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedSummary, setEditedSummary] = useState({
    summary: '',
    key_points: [] as string[],
    promises: [] as string[],
    next_actions: [] as string[],
  })
  const [error, setError] = useState('')

  useEffect(() => {
    loadSummary()
  }, [customerId])

  const loadSummary = async () => {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      if (!user) return

      const { data, error: fetchError } = await supabase
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('customer_id', customerId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116은 "no rows returned" 에러 (정상)
        console.error('Error loading summary:', fetchError)
      } else if (data) {
        setSummary(data)
        setEditedSummary({
          summary: data.summary,
          key_points: data.key_points || [],
          promises: data.promises || [],
          next_actions: data.next_actions || [],
        })
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSummarize = async () => {
    setSummarizing(true)
    setError('')

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

      const response = await fetch('/api/ai/summarize-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customerId,
          customerPhone: customerPhone.replace(/\D/g, ''),
          saveToMemo: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '요약을 생성할 수 없습니다.')
      }

      const data = await response.json()
      
      // 요약 데이터 저장
      const summaryData = {
        user_id: user.id,
        customer_id: customerId,
        customer_phone: customerPhone.replace(/\D/g, ''),
        summary: data.summary.summary,
        key_points: data.summary.keyPoints || [],
        promises: data.summary.promises || [],
        next_actions: data.summary.nextActions || [],
        sentiment: data.summary.sentiment || 'neutral',
        conversation_count: data.summary.conversationCount || 0,
        updated_at: new Date().toISOString(),
      }

      const { data: existingSummary } = await supabase
        .from('conversation_summaries')
        .select('id')
        .eq('user_id', user.id)
        .eq('customer_id', customerId)
        .single()

      if (existingSummary) {
        const { data: updated } = await supabase
          .from('conversation_summaries')
          .update(summaryData)
          .eq('id', existingSummary.id)
          .select()
          .single()

        if (updated) {
          setSummary(updated)
          setEditedSummary({
            summary: updated.summary,
            key_points: updated.key_points || [],
            promises: updated.promises || [],
            next_actions: updated.next_actions || [],
          })
        }
      } else {
        const { data: newSummary } = await supabase
          .from('conversation_summaries')
          .insert(summaryData)
          .select()
          .single()

        if (newSummary) {
          setSummary(newSummary)
          setEditedSummary({
            summary: newSummary.summary,
            key_points: newSummary.key_points || [],
            promises: newSummary.promises || [],
            next_actions: newSummary.next_actions || [],
          })
        }
      }

      if (onSummaryUpdate) {
        onSummaryUpdate()
      }
    } catch (err: any) {
      console.error('요약 생성 오류:', err)
      setError(err.message || '요약을 생성하는 중 오류가 발생했습니다.')
    } finally {
      setSummarizing(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!summary) return

    try {
      const user = await getCurrentUser()
      if (!user) return

      const { data: updated, error: updateError } = await supabase
        .from('conversation_summaries')
        .update({
          summary: editedSummary.summary,
          key_points: editedSummary.key_points,
          promises: editedSummary.promises,
          next_actions: editedSummary.next_actions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', summary.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      if (updated) {
        setSummary(updated)
        setEditing(false)
        if (onSummaryUpdate) {
          onSummaryUpdate()
        }
      }
    } catch (err: any) {
      console.error('저장 오류:', err)
      setError(err.message || '저장 중 오류가 발생했습니다.')
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800'
      case 'negative':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '긍정적'
      case 'negative':
        return '부정적'
      default:
        return '중립적'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">대화 요약</h3>
        <div className="flex gap-2">
          {summary && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              수정
            </button>
          )}
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {summarizing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                요약 중...
              </>
            ) : summary ? (
              '🔄 다시 요약'
            ) : (
              '✨ AI 요약하기'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {!summary && !summarizing && (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">아직 요약이 없습니다.</p>
          <p className="text-sm">AI가 대화 이력을 분석하여 요약해드립니다.</p>
        </div>
      )}

      {summary && (
        <div className="space-y-4">
          {editing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  요약 내용
                </label>
                <textarea
                  value={editedSummary.summary}
                  onChange={(e) => setEditedSummary(prev => ({ ...prev, summary: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  주요 포인트 (줄바꿈으로 구분)
                </label>
                <textarea
                  value={editedSummary.key_points.join('\n')}
                  onChange={(e) => setEditedSummary(prev => ({
                    ...prev,
                    key_points: e.target.value.split('\n').filter(p => p.trim()),
                  }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="주요 포인트 1&#10;주요 포인트 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  약속된 사항 (줄바꿈으로 구분)
                </label>
                <textarea
                  value={editedSummary.promises.join('\n')}
                  onChange={(e) => setEditedSummary(prev => ({
                    ...prev,
                    promises: e.target.value.split('\n').filter(p => p.trim()),
                  }))}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="약속 1&#10;약속 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  다음 액션 (줄바꿈으로 구분)
                </label>
                <textarea
                  value={editedSummary.next_actions.join('\n')}
                  onChange={(e) => setEditedSummary(prev => ({
                    ...prev,
                    next_actions: e.target.value.split('\n').filter(p => p.trim()),
                  }))}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="액션 1&#10;액션 2"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setEditedSummary({
                      summary: summary.summary,
                      key_points: summary.key_points || [],
                      promises: summary.promises || [],
                      next_actions: summary.next_actions || [],
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(summary.sentiment)}`}>
                  {getSentimentLabel(summary.sentiment)}
                </span>
                <span className="text-xs text-gray-500">
                  {summary.conversation_count}개 대화 분석 · {new Date(summary.updated_at).toLocaleDateString('ko-KR')}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">요약</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{summary.summary}</p>
              </div>

              {summary.key_points && summary.key_points.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">주요 포인트</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {summary.key_points.map((point, i) => (
                      <li key={i} className="text-sm text-gray-600">{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.promises && summary.promises.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">약속된 사항</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {summary.promises.map((promise, i) => (
                      <li key={i} className="text-sm text-gray-600">{promise}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.next_actions && summary.next_actions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">다음 액션</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {summary.next_actions.map((action, i) => (
                      <li key={i} className="text-sm text-gray-600">{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

