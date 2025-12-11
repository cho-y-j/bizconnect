import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import { notFound } from 'next/navigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

interface PageProps {
  params: {
    imageId: string
  }
}

// Open Graph 메타데이터 생성
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { imageId } = params

  try {
    // 이미지 정보 조회
    const { data: image, error } = await supabase
      .from('user_images')
      .select('image_url, name, category')
      .eq('id', imageId)
      .single()

    if (error || !image) {
      return {
        title: '이미지 미리보기',
        description: '이미지를 찾을 수 없습니다.',
      }
    }

    const imageUrl = image.image_url
    const title = image.name || '이미지 미리보기'
    const description = `비즈커넥트 - ${title}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: '이미지 미리보기',
      description: '이미지를 불러오는 중 오류가 발생했습니다.',
    }
  }
}

export default async function ImagePreviewPage({ params }: PageProps) {
  const { imageId } = params

  try {
    // 이미지 정보 조회
    const { data: image, error } = await supabase
      .from('user_images')
      .select('image_url, name, category, created_at')
      .eq('id', imageId)
      .single()

    if (error || !image) {
      notFound()
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Open Graph 메타 태그는 generateMetadata에서 처리됨 */}
          
          {/* 이미지 표시 */}
          <div className="relative w-full aspect-video bg-gray-100">
            <Image
              src={image.image_url}
              alt={image.name || '이미지'}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          
          {/* 이미지 정보 */}
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {image.name || '이미지'}
            </h1>
            {image.category && (
              <p className="text-sm text-gray-500 mb-4">
                카테고리: {image.category}
              </p>
            )}
            {image.created_at && (
              <p className="text-xs text-gray-400">
                업로드: {new Date(image.created_at).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading image:', error)
    notFound()
  }
}

