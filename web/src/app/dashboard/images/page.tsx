'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'

export default function ImagesPage() {
  const router = useRouter()
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingImage, setEditingImage] = useState<any>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('general')

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('user_images')
        .select('*')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        setError('이미지 목록을 불러오는 중 오류가 발생했습니다.')
      } else {
        setImages(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
      setError('이미지 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError('')
    setSuccess('')

    try {
      // Vercel 요청 크기 제한 (4.5MB) 체크
      const maxSize = 4.5 * 1024 * 1024 // 4.5MB
      if (file.size > maxSize) {
        setError('파일 크기는 4.5MB 이하여야 합니다. (Vercel 제한)')
        setUploading(false)
        return
      }

      const user = await getCurrentUser()
      if (!user) {
        setError('로그인이 필요합니다.')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('세션이 만료되었습니다.')
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)
      formData.append('category', 'general')

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('파일 크기가 너무 큽니다. 4.5MB 이하의 파일을 업로드해주세요.')
        }
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `서버 오류 (${response.status})` }
        }
        throw new Error(errorData.error || '이미지 업로드 실패')
      }

      setSuccess('이미지가 성공적으로 업로드되었습니다.')
      await loadImages()
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || '이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (imageId: string, imageUrl: string) => {
    if (!confirm('이미지를 삭제하시겠습니까?')) return

    try {
      const user = await getCurrentUser()
      if (!user) return

      // 파일명 추출 (URL에서)
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const fullPath = `${user.id}/${fileName}`

      // Storage에서 삭제
      const { error: storageError } = await supabase.storage
        .from('user-images')
        .remove([fullPath])

      if (storageError) {
        console.error('Storage delete error:', storageError)
      }

      // DB에서 삭제
      const { error: dbError } = await supabase
        .from('user_images')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user.id)

      if (dbError) {
        setError('이미지 삭제 중 오류가 발생했습니다.')
      } else {
        setSuccess('이미지가 삭제되었습니다.')
        await loadImages()
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError('이미지 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleToggleFavorite = async (imageId: string, currentFavorite: boolean) => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const { error } = await supabase
        .from('user_images')
        .update({ is_favorite: !currentFavorite })
        .eq('id', imageId)
        .eq('user_id', user.id)

      if (error) {
        setError('즐겨찾기 업데이트 중 오류가 발생했습니다.')
      } else {
        await loadImages()
      }
    } catch (err) {
      console.error('Toggle favorite error:', err)
    }
  }

  const handleEdit = (image: any) => {
    setEditingImage(image)
    setEditName(image.name)
    setEditCategory(image.category)
  }

  const handleSaveEdit = async () => {
    if (!editingImage) return

    try {
      const user = await getCurrentUser()
      if (!user) return

      const { error } = await supabase
        .from('user_images')
        .update({
          name: editName,
          category: editCategory,
        })
        .eq('id', editingImage.id)
        .eq('user_id', user.id)

      if (error) {
        setError('이미지 정보 업데이트 중 오류가 발생했습니다.')
      } else {
        setSuccess('이미지 정보가 업데이트되었습니다.')
        setEditingImage(null)
        await loadImages()
      }
    } catch (err) {
      console.error('Edit error:', err)
      setError('이미지 정보 업데이트 중 오류가 발생했습니다.')
    }
  }

  return (
    <div>
      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">이미지 관리</h1>
            <p className="text-sm sm:text-base text-slate-600">명함, 로고 등 발송에 사용할 이미지를 관리합니다</p>
          </div>
          <Link
            href="/dashboard/send"
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm hover:shadow-md font-semibold text-sm sm:text-base whitespace-nowrap"
          >
            문자 보내기
          </Link>
        </div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* 업로드 섹션 */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">새 이미지 업로드</h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleUpload(file)
                }
              }}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 disabled:opacity-50"
            />
            {uploading && (
              <span className="text-sm text-gray-500">업로드 중...</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            명함, 로고, 상품 이미지 등을 업로드하여 문자 발송 시 사용할 수 있습니다. (최대 4.5MB - Vercel 제한)
          </p>
        </div>

        {/* 이미지 목록 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : images.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            저장된 이미지가 없습니다. 위에서 이미지를 업로드하세요.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              저장된 이미지 ({images.length}개)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <img
                    src={image.image_url}
                    alt={image.name}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-900 truncate">{image.name}</p>
                    <p className="text-xs text-gray-500">{image.category}</p>
                    {image.is_favorite && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full"></span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button
                      onClick={() => handleToggleFavorite(image.id, image.is_favorite)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all text-xs font-medium text-slate-700"
                      title={image.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                    >
                      {image.is_favorite ? '선택됨' : '선택'}
                    </button>
                    <button
                      onClick={() => handleEdit(image)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all text-xs font-medium text-slate-700"
                      title="편집"
                    >
                      편집
                    </button>
                    <button
                      onClick={() => handleDelete(image.id, image.image_url)}
                      className="px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg shadow-sm hover:bg-red-100 transition-all text-xs font-medium text-red-700"
                      title="삭제"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 편집 모달 */}
        {editingImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">이미지 정보 수정</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이름
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">일반</option>
                    <option value="business_card">명함</option>
                    <option value="logo">로고</option>
                    <option value="product">상품</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-medium shadow-sm"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingImage(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

