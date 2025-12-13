import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 가져오기 (필수)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

/**
 * AI 문자 메시지 추천 API
 * POST /api/ai/suggest-message
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

    // 사용자 설정 정보 조회 (개인정보 포함)
    const { data: userSettings } = await supabaseServer
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // 최근 발송 내역 조회 (최대 5개) - 전화번호가 있을 때만
    let recentLogs: any[] = []
    if (customerInfo.phone) {
      const { data } = await supabaseServer
        .from('sms_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone_number', customerInfo.phone.replace(/\D/g, ''))
        .order('sent_at', { ascending: false })
        .limit(5)
      
      recentLogs = data || []
    }

    // 대화 요약 정보 조회 (고객과의 관계 정보)
    let conversationSummary: any = null
    if (customerId) {
      const { data: summary } = await supabaseServer
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('customer_id', customerId)
        .single()
      
      conversationSummary = summary
    }

    // 대화 이력 구성
    const conversationHistory = (recentLogs || []).map(log => ({
      date: new Date(log.sent_at).toLocaleDateString('ko-KR'),
      sender: 'me' as const,
      message: log.message,
    }))

    // 한국 시간대(Asia/Seoul)로 현재 시간 계산
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const dayOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][now.getDay()]
    const hour = now.getHours()
    let timeOfDay: string
    let timeOfDayKorean: string
    if (hour >= 5 && hour < 12) {
      timeOfDay = 'morning'
      timeOfDayKorean = '오전'
    } else if (hour >= 12 && hour < 18) {
      timeOfDay = 'afternoon'
      timeOfDayKorean = '오후'
    } else if (hour >= 18 && hour < 22) {
      timeOfDay = 'evening'
      timeOfDayKorean = '저녁'
    } else {
      timeOfDay = 'night'
      timeOfDayKorean = '밤/새벽'
    }

    // 사용자 정보 구성
    const userName = userSettings?.full_name || user.email?.split('@')[0] || '사용자'
    const userCompany = userSettings?.company_name || ''
    const userPosition = userSettings?.position || ''
    const userBio = userSettings?.bio || ''
    const userSpecialties = userSettings?.specialties || []

    // 고객과의 관계 정보 추출
    let relationshipInfo = ''
    if (conversationSummary?.relationship_type) {
      relationshipInfo = `- 관계 유형: ${conversationSummary.relationship_type}\n`
    }
    if (conversationSummary?.communication_style) {
      relationshipInfo += `- 소통 스타일: ${conversationSummary.communication_style}\n`
    }
    if (customerInfo.notes) {
      // notes에서 관계 정보 추출 시도
      const notesLower = customerInfo.notes.toLowerCase()
      if (notesLower.includes('반말') || notesLower.includes('친구') || notesLower.includes('동생')) {
        relationshipInfo += `- 메모에서 확인된 관계: ${customerInfo.notes}\n`
      }
    }

    // 프롬프트 구성
    const systemPrompt = `너는 ${userName}${userCompany ? ` (${userCompany}${userPosition ? ` ${userPosition}` : ''})` : ''}의 개인 비서야.
${userName}의 입장에서 고객에게 보낼 문자 메시지를 작성해야 해.

중요한 원칙:
1. ${userName}의 입장에서 작성 (1인칭 "저" 또는 "나" 사용)
2. 회사 서신이 아닌 개인적인 메시지로 작성
3. 고객과의 기존 관계와 소통 패턴을 정확히 파악하여 일관성 유지
4. 반말을 쓰는 관계면 계속 반말로, 존댓말을 쓰는 관계면 계속 존댓말로 작성
5. 고객의 나이, 관계, 상황을 고려하여 적절한 톤 사용
6. 기존 대화 이력을 분석하여 상황 파악
7. 한국 현재 시간(Asia/Seoul 기준)을 정확히 인식하여 적절한 인사 사용

응답은 반드시 다음 JSON 형식으로 해줘:
{
  "formal": "정중한 버전 메시지",
  "friendly": "친근한 버전 메시지",
  "concise": "간결한 버전 메시지"
}

주의사항:
- 한국어로 작성
- ${userName}의 개인적인 톤으로 작성 (회사 대표가 아닌 개인으로)
- 과거 대화 맥락과 관계 패턴을 정확히 반영
- 현재 시간/상황을 정확히 고려 (한국 시간 기준)
- 고객과의 관계에 맞는 말투 사용 (반말/존댓말 일관성 유지)
- 불필요한 이모지나 과도한 친근함 지양`

    const userPrompt = `[${userName}의 정보]
${userCompany ? `- 소속: ${userCompany}` : ''}
${userPosition ? `- 직책: ${userPosition}` : ''}
${userBio ? `- 소개: ${userBio}` : ''}
${userSpecialties.length > 0 ? `- 전문 분야: ${userSpecialties.join(', ')}` : ''}

[현재 상황 - 한국 시간(Asia/Seoul) 기준]
- 날짜: ${now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} ${dayOfWeek}
- 시간: ${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })} (${timeOfDayKorean})
- 현재는 ${timeOfDayKorean}입니다. ${timeOfDay === 'night' || hour < 5 ? '새벽 시간이므로 인사에 주의하세요.' : timeOfDay === 'morning' ? '아침 시간입니다. 좋은 아침 인사를 사용하세요.' : timeOfDay === 'afternoon' ? '오후 시간입니다.' : '저녁 시간입니다.'}

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
${relationshipInfo ? `\n[고객과의 관계 정보]\n${relationshipInfo}` : ''}
${conversationSummary?.summary ? `- 대화 요약: ${conversationSummary.summary}` : ''}
${conversationSummary?.next_actions && conversationSummary.next_actions.length > 0 ? `- 다음 액션: ${conversationSummary.next_actions.join(', ')}` : ''}

[최근 대화 이력 - 패턴 분석]
${conversationHistory.length > 0 
  ? conversationHistory.map((h, i) => {
      // 대화에서 말투 패턴 분석
      const message = h.message
      const usesBanmal = /(야|어|해|지|다|네|게)/.test(message) && !/(습니다|습니다|세요|세요)/.test(message)
      const tone = usesBanmal ? '반말' : '존댓말'
      return `${i + 1}. (${h.date}) ${userName} → ${customerInfo.name}: "${message}" [톤: ${tone}]`
    }).join('\n')
  : '대화 이력이 없습니다. 첫 대화일 수 있습니다.'}

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

