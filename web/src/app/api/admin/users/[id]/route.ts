import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service Role Key로 Admin Client 생성 (auth.users 조회 가능)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 클라이언트에서 전달된 사용자 ID 확인
    const userIdFromHeader = request.headers.get('x-user-id')
    
    if (!userIdFromHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 슈퍼 관리자 권한 확인
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('user_id', userIdFromHeader)
      .eq('role', 'super_admin')
      .maybeSingle()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { id: userId } = await params

    // Service Role Key로 auth.users에서 사용자 정보 조회
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (authError || !authUser) {
      console.error('Error fetching auth user:', authError)
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 고객 수
    const { count: customerCount } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // SMS 통계
    const { data: smsLogs } = await supabaseAdmin
      .from('sms_logs')
      .select('status')
      .eq('user_id', userId)

    const totalSmsSent = smsLogs?.length || 0
    const totalSmsFailed =
      smsLogs?.filter((log) => log.status === 'failed').length || 0

    // 구독 정보
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // 첫 번째 고객의 created_at을 사용자 가입일로 사용 (없으면 auth.users의 created_at 사용)
    const { data: firstCustomer } = await supabaseAdmin
      .from('customers')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      user: {
        id: authUser.user.id,
        email: authUser.user.email || `user-${authUser.user.id.substring(0, 8)}@unknown.com`,
        created_at: firstCustomer?.created_at || authUser.user.created_at || new Date().toISOString(),
        customer_count: customerCount || 0,
        sms_count: totalSmsSent,
        total_sms_sent: totalSmsSent,
        total_sms_failed: totalSmsFailed,
        subscription: subscription
          ? {
              plan_type: subscription.plan_type,
              status: subscription.status,
              start_date: subscription.start_date,
              end_date: subscription.end_date,
              billing_amount: Number(subscription.billing_amount) || 0,
            }
          : undefined,
        email_confirmed: authUser.user.email_confirmed_at !== null,
      },
    })
  } catch (error: any) {
    console.error('Error in admin/users/[id] API:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

