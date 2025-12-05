'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import type { Customer } from '@/lib/types/customer'

interface CustomerPickerProps {
  selectedCustomers: string[]
  onSelect: (customerIds: string[]) => void
  onClose: () => void
}

export default function CustomerPicker({
  selectedCustomers,
  onSelect,
  onClose,
}: CustomerPickerProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string[]>(selectedCustomers)

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    setSelected(selectedCustomers)
  }, [selectedCustomers])

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      setFilteredCustomers(
        customers.filter(
          c =>
            c.name.toLowerCase().includes(query) ||
            c.phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
        )
      )
    } else {
      setFilteredCustomers(customers)
    }
  }, [searchQuery, customers])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      if (!user) return

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading customers:', error)
      } else {
        setCustomers(data || [])
        setFilteredCustomers(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCustomer = (customerId: string) => {
    setSelected(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const handleSelectAll = () => {
    if (selected.length === filteredCustomers.length) {
      setSelected([])
    } else {
      setSelected(filteredCustomers.map(c => c.id))
    }
  }

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">고객 선택</h2>
            <p className="text-sm text-gray-500 mt-1">
              {selected.length}명 선택됨 / 전체 {customers.length}명
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 검색 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="고객 이름 또는 전화번호로 검색..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 고객 목록 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? '검색 결과가 없습니다.' : '고객이 없습니다.'}
            </div>
          ) : (
            <div className="space-y-2">
              {/* 전체 선택 */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded w-5 h-5"
                  />
                  <span className="font-semibold text-gray-900">
                    전체 선택 ({filteredCustomers.length}명)
                  </span>
                </label>
              </div>

              {/* 고객 목록 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredCustomers.map((customer) => (
                  <label
                    key={customer.id}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      selected.includes(customer.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(customer.id)}
                      onChange={() => toggleCustomer(customer.id)}
                      className="rounded w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">{formatPhone(customer.phone)}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selected.length}명 선택됨
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => {
                onSelect(selected)
                onClose()
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              선택 완료 ({selected.length}명)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

