import { redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const dynamicParams = true

interface PageProps {
  params: {
    imageId: string
  }
}

/**
 * /preview/[imageId] 페이지 라우트
 * API 라우트로 리다이렉트하여 404 오류 방지
 */
export default async function ImagePreviewPage({ params }: PageProps) {
  const { imageId } = params
  
  // /api/preview/[imageId]로 리다이렉트
  redirect(`/api/preview/${imageId}`)
}

