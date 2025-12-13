import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Preview API Route - 이미지 미리보기용 API
 * GET /api/preview/[imageId]
 * 
 * 이 API는 페이지 라우트가 작동하지 않을 때 대체 수단으로 사용됩니다.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> | { imageId: string } }
) {
  // Next.js 16에서 params가 Promise일 수 있음
  const resolvedParams = params instanceof Promise ? await params : params
  const { imageId } = resolvedParams

  try {
    // 이미지 정보 조회
    const { data: image, error } = await supabase
      .from('user_images')
      .select('image_url, name, category, created_at')
      .eq('id', imageId)
      .single()

    if (error || !image) {
      return NextResponse.json(
        { error: '이미지를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // HTML 이스케이프 헬퍼 함수
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    // 명함 이미지인지 확인
    const isBusinessCard = image.category === 'business_card'
    
    // 제목 결정 (파일명 제거)
    const ogTitle = isBusinessCard ? '📇 내 명함' : '이미지 미리보기'
    const safeTitle = escapeHtml(ogTitle)
    
    // 설명은 빈 값 또는 최소한의 텍스트
    const safeDescription = ''
    
    // 이미지 URL
    const safeImageUrl = escapeHtml(image.image_url)
    
    // 현재 페이지 URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconnect-ten.vercel.app'
    const ogUrl = `${baseUrl}/api/preview/${imageId}`

    // HTML 응답 반환 (Open Graph 메타 태그 포함)
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${safeImageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImageUrl}" />
  
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f9fafb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      width: 100%;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      margin: 20px;
    }
    .image-container {
      width: 100%;
      aspect-ratio: 16/9;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .image-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="image-container">
      <img src="${safeImageUrl}" alt="${safeTitle}" />
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error in preview API route:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

