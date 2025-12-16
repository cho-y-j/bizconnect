import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/admin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service Role Key로 Admin Client 생성 (auth.users 조회 가능)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const superAdmin = await isSuperAdmin()
    if (!superAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    // Service Role Key로 auth.users 테이블 조회
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // 최대 1000명까지 조회
    })

    if (authError) {
      console.error('Error fetching auth.users:', authError)
      return NextResponse.json(
        { error: '사용자 목록을 가져오는데 실패했습니다.', details: authError.message },
        { status: 500 }
      )
    }

    if (!authUsers || !authUsers.users) {
      console.warn('No users found in auth.users')
      return NextResponse.json({ users: [] })
    }

    // 각 사용자별 통계 수집 (에러가 발생해도 계속 진행)
    const usersWithStats = await Promise.allSettled(
      (authUsers?.users || []).map(async (authUser) => {
        try {
          // 고객 수
          const { count: customerCount } = await supabaseAdmin
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authUser.id)

          // SMS 발송 수
          const { count: smsCount } = await supabaseAdmin
            .from('sms_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authUser.id)

          // 구독 정보
          const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('plan_type, status')
            .eq('user_id', authUser.id)
            .maybeSingle()

          // 첫 번째 고객의 created_at을 사용자 가입일로 사용 (없으면 auth.users의 created_at 사용)
          const { data: firstCustomer } = await supabaseAdmin
            .from('customers')
            .select('created_at')
            .eq('user_id', authUser.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

          return {
            id: authUser.id,
            email: authUser.email || `user-${authUser.id.substring(0, 8)}@unknown.com`,
            created_at: firstCustomer?.created_at || authUser.created_at || new Date().toISOString(),
            customer_count: customerCount || 0,
            sms_count: smsCount || 0,
            subscription: subscription || undefined,
            email_confirmed: authUser.email_confirmed_at !== null,
          }
        } catch (err) {
          console.error(`Error processing user ${authUser.id}:`, err)
          // 에러가 발생해도 기본 정보는 반환
          return {
            id: authUser.id,
            email: authUser.email || `user-${authUser.id.substring(0, 8)}@unknown.com`,
            created_at: authUser.created_at || new Date().toISOString(),
            customer_count: 0,
            sms_count: 0,
            subscription: undefined,
            email_confirmed: authUser.email_confirmed_at !== null,
          }
        }
      })
    )

    // Promise.allSettled 결과를 처리
    const validUsers = usersWithStats
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map((result) => result.value)

    // 생성일 기준 내림차순 정렬
    validUsers.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return NextResponse.json({ users: validUsers })
  } catch (error: any) {
    console.error('Error in admin/users API:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

