import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service Role Key로 Admin Client 생성
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * 특정 사용자의 이메일을 확인 상태로 변경
 */
export async function POST(request: NextRequest) {
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

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 })
    }

    // 사용자 이메일 확인 상태 업데이트
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (error) {
      console.error('Error confirming user email:', error)
      return NextResponse.json(
        { error: '이메일 확인에 실패했습니다.', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: '이메일이 확인되었습니다.',
      user: data.user 
    })
  } catch (error: any) {
    console.error('Error in confirm-email API:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 모든 미확인 사용자의 이메일을 확인 상태로 변경
 */
export async function PUT(request: NextRequest) {
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

    // 모든 사용자 조회
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json(
        { error: '사용자 목록을 가져오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // 이메일이 확인되지 않은 사용자 필터링
    const unconfirmedUsers = (authUsers?.users || []).filter(
      (u) => !u.email_confirmed_at
    )

    // 모든 미확인 사용자의 이메일 확인
    const results = await Promise.all(
      unconfirmedUsers.map(async (authUser) => {
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          email_confirm: true,
        })
        return { userId: authUser.id, success: !error, error: error?.message }
      })
    )

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      message: `${successCount}명의 사용자 이메일이 확인되었습니다.`,
      total: unconfirmedUsers.length,
      successCount,
      failCount,
      results,
    })
  } catch (error: any) {
    console.error('Error in confirm-email API (bulk):', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

