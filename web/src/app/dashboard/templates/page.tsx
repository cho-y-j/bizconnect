'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMessageTemplates } from '@/lib/hooks/useMessageTemplates'
import { TEMPLATE_CATEGORY_LABELS, AVAILABLE_VARIABLES, type TemplateCategory } from '@/lib/types/template'
import { extractVariables } from '@/lib/utils/templateParser'

export default function TemplatesPage() {
  const router = useRouter()
  const { templates, loading, error, addTemplate, updateTemplate, deleteTemplate } = useMessageTemplates()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'general' as TemplateCategory,
    is_favorite: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingId) {
      const result = await updateTemplate(editingId, formData)
      if (result) {
        setEditingId(null)
        resetForm()
      }
    } else {
      const result = await addTemplate(formData)
      if (result) {
        setShowAddForm(false)
        resetForm()
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      category: 'general',
      is_favorite: false,
    })
  }

  const handleEdit = (template: any) => {
    setEditingId(template.id)
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category,
      is_favorite: template.is_favorite,
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`"${name}" 템플릿을 삭제하시겠습니까?`)) {
      await deleteTemplate(id)
    }
  }

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + variable,
    }))
  }

  const detectedVariables = formData.content ? extractVariables(formData.content) : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
                비즈커넥트
              </Link>
              <span className="text-gray-400">/</span>
              <h1 className="text-xl font-semibold text-gray-900">문자 템플릿</h1>
            </div>
            <button
              onClick={() => {
                resetForm()
                setEditingId(null)
                setShowAddForm(!showAddForm)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showAddForm ? '취소' : '+ 템플릿 추가'}
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* 템플릿 추가/수정 폼 */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? '템플릿 수정' : '템플릿 추가'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  템플릿 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 생일 축하, 인사말"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TemplateCategory }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  템플릿 내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="메시지를 입력하세요. 변수를 사용할 수 있습니다."
                />
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">변수 삽입:</p>
                  <div className="flex flex-wrap gap-1">
                    {AVAILABLE_VARIABLES.map((variable) => (
                      <button
                        key={variable.key}
                        type="button"
                        onClick={() => insertVariable(variable.key)}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        title={variable.description}
                      >
                        {variable.key}
                      </button>
                    ))}
                  </div>
                </div>
                {detectedVariables.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">사용된 변수:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {detectedVariables.map((variable) => (
                        <span
                          key={variable}
                          className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_favorite"
                  checked={formData.is_favorite}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_favorite: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="is_favorite" className="text-sm text-gray-700">
                  즐겨찾기
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingId ? '수정' : '추가'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingId(null)
                    resetForm()
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 템플릿 목록 */}
        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">템플릿을 불러오는 중...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500 mb-4">등록된 템플릿이 없습니다.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 첫 템플릿 추가
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800 mb-1">
                      {template.is_favorite && '⭐ '}
                      {template.name}
                    </h3>
                    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                      {TEMPLATE_CATEGORY_LABELS[template.category]}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3 whitespace-pre-wrap">
                  {template.content}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>사용 {template.usage_count}회</span>
                  <span>
                    {new Date(template.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {template.variables && template.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">변수:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((variable) => (
                        <span
                          key={variable}
                          className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(template.id, template.name)}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

