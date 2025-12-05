import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

/**
 * 템플릿 테이블 존재 여부 및 상태 확인 API
 */
export async function GET() {
  try {
    // 1. message_templates 테이블 존재 확인
    const { data: tableCheck, error: tableError } = await supabase
      .from('message_templates')
      .select('id')
      .limit(1)

    if (tableError) {
      // 테이블이 없거나 접근 불가
      if (tableError.code === '42P01') {
        return NextResponse.json({
          success: false,
          message: 'message_templates 테이블이 존재하지 않습니다.',
          error: tableError.message,
          action: '데이터베이스 마이그레이션을 실행하세요: supabase/add-message-templates.sql',
        }, { status: 404 })
      }
      return NextResponse.json({
        success: false,
        message: '테이블 확인 중 오류 발생',
        error: tableError.message,
      }, { status: 500 })
    }

    // 2. tasks 테이블에 template_id 컬럼 확인
    const { data: tasksCheck, error: tasksError } = await supabase
      .from('tasks')
      .select('template_id')
      .limit(1)

    if (tasksError && tasksError.code === '42703') {
      // template_id 컬럼이 없음
      return NextResponse.json({
        success: false,
        message: 'tasks 테이블에 template_id 컬럼이 없습니다.',
        error: tasksError.message,
        action: '데이터베이스 마이그레이션을 실행하세요: supabase/add-message-templates.sql',
      }, { status: 404 })
    }

    // 3. 템플릿 개수 확인
    const { count, error: countError } = await supabase
      .from('message_templates')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      message: '템플릿 테이블이 정상적으로 설정되었습니다.',
      data: {
        tableExists: true,
        templateCount: count || 0,
        tasksTableHasTemplateId: true,
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '확인 중 오류 발생',
      error: error.message,
    }, { status: 500 })
  }
}

