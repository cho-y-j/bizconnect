'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import { useCustomerGroups } from '@/lib/hooks/useCustomerGroups'
import { parseTags, tagsToText } from '@/lib/utils/tagParser'
import type { Customer, CustomerFormData } from '@/lib/types/customer'

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string
  const { groups } = useCustomerGroups()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    group_id: null,
    birthday: '',
    anniversary: '',
    tags: [],
    notes: '',
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    loadCustomer()
  }, [customerId])

  const loadCustomer = async () => {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // 고객 정보와 태그 함께 조회
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select(`
          *,
          tags:customer_tags(*)
        `)
        .eq('id', customerId)
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        setError('고객 정보를 불러올 수 없습니다.')
        console.error('Error loading customer:', fetchError)
      } else if (data) {
        const tags = (data.tags || []).map((t: any) => t.tag_name)
        setFormData({
          name: data.name,
          phone: data.phone,
          group_id: data.group_id,
          birthday: data.birthday ? data.birthday.split('T')[0] : '',
          anniversary: data.anniversary ? data.anniversary.split('T')[0] : '',
          tags: tags,
          notes: data.notes || '',
          address: data.address || '',
          occupation: data.occupation || '',
          age: data.age || null,
          birth_year: data.birth_year || null,
        })
        setTagInput(tagsToText(tags))
      }
    } catch (err) {
      console.error('Error:', err)
      setError('고객 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      if (!formData.group_id) {
        setError('그룹을 선택해주세요.')
        setSaving(false)
        return
      }

      // 전화번호 정규화
      const normalizedPhone = formData.phone.replace(/\D/g, '')

      if (normalizedPhone.length < 10) {
        setError('전화번호를 올바르게 입력해주세요.')
        setSaving(false)
        return
      }

      // 고객 정보 업데이트
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: formData.name.trim(),
          phone: normalizedPhone,
          group_id: formData.group_id,
          birthday: formData.birthday || null,
          anniversary: formData.anniversary || null,
          notes: formData.notes?.trim() || null,
          address: formData.address?.trim() || null,
          occupation: formData.occupation?.trim() || null,
          age: formData.age || null,
          birth_year: formData.birth_year || null,
        })
        .eq('id', customerId)
        .eq('user_id', user.id)

      if (updateError) {
        if (updateError.code === '23505') {
          setError('이미 등록된 전화번호입니다.')
        } else {
          setError('고객 정보 수정 중 오류가 발생했습니다: ' + updateError.message)
        }
      } else {
        // 태그 업데이트
        // 기존 태그 삭제
        await supabase
          .from('customer_tags')
          .delete()
          .eq('customer_id', customerId)

        // 새 태그 추가
        if (formData.tags && formData.tags.length > 0) {
          const tagsToInsert = formData.tags.map(tag => ({
            customer_id: customerId,
            tag_name: tag,
          }))

          await supabase
            .from('customer_tags')
            .insert(tagsToInsert)
        }

        router.push('/dashboard/customers')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('고객 정보 수정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleTagInputChange = (value: string) => {
    setTagInput(value)
    const parsed = parseTags(value)
    setFormData(prev => ({ ...prev, tags: parsed }))
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }))
    const remaining = formData.tags?.filter(tag => tag !== tagToRemove) || []
    setTagInput(remaining.map(t => t.replace(/^#/, '')).join(', '))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
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
            <h1 className="text-xl font-semibold text-gray-900">고객 수정</h1>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* 이름 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 전화번호 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                전화번호 <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 그룹 선택 */}
            <div>
              <label htmlFor="group_id" className="block text-sm font-medium text-gray-700 mb-2">
                소속 그룹 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, group_id: group.id }))}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      formData.group_id === group.id
                        ? 'text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                    style={{
                      backgroundColor: formData.group_id === group.id ? group.color : undefined,
                    }}
                  >
                    {group.name}
                  </button>
                ))}
                <Link
                  href="/dashboard/customers/groups"
                  className="px-4 py-2 border border-dashed border-gray-300 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  + 그룹 추가
                </Link>
              </div>
            </div>

            {/* 태그 */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                태그
              </label>
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="골프, 분당, 까칠함 (쉼표로 구분)"
              />
              {formData.tags && formData.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 생일 */}
            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-2">
                생일
              </label>
              <input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 기념일 */}
            <div>
              <label htmlFor="anniversary" className="block text-sm font-medium text-gray-700 mb-2">
                기념일
              </label>
              <input
                id="anniversary"
                type="date"
                value={formData.anniversary}
                onChange={(e) => setFormData(prev => ({ ...prev, anniversary: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 주소 */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                주소 <span className="text-xs text-gray-500">(AI 참고용)</span>
              </label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="서울시 강남구..."
              />
            </div>

            {/* 직업 */}
            <div>
              <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-2">
                직업 <span className="text-xs text-gray-500">(AI 참고용)</span>
              </label>
              <input
                id="occupation"
                type="text"
                value={formData.occupation}
                onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="회사원, 자영업, 의사 등"
              />
            </div>

            {/* 나이 및 출생년도 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                  나이 <span className="text-xs text-gray-500">(AI 참고용)</span>
                </label>
                <input
                  id="age"
                  type="number"
                  min="0"
                  max="150"
                  value={formData.age || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="30"
                />
              </div>
              <div>
                <label htmlFor="birth_year" className="block text-sm font-medium text-gray-700 mb-2">
                  출생년도
                </label>
                <input
                  id="birth_year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.birth_year || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, birth_year: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1990"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 -mt-2">
              생일을 입력하면 자동으로 계산되지만, 생일이 없을 때는 출생년도로 나이를 계산할 수 있습니다.
            </p>

            {/* 메모 */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                메모
              </label>
              <textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="추가 정보나 특이사항을 입력하세요"
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving || !formData.group_id}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <Link
                href="/dashboard/customers"
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                취소
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
