import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Short Preview Route - /p/[id]
 * 짧은 URL로 이미지 미리보기 제공
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = params instanceof Promise ? await params : params
  const { id } = resolvedParams

  try {
    const { data: image, error } = await supabase
      .from('user_images')
      .select('image_url, name, category')
      .eq('id', id)
      .single()

    if (error || !image) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const escapeHtml = (str: string) => {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    }

    const safeImageUrl = escapeHtml(image.image_url)

    // 최소한의 HTML - 이미지만 표시
    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta property="og:image" content="${safeImageUrl}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${safeImageUrl}" />
</head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5">
<img src="${safeImageUrl}" style="max-width:100%;max-height:100vh" />
</body></html>`

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
