import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/admin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service Role Key로 Admin Client 생성
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
    // 관리자 권한 확인
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const superAdmin = await isSuperAdmin()
    if (!superAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { id: userId } = await params

    // 최근 SMS 로그 조회
    const { data: smsLogs, error } = await supabaseAdmin
      .from('sms_logs')
      .select('id, phone_number, message, status, sent_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching SMS logs:', error)
      return NextResponse.json(
        { error: 'SMS 로그를 가져오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sms: smsLogs || [] })
  } catch (error: any) {
    console.error('Error in admin/users/[id]/sms API:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

