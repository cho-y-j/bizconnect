'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCustomerGroups } from '@/lib/hooks/useCustomerGroups'
import { DEFAULT_GROUP_COLORS } from '@/lib/types/customer'

export default function GroupsPage() {
  const router = useRouter()
  const { groups, loading, createGroup, updateGroup, deleteGroup } = useCustomerGroups()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', color: DEFAULT_GROUP_COLORS[0] })
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError('그룹명을 입력해주세요.')
      return
    }

    try {
      await createGroup(formData.name, formData.color)
      setFormData({ name: '', color: DEFAULT_GROUP_COLORS[0] })
      setShowAddForm(false)
      setError('')
    } catch (err: any) {
      setError(err.message || '그룹 생성 중 오류가 발생했습니다.')
    }
  }

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) {
      setError('그룹명을 입력해주세요.')
      return
    }

    try {
      await updateGroup(id, { name: formData.name, color: formData.color })
      setEditingId(null)
      setFormData({ name: '', color: DEFAULT_GROUP_COLORS[0] })
      setError('')
    } catch (err: any) {
      setError(err.message || '그룹 수정 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 그룹을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await deleteGroup(id)
    } catch (err: any) {
      alert(err.message || '그룹 삭제 중 오류가 발생했습니다.')
    }
  }

  const startEdit = (group: any) => {
    setEditingId(group.id)
    setFormData({ name: group.name, color: group.color })
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ name: '', color: DEFAULT_GROUP_COLORS[0] })
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/customers" className="text-2xl font-bold text-blue-600">
              비즈커넥트
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/dashboard/customers" className="text-gray-600 hover:text-gray-900">
              고객 관리
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-xl font-semibold text-gray-900">그룹 관리</h1>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">고객 그룹 관리</h2>
              <p className="text-gray-600">
                고객을 분류할 그룹을 만들고 관리하세요. 각 그룹은 색상으로 구분됩니다.
              </p>
            </div>
            {!showAddForm && (
              <button
                onClick={() => {
                  setShowAddForm(true)
                  setError('')
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + 그룹 추가
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 그룹 추가 폼 */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">새 그룹 추가</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    그룹명
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: VIP 고객"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    색상
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {DEFAULT_GROUP_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === color
                            ? 'border-gray-900 scale-110'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  추가
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({ name: '', color: DEFAULT_GROUP_COLORS[0] })
                    setError('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 그룹 목록 */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>그룹이 없습니다. 그룹을 추가해주세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  {editingId === group.id ? (
                    <>
                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                        <div>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <div className="flex gap-2">
                            {DEFAULT_GROUP_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, color }))}
                                className={`w-8 h-8 rounded border-2 ${
                                  formData.color === color
                                    ? 'border-gray-900 scale-110'
                                    : 'border-gray-300'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleUpdate(group.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          저장
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="font-medium text-gray-900">{group.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(group)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(group.id, group.name)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 안내 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>팁:</strong> 그룹은 고객의 주된 소속을 나타냅니다. 각 고객은 반드시 하나의 그룹에 속해야 합니다.
              태그는 여러 개를 사용할 수 있어 더 세밀한 분류가 가능합니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

