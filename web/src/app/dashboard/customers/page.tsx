'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import { useCustomerGroups } from '@/lib/hooks/useCustomerGroups'
import type { Customer, CustomerTag } from '@/lib/types/customer'
import { parseTags, tagsToText } from '@/lib/utils/tagParser'

export default function CustomersPage() {
  const router = useRouter()
  const { groups, loading: groupsLoading } = useCustomerGroups()
  const [customers, setCustomers] = useState<(Customer & { tags?: CustomerTag[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | 'all'>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20
  
  // 선택된 고객 및 필터링
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [filterBirthday, setFilterBirthday] = useState<'all' | 'today' | 'this_week' | 'this_month'>('all')

  useEffect(() => {
    checkAuth()
    loadCustomers()
    loadAvailableTags()
  }, [currentPage, selectedGroupId, searchQuery, selectedTags, filterBirthday])

  const checkAuth = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/auth/login')
    }
  }

  const loadAvailableTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 고객의 모든 태그 조회
      // 먼저 고객 ID 배열 가져오기
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)

      if (!customers || customers.length === 0) {
        setAvailableTags([])
        return
      }

      const customerIds = customers.map(c => c.id)

      const { data: tags } = await supabase
        .from('customer_tags')
        .select('tag_name')
        .in('customer_id', customerIds)

      if (tags) {
        const uniqueTags = [...new Set(tags.map(t => t.tag_name))]
        setAvailableTags(uniqueTags.sort())
      }
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const { data: { user } = {} } = await supabase.auth.getUser()
      if (!user) return

      // 기본 쿼리
      let query = supabase
        .from('customers')
        .select(`
          *,
          group:customer_groups(*),
          tags:customer_tags(*)
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // 그룹 필터
      if (selectedGroupId !== 'all') {
        query = query.eq('group_id', selectedGroupId)
      }

      // 검색 필터
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      }

      // 태그 필터
      if (selectedTags.length > 0) {
        // 먼저 사용자의 고객 ID 배열 가져오기
        const { data: userCustomers } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)

        if (!userCustomers || userCustomers.length === 0) {
          setCustomers([])
          setTotalCount(0)
          setLoading(false)
          return
        }

        const userCustomerIds = userCustomers.map(c => c.id)

        // 태그가 있는 고객만 필터링
        const { data: customerIds } = await supabase
          .from('customer_tags')
          .select('customer_id')
          .in('tag_name', selectedTags)
          .in('customer_id', userCustomerIds)

        if (customerIds && customerIds.length > 0) {
          const ids = [...new Set(customerIds.map(c => c.customer_id))]
          query = query.in('id', ids)
        } else {
          // 태그가 없으면 빈 결과
          setCustomers([])
          setTotalCount(0)
          setLoading(false)
          return
        }
      }

      // 생일 필터
      if (filterBirthday !== 'all') {
        const range = getBirthdayFilterRange()
        if (range) {
          // 모든 고객을 가져온 후 클라이언트 사이드에서 필터링
          // (PostgreSQL의 날짜 필터링은 복잡하므로)
        }
      }

      // 페이지네이션
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error loading customers:', error)
      } else {
        let filteredData = data || []
        
        // 생일 필터 적용 (클라이언트 사이드)
        if (filterBirthday !== 'all' && data) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          filteredData = data.filter(customer => {
            if (!customer.birthday) return false
            const birthDate = new Date(customer.birthday)
            const birthMonth = birthDate.getMonth()
            const birthDay = birthDate.getDate()
            const currentMonth = today.getMonth()
            const currentDay = today.getDate()
            
            switch (filterBirthday) {
              case 'today':
                return birthMonth === currentMonth && birthDay === currentDay
              case 'this_week': {
                const dayOfWeek = today.getDay()
                const weekStart = new Date(today)
                weekStart.setDate(today.getDate() - dayOfWeek)
                const weekEnd = new Date(weekStart)
                weekEnd.setDate(weekStart.getDate() + 6)
                
                // 올해 생일 날짜
                const thisYearBirthday = new Date(today.getFullYear(), birthMonth, birthDay)
                return thisYearBirthday >= weekStart && thisYearBirthday <= weekEnd
              }
              case 'this_month':
                return birthMonth === currentMonth
              default:
                return true
            }
          })
        }
        
        setCustomers(filteredData)
        setTotalCount(filteredData.length)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 고객을 삭제하시겠습니까?`)) {
      return
    }

    try {
      // 태그 먼저 삭제
      await supabase
        .from('customer_tags')
        .delete()
        .eq('customer_id', id)

      // 고객 삭제
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) {
        alert('삭제 중 오류가 발생했습니다: ' + error.message)
      } else {
        loadCustomers()
        loadAvailableTags()
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ko-KR')
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
    setCurrentPage(1)
  }

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const handleBulkSend = () => {
    if (selectedCustomers.length === 0) return
    const customerIds = selectedCustomers.join(',')
    router.push(`/dashboard/send?customerIds=${customerIds}`)
  }

  const handleQuickGroupChange = async (customerId: string, groupId: string | null) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ group_id: groupId })
        .eq('id', customerId)

      if (error) {
        alert('그룹 변경 중 오류가 발생했습니다: ' + error.message)
      } else {
        loadCustomers()
      }
    } catch (error) {
      console.error('Error updating group:', error)
      alert('그룹 변경 중 오류가 발생했습니다.')
    }
  }

  const handleBulkGroupChange = async (groupId: string | null) => {
    if (selectedCustomers.length === 0) {
      alert('고객을 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedCustomers.length}명의 고객을 ${groupId ? groups.find(g => g.id === groupId)?.name : '미분류'}로 변경하시겠습니까?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update({ group_id: groupId })
        .in('id', selectedCustomers)

      if (error) {
        alert('그룹 변경 중 오류가 발생했습니다: ' + error.message)
      } else {
        loadCustomers()
        setSelectedCustomers([])
      }
    } catch (error) {
      console.error('Error updating groups:', error)
      alert('그룹 변경 중 오류가 발생했습니다.')
    }
  }

  const handleQuickTagAdd = async (customerId: string, tagName: string) => {
    try {
      // 기존 태그 확인
      const { data: existingTags } = await supabase
        .from('customer_tags')
        .select('*')
        .eq('customer_id', customerId)
        .eq('tag_name', tagName)

      if (existingTags && existingTags.length > 0) {
        // 이미 존재하는 태그
        return
      }

      // 새 태그 추가
      const { error } = await supabase
        .from('customer_tags')
        .insert({
          customer_id: customerId,
          tag_name: tagName,
        })

      if (error) {
        alert('태그 추가 중 오류가 발생했습니다: ' + error.message)
      } else {
        loadCustomers()
        loadAvailableTags()
      }
    } catch (error) {
      console.error('Error adding tag:', error)
      alert('태그 추가 중 오류가 발생했습니다.')
    }
  }

  const handleQuickTagRemove = async (customerId: string, tagName: string) => {
    try {
      const { error } = await supabase
        .from('customer_tags')
        .delete()
        .eq('customer_id', customerId)
        .eq('tag_name', tagName)

      if (error) {
        alert('태그 삭제 중 오류가 발생했습니다: ' + error.message)
      } else {
        loadCustomers()
        loadAvailableTags()
      }
    } catch (error) {
      console.error('Error removing tag:', error)
      alert('태그 삭제 중 오류가 발생했습니다.')
    }
  }

  const isTodayBirthday = (birthday: string | null | undefined): boolean => {
    if (!birthday) return false
    const today = new Date()
    const birthDate = new Date(birthday)
    return birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate()
  }

  const getBirthdayFilterRange = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    switch (filterBirthday) {
      case 'today': {
        const end = new Date(today)
        end.setHours(23, 59, 59, 999)
        return { start: today, end }
      }
      case 'this_week': {
        const start = new Date(today)
        const dayOfWeek = start.getDay()
        start.setDate(start.getDate() - dayOfWeek) // 이번 주 월요일
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      }
      case 'this_month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      }
      default:
        return null
    }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  return (
    <div>
      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">고객 관리</h1>
            <p className="text-sm sm:text-base text-slate-600">고객 정보를 관리하고 그룹별로 분류합니다</p>
          </div>
          <Link
            href="/dashboard/customers/new"
            className="px-5 py-2.5 bg-slate-900 !text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm hover:shadow-md font-semibold text-sm sm:text-base whitespace-nowrap"
          >
            + 고객 추가
          </Link>
        </div>
        {/* 선택된 고객 액션 바 */}
        {selectedCustomers.length > 0 && (
          <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedCustomers.length}명 선택됨
              </span>
              <button
                onClick={() => setSelectedCustomers([])}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                선택 해제
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleBulkSend}
                className="px-5 py-2.5 bg-slate-900 !text-white rounded-xl hover:bg-slate-800 transition-all font-semibold text-sm shadow-sm hover:shadow-md"
              >
                선택한 고객에게 문자 보내기
              </button>
              {/* 일괄 그룹 변경 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">그룹:</span>
                <select
                  onChange={(e) => handleBulkGroupChange(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  defaultValue=""
                >
                  <option value="">그룹 선택...</option>
                  <option value="">미분류</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        {/* 그룹 탭 */}
        {!groupsLoading && groups.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => {
                setSelectedGroupId('all')
                setCurrentPage(1)
              }}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all text-sm ${
                selectedGroupId === 'all'
                  ? 'bg-slate-900 !text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              전체
            </button>
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedGroupId(group.id)
                  setCurrentPage(1)
                }}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all text-sm ${
                  selectedGroupId === group.id
                    ? 'bg-slate-900 !text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                style={{
                  backgroundColor: selectedGroupId === group.id ? group.color : undefined,
                }}
              >
                {group.name}
              </button>
            ))}
          </div>
        )}

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* 검색 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="이름 또는 전화번호로 검색"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 생일 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                생일 필터
              </label>
              <select
                value={filterBirthday}
                onChange={(e) => {
                  setFilterBirthday(e.target.value as any)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">전체</option>
                <option value="today">오늘 생일</option>
                <option value="this_week">이번 주 생일</option>
                <option value="this_month">이번 달 생일</option>
              </select>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* 그룹 관리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                그룹 관리
              </label>
              <Link
                href="/dashboard/customers/groups"
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-center text-gray-700"
              >
                그룹 설정
              </Link>
            </div>
          </div>

          {/* 태그 필터 */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                태그 필터
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-slate-900 !text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CSV 업로드 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link
              href="/dashboard/customers/upload"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              CSV 파일로 일괄 등록하기
            </Link>
          </div>
        </div>

        {/* 고객 목록 */}
        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500 mb-4">
              {selectedGroupId !== 'all' || selectedTags.length > 0 || searchQuery
                ? '조건에 맞는 고객이 없습니다.'
                : '등록된 고객이 없습니다.'}
            </p>
            <Link
              href="/dashboard/customers/new"
              className="inline-block px-6 py-3 bg-slate-900 !text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm hover:shadow-md font-semibold text-sm"
            >
              첫 고객 추가하기
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.length > 0 && selectedCustomers.length === customers.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomers(customers.map(c => c.id))
                          } else {
                            setSelectedCustomers([])
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      전화번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      그룹
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      태그
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      생일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      기념일
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr 
                      key={customer.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => toggleCustomer(customer.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600 hover:text-blue-900">
                          {customer.name}
                          {isTodayBirthday(customer.birthday) && (
                            <span className="ml-2 text-xs text-pink-600 font-semibold">오늘 생일</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatPhone(customer.phone)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={customer.group_id || ''}
                          onChange={(e) => handleQuickGroupChange(customer.id, e.target.value || null)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                          style={customer.group ? { backgroundColor: customer.group.color, color: 'white', borderColor: customer.group.color } : {}}
                        >
                          <option value="">미분류</option>
                          {groups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1 items-center">
                          {customer.tags && customer.tags.length > 0 ? (
                            customer.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 flex items-center gap-1"
                              >
                                {tag.tag_name}
                                <button
                                  onClick={() => handleQuickTagRemove(customer.id, tag.tag_name)}
                                  className="text-red-600 hover:text-red-800"
                                  title="태그 제거"
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          {/* 빠른 태그 추가 */}
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleQuickTagAdd(customer.id, e.target.value)
                                e.target.value = ''
                              }
                            }}
                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-50"
                            title="태그 추가"
                          >
                            <option value="">+ 태그</option>
                            {availableTags.filter(tag => !customer.tags?.some(ct => ct.tag_name === tag)).map((tag) => (
                              <option key={tag} value={tag}>
                                {tag}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(customer.birthday)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(customer.anniversary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/dashboard/send?customerId=${customer.id}`}
                            className="px-4 py-2 bg-slate-900 !text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-medium shadow-sm"
                          >
                            문자
                          </Link>
                          <Link
                            href={`/dashboard/customers/${customer.id}/edit`}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all text-sm font-medium"
                          >
                            수정
                          </Link>
                          <button
                            onClick={() => handleDelete(customer.id, customer.name)}
                            className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl hover:bg-red-100 transition-all text-sm font-medium"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  이전
                </button>
                <span className="px-4 py-2 text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  다음
                </button>
              </div>
            )}

            {/* 통계 */}
            <div className="mt-6 text-sm text-gray-600 text-center">
              총 {totalCount}명의 고객
              {selectedGroup && ` (${selectedGroup.name} 그룹)`}
              {selectedTags.length > 0 && ` (태그: ${selectedTags.join(', ')})`}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
