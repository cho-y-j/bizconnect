import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 가져오거나, 없으면 기본값 사용 (임시)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-af010f64eb7d44d0bb82ef6d3ff0d539'
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

if (!DEEPSEEK_API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY 환경 변수가 설정되지 않았습니다!')
  console.error('web/.env.local 파일에 DEEPSEEK_API_KEY=sk-af010f64eb7d44d0bb82ef6d3ff0d539 추가하세요.')
}

/**
 * AI 문자 메시지 추천 API
 * POST /api/ai/suggest-message
 */
export async function POST(request: NextRequest) {
  try {
    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: 'AI 서비스가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { customerId, customerPhone, customerName, intent } = body

    // 고객 정보 확인 (customerId 또는 customerPhone 중 하나는 필요)
    if (!customerId && !customerPhone) {
      return NextResponse.json(
        { error: '고객 정보가 필요합니다.' },
        { status: 400 }
      )
    }

    // 사용자 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // Supabase 클라이언트 생성 (서버 사이드)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseServer = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    })

    // 토큰에서 사용자 ID 추출
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }

    // 고객 정보 조회 (customerId가 있으면 ID로, 없으면 전화번호로)
    let customer: any = null
    
    if (customerId) {
      const { data } = await supabaseServer
        .from('customers')
        .select(`
          *,
          group:customer_groups(name, color),
          tags:customer_tags(tag_name)
        `)
        .eq('id', customerId)
        .eq('user_id', user.id)
        .single()

      if (data) {
        customer = data
      }
    } else if (customerPhone) {
      // 전화번호로 고객 찾기
      const normalizedPhone = customerPhone.replace(/\D/g, '')
      const { data } = await supabaseServer
        .from('customers')
        .select(`
          *,
          group:customer_groups(name, color),
          tags:customer_tags(tag_name)
        `)
        .eq('user_id', user.id)
        .eq('phone', normalizedPhone)
        .single()

      if (data) {
        customer = data
      }
    }

    // 고객이 DB에 없어도 단건 발송은 가능 (고객명만 제공된 경우)
    const customerInfo = customer || {
      name: customerName || '고객님',
      phone: customerPhone?.replace(/\D/g, '') || '',
      industry_type: null,
      group: null,
      tags: [],
    }

    // 캐시 키 생성 (고객 + 의도 기반)
    const phoneForCache = customerInfo.phone || customerPhone?.replace(/\D/g, '') || 'unknown'
    const cacheKey = `suggest_${phoneForCache}_${intent || 'general'}_${new Date().toISOString().split('T')[0]}`

    // 캐시 확인 (24시간 이내)
    const { data: cached } = await supabaseServer
      .from('ai_suggestions_cache')
      .select('suggestions')
      .eq('user_id', user.id)
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached) {
      console.log('✅ 캐시에서 AI 추천 반환 (토큰 절약)')
      return NextResponse.json({ 
        suggestions: cached.suggestions,
        cached: true 
      })
    }

    // 최근 발송 내역 조회 (최대 3개) - 전화번호가 있을 때만
    let recentLogs: any[] = []
    if (customerInfo.phone) {
      const { data } = await supabaseServer
        .from('sms_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone_number', customerInfo.phone.replace(/\D/g, ''))
        .order('sent_at', { ascending: false })
        .limit(3)
      
      recentLogs = data || []
    }

    // 대화 이력 구성
    const conversationHistory = (recentLogs || []).map(log => ({
      date: new Date(log.sent_at).toLocaleDateString('ko-KR'),
      sender: 'me' as const,
      message: log.message,
    }))

    // 현재 상황 정보
    const now = new Date()
    const dayOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][now.getDay()]
    const hour = now.getHours()
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 22 ? 'evening' : 'night'

    // 프롬프트 구성
    const systemPrompt = `너는 예의 바르고 센스 있는 비즈니스 파트너 '비즈커넥트 비서'야. 
아래 [대화 이력]과 [현재 상황]을 고려해서, 고객에게 보낼 적절한 안부/영업 문자를 
3가지 버전(정중한, 친근한, 간결한)으로 추천해줘.

응답은 반드시 다음 JSON 형식으로 해줘:
{
  "formal": "정중한 버전 메시지",
  "friendly": "친근한 버전 메시지",
  "concise": "간결한 버전 메시지"
}

주의사항:
- 한국어로 작성
- 비즈니스 톤 유지
- 과거 대화 맥락 반영
- 현재 시간/상황 고려
- 불필요한 이모지나 과도한 친근함 지양`

    const userPrompt = `[현재 상황]
- 날짜: ${now.toLocaleDateString('ko-KR')} ${dayOfWeek}
- 시간: ${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} (${timeOfDay === 'morning' ? '오전' : timeOfDay === 'afternoon' ? '오후' : timeOfDay === 'evening' ? '저녁' : '밤'})

[고객 정보]
- 이름: ${customerInfo.name}
${customerInfo.industry_type ? `- 업종: ${customerInfo.industry_type}` : ''}
${customerInfo.group ? `- 그룹: ${customerInfo.group.name}` : ''}
${customerInfo.tags && customerInfo.tags.length > 0 ? `- 태그: ${customerInfo.tags.map((t: any) => t.tag_name).join(', ')}` : ''}
${customerInfo.address ? `- 주소: ${customerInfo.address}` : ''}
${customerInfo.occupation ? `- 직업: ${customerInfo.occupation}` : ''}
${customerInfo.age ? `- 나이: ${customerInfo.age}세` : customerInfo.birth_year ? `- 출생년도: ${customerInfo.birth_year}년 (약 ${new Date().getFullYear() - customerInfo.birth_year}세)` : ''}
${customerInfo.birthday ? `- 생일: ${new Date(customerInfo.birthday).toLocaleDateString('ko-KR')}` : ''}
${customerInfo.anniversary ? `- 기념일: ${new Date(customerInfo.anniversary).toLocaleDateString('ko-KR')}` : ''}
${customerInfo.notes ? `- 메모: ${customerInfo.notes}` : ''}

[최근 대화 이력]
${conversationHistory.length > 0 
  ? conversationHistory.map((h, i) => `${i + 1}. (${h.date}) 나 → 고객: "${h.message}"`).join('\n')
  : '대화 이력이 없습니다.'}

[의도]
${intent || '안부 인사 및 관계 유지'}`

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
        temperature: 0.7,
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
    let suggestions
    try {
      suggestions = JSON.parse(content)
    } catch (e) {
      // JSON이 아닌 경우 텍스트에서 추출 시도
      console.error('JSON 파싱 실패:', content)
      return NextResponse.json(
        { error: 'AI 응답 형식이 올바르지 않습니다.' },
        { status: 500 }
      )
    }

    // 캐시 저장 (24시간)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

      // 캐시 저장 (고객 ID가 있을 때만)
      if (customerId || customerInfo.phone) {
        await supabaseServer
          .from('ai_suggestions_cache')
          .upsert({
            user_id: user.id,
            customer_id: customerId || null,
            customer_phone: customerInfo.phone.replace(/\D/g, '') || phoneForCache,
            cache_key: cacheKey,
            suggestions,
            intent: intent || 'general',
            expires_at: expiresAt.toISOString(),
          })
      }

    return NextResponse.json({ 
      suggestions,
      cached: false 
    })
  } catch (error: any) {
    console.error('AI 추천 오류:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

