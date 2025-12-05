import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * 이미지 업로드 API
 * POST /api/upload-image
 */
export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

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

    // FormData에서 파일 추출
    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const category = (formData.get('category') as string) || 'general'

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 })
    }

    // 파일 타입 검증 (이미지만 허용)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다.' }, { status: 400 })
    }

    // 파일 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 })
    }

    // 파일명 생성 (고유한 이름)
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from('user-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: '이미지 업로드 실패: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Public URL 생성
    const { data: { publicUrl } } = supabaseServer.storage
      .from('user-images')
      .getPublicUrl(fileName)

    // user_images 테이블에 저장
    const { data: imageData, error: dbError } = await supabaseServer
      .from('user_images')
      .insert({
        user_id: user.id,
        name: name || file.name,
        image_url: publicUrl,
        category,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // 업로드된 파일 삭제 시도
      await supabaseServer.storage.from('user-images').remove([fileName])
      return NextResponse.json(
        { error: '이미지 정보 저장 실패: ' + dbError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      image: imageData,
    })
  } catch (error: any) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

