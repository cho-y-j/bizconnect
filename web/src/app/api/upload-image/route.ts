import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Vercel 함수 타임아웃 설정 (30초)
export const maxDuration = 30

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

    const token = authHeader.replace('Bearer ', '')
    
    // 사용자 토큰을 사용하여 Supabase 클라이언트 생성 (RLS 정책 적용을 위해)
    const supabaseServer = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', {
        error: authError,
        hasToken: !!token,
      })
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }

    console.log('✅ User authenticated:', {
      userId: user.id,
      email: user.email,
    })

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

    // 파일 크기 제한 (4.5MB - Vercel 요청 크기 제한)
    const maxSize = 4.5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: '파일 크기는 4.5MB 이하여야 합니다. (Vercel 제한)' }, { status: 400 })
    }

    // 파일명 생성 (고유한 이름) - 경로 탐색 공격 방지
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    
    // 허용된 확장자만 허용
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. (jpg, jpeg, png, gif, webp만 허용)' },
        { status: 400 }
      )
    }
    
    // 파일명에서 경로 탐색 문자 제거 및 안전한 파일명 생성
    const safeName = (name || file.name)
      .replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
      .substring(0, 50) // 파일명 길이 제한
    
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Supabase Storage에 업로드
    // Storage API는 별도의 클라이언트가 필요하며, 토큰을 명시적으로 전달해야 함
    console.log('📤 Uploading image to Storage:', {
      bucket: 'user-images',
      fileName,
      fileSize: file.size,
      fileType: file.type,
      userId: user.id,
    })

    // Storage 업로드를 위한 별도 클라이언트 생성 (토큰 포함)
    const storageClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from('user-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', {
        message: uploadError.message,
        error: uploadError,
        fileName,
        userId: user.id,
      })
      
      // 더 자세한 에러 메시지 제공
      let errorMessage = '이미지 업로드 실패'
      if (uploadError.message) {
        errorMessage += ': ' + uploadError.message
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    console.log('✅ Image uploaded successfully:', {
      path: uploadData?.path,
      fileName,
    })

    // Public URL 생성
    const { data: { publicUrl } } = storageClient.storage
      .from('user-images')
      .getPublicUrl(fileName)

    console.log('🔗 Generated public URL:', publicUrl)

    // user_images 테이블에 저장
    console.log('💾 Saving image metadata to database...')
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
      console.error('❌ Database insert error:', {
        message: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint,
        userId: user.id,
      })
      
      // 업로드된 파일 삭제 시도
      try {
        await storageClient.storage.from('user-images').remove([fileName])
        console.log('🗑️ Removed uploaded file after DB error')
      } catch (removeError) {
        console.error('❌ Failed to remove file after DB error:', removeError)
      }
      
      return NextResponse.json(
        { error: '이미지 정보 저장 실패: ' + (dbError.message || '알 수 없는 오류') },
        { status: 500 }
      )
    }

    console.log('✅ Image metadata saved successfully:', {
      imageId: imageData?.id,
      imageUrl: imageData?.image_url,
    })

    // Open Graph 미리보기 URL 생성 (API 라우트 사용)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconnect-ten.vercel.app'
    const previewUrl = `${baseUrl}/api/preview/${imageData.id}`

    return NextResponse.json({
      success: true,
      image: {
        ...imageData,
        preview_url: previewUrl, // Open Graph 미리보기 URL 추가
      },
    })
  } catch (error: any) {
    console.error('❌ Unexpected error in image upload:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { error: error?.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

