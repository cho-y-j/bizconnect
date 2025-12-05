'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import { useCustomerGroups } from '@/lib/hooks/useCustomerGroups'
import { parseTags } from '@/lib/utils/tagParser'
import type { CustomerFormData } from '@/lib/types/customer'

export default function NewCustomerPage() {
  const router = useRouter()
  const { groups, loading: groupsLoading } = useCustomerGroups()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    group_id: null,
    birthday: '',
    anniversary: '',
    tags: [],
    notes: '',
    address: '',
    occupation: '',
    age: null,
    birth_year: null,
  })
  const [tagInput, setTagInput] = useState('') // 태그 입력 필드

  useEffect(() => {
    // 기본 그룹 선택 (첫 번째 그룹)
    if (groups.length > 0 && !formData.group_id) {
      setFormData(prev => ({ ...prev, group_id: groups[0].id }))
    }
  }, [groups])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // 그룹 필수 체크
      if (!formData.group_id) {
        setError('그룹을 선택해주세요.')
        setLoading(false)
        return
      }

      // 전화번호 정규화
      const normalizedPhone = formData.phone.replace(/\D/g, '')

      if (normalizedPhone.length < 10) {
        setError('전화번호를 올바르게 입력해주세요.')
        setLoading(false)
        return
      }

      // 고객 생성
      const { data: customer, error: insertError } = await supabase
        .from('customers')
        .insert([
          {
            user_id: user.id,
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
          },
        ])
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          setError('이미 등록된 전화번호입니다.')
        } else {
          setError('고객 추가 중 오류가 발생했습니다: ' + insertError.message)
        }
      } else if (customer) {
        // 태그 추가
        if (formData.tags && formData.tags.length > 0) {
          const tagsToInsert = formData.tags.map(tag => ({
            customer_id: customer.id,
            tag_name: tag,
          }))

          const { error: tagError } = await supabase
            .from('customer_tags')
            .insert(tagsToInsert)

          if (tagError) {
            console.warn('태그 추가 실패:', tagError)
            // 태그 실패해도 고객은 생성되었으므로 계속 진행
          }
        }

        router.push('/dashboard/customers')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('고객 추가 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleTagInputChange = (value: string) => {
    setTagInput(value)
    // 실시간으로 태그 파싱
    const parsed = parseTags(value)
    setFormData(prev => ({ ...prev, tags: parsed }))
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }))
    // 입력 필드도 업데이트
    const remaining = formData.tags?.filter(tag => tag !== tagToRemove) || []
    setTagInput(remaining.map(t => t.replace(/^#/, '')).join(', '))
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
            <h1 className="text-xl font-semibold text-gray-900">고객 추가</h1>
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
                placeholder="홍길동"
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
                placeholder="010-1234-5678"
              />
              <p className="mt-1 text-xs text-gray-500">
                하이픈(-) 없이 입력해도 됩니다
              </p>
            </div>

            {/* 그룹 선택 */}
            <div>
              <label htmlFor="group_id" className="block text-sm font-medium text-gray-700 mb-2">
                소속 그룹 <span className="text-red-500">*</span>
              </label>
              {groupsLoading ? (
                <div className="text-sm text-gray-500">그룹 로딩 중...</div>
              ) : groups.length === 0 ? (
                <div className="text-sm text-gray-500 mb-2">
                  그룹이 없습니다.{' '}
                  <Link href="/dashboard/customers/groups" className="text-blue-600 hover:text-blue-700">
                    그룹 만들기
                  </Link>
                </div>
              ) : (
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
              )}
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
              <p className="mt-1 text-xs text-gray-500">
                쉼표로 구분하여 입력하세요. 자동으로 #태그로 변환됩니다.
              </p>
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
              <p className="mt-1 text-xs text-gray-500">
                결혼기념일, 계약일 등 원하는 날짜를 입력하세요
              </p>
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
            <p className="text-xs text-gray-500 -mt-2">
              💡 생일을 입력하면 자동으로 계산되지만, 생일이 없을 때는 출생년도로 나이를 계산할 수 있습니다.
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
                disabled={loading || !formData.group_id}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '저장 중...' : '저장'}
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
