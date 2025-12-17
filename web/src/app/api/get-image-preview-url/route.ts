import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uuidToBase62 } from '@/lib/utils/shortUrl'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * 이미지 URL을 Open Graph 미리보기 URL로 변환
 * GET /api/get-image-preview-url?imageUrl=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const imageUrl = searchParams.get('imageUrl')

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl 파라미터가 필요합니다.' }, { status: 400 })
    }

    // user_images 테이블에서 이미지 URL로 이미지 ID 찾기
    const { data: image, error } = await supabase
      .from('user_images')
      .select('id')
      .eq('image_url', imageUrl)
      .single()

    if (error || !image) {
      return NextResponse.json({ error: '이미지를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Open Graph 미리보기 URL 생성 (Base62 인코딩으로 URL 단축)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconnect-ten.vercel.app'
    const shortId = uuidToBase62(image.id)
    const previewUrl = `${baseUrl}/p/${shortId}`

    return NextResponse.json({
      success: true,
      preview_url: previewUrl,
      image_id: image.id,
    })
  } catch (error: any) {
    console.error('Error getting preview URL:', error)
    return NextResponse.json(
      { error: error?.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

