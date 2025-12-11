import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 가져오기 (필수)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

/**
 * AI 대화 내용 요약 API
 * POST /api/ai/summarize-conversation
 */
export async function POST(request: NextRequest) {
  try {
    // 환경 변수 필수 체크
    if (!DEEPSEEK_API_KEY) {
      console.error('❌ DEEPSEEK_API_KEY 환경 변수가 설정되지 않았습니다!')
      return NextResponse.json(
        { error: 'AI 서비스가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { customerId, customerPhone, saveToMemo = false } = body

    // 사용자 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseServer = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }

    // 기존 요약 확인 (최근 7일 이내)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: existingSummary } = await supabaseServer
      .from('conversation_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('customer_id', customerId)
      .gte('updated_at', sevenDaysAgo.toISOString())
      .single()

    // 최근 요약이 있고 대화 이력이 크게 변하지 않았다면 재사용 (토큰 절약)
    if (existingSummary) {
      const { data: recentLogs } = await supabaseServer
        .from('sms_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('phone_number', customerPhone.replace(/\D/g, ''))
        .gt('sent_at', existingSummary.updated_at)
        .limit(1)

      // 새로운 대화가 없으면 기존 요약 반환
      if (!recentLogs || recentLogs.length === 0) {
        console.log('✅ 기존 요약 재사용 (토큰 절약)')
        return NextResponse.json({
          summary: existingSummary,
          cached: true,
        })
      }
    }

    // 고객 정보 조회
    const { data: customer } = await supabaseServer
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('user_id', user.id)
      .single()

    if (!customer) {
      return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 최근 발송 내역 조회 (최대 10개)
    const { data: recentLogs } = await supabaseServer
      .from('sms_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('phone_number', customer.phone.replace(/\D/g, ''))
      .order('sent_at', { ascending: false })
      .limit(10)

    // 대화 이력 구성
    const conversationHistory = (recentLogs || [])
      .reverse() // 시간순 정렬
      .map(log => ({
        date: new Date(log.sent_at).toLocaleDateString('ko-KR'),
        time: new Date(log.sent_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        sender: 'me' as const,
        message: log.message,
        status: log.status,
      }))

    if (conversationHistory.length === 0) {
      return NextResponse.json({ error: '분석할 대화 이력이 없습니다.' }, { status: 400 })
    }

    // 프롬프트 구성
    const systemPrompt = `너는 비즈니스 대화 분석 전문가야. 고객과의 과거 대화 이력을 분석해서 
요약, 주요 포인트, 약속, 다음 액션을 정리해줘.

응답은 반드시 다음 JSON 형식으로 해줘:
{
  "summary": "전체 대화 요약 (2-3문장)",
  "keyPoints": ["주요 포인트 1", "주요 포인트 2", "주요 포인트 3"],
  "promises": ["약속 1", "약속 2"],
  "nextActions": ["다음 액션 1", "다음 액션 2"],
  "sentiment": "positive" 또는 "neutral" 또는 "negative"
}`

    const userPrompt = `[고객 정보]
- 이름: ${customer.name}
${customer.industry_type ? `- 업종: ${customer.industry_type}` : ''}

[대화 이력] (최근 ${conversationHistory.length}개)
${conversationHistory.map((h, i) => 
  `${i + 1}. (${h.date} ${h.time}) 나 → 고객: "${h.message}"`
).join('\n')}

위 대화 이력을 분석해서 요약해줘.`

    // DeepSeek API 호출
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('DeepSeek API 오류:', error)
      return NextResponse.json(
        { error: 'AI 서비스 오류가 발생했습니다.' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'AI 응답을 받을 수 없습니다.' },
        { status: 500 }
      )
    }

    // JSON 파싱
    let summary
    try {
      summary = JSON.parse(content)
    } catch (e) {
      console.error('JSON 파싱 실패:', content)
      return NextResponse.json(
        { error: 'AI 응답 형식이 올바르지 않습니다.' },
        { status: 500 }
      )
    }

    // 요약 메모 저장
    if (saveToMemo) {
      const summaryData = {
        user_id: user.id,
        customer_id: customerId,
        customer_phone: customer.phone.replace(/\D/g, ''),
        summary: summary.summary,
        key_points: summary.keyPoints || [],
        promises: summary.promises || [],
        next_actions: summary.nextActions || [],
        sentiment: summary.sentiment || 'neutral',
        conversation_count: conversationHistory.length,
        updated_at: new Date().toISOString(),
      }

      if (existingSummary) {
        // 업데이트
        await supabaseServer
          .from('conversation_summaries')
          .update(summaryData)
          .eq('id', existingSummary.id)
      } else {
        // 새로 생성
        await supabaseServer
          .from('conversation_summaries')
          .insert(summaryData)
      }
    }

    return NextResponse.json({
      summary: {
        ...summary,
        conversationCount: conversationHistory.length,
      },
      cached: false,
      saved: saveToMemo,
    })
  } catch (error: any) {
    console.error('AI 요약 오류:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

