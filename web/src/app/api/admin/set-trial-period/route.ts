import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, start_date, end_date } = body

    if (!user_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 날짜 유효성 검사
    const start = new Date(start_date)
    const end = new Date(end_date)
    if (start >= end) {
      return NextResponse.json(
        { error: '종료일은 시작일보다 이후여야 합니다.' },
        { status: 400 }
      )
    }

    // 기존 구독 정보 확인
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (existingSubscription) {
      // 기존 구독 정보 업데이트
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_type: 'free',
          status: 'trial',
          start_date: start_date,
          end_date: end_date,
          billing_amount: 0,
          billing_cycle: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
        return NextResponse.json(
          { error: '구독 정보 업데이트에 실패했습니다.' },
          { status: 500 }
        )
      }
    } else {
      // 새 구독 정보 생성
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user_id,
          plan_type: 'free',
          status: 'trial',
          start_date: start_date,
          end_date: end_date,
          billing_amount: 0,
          billing_cycle: null,
        })

      if (insertError) {
        console.error('Error creating subscription:', insertError)
        return NextResponse.json(
          { error: '구독 정보 생성에 실패했습니다.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: '무료 사용 기간이 설정되었습니다.',
    })
  } catch (error: any) {
    console.error('Error in set-trial-period API:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}









