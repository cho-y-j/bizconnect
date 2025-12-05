'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import type { CustomerGroup } from '@/lib/types/customer'

export function useCustomerGroups() {
  const [groups, setGroups] = useState<CustomerGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadGroups = async () => {
    try {
      setLoading(true)
      setError(null)
      const user = await getCurrentUser()
      if (!user) return

      const { data, error: fetchError } = await supabase
        .from('customer_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setGroups(data || [])
        
        // 그룹이 없으면 기본 그룹 생성
        if (data && data.length === 0) {
          await createDefaultGroups(user.id)
        }
      }
    } catch (err) {
      console.error('Error loading groups:', err)
      setError('그룹을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const createDefaultGroups = async (userId: string) => {
    const defaultGroups = [
      { name: '기본', color: '#6B7280', sort_order: 0 },
      { name: 'VIP 고객', color: '#EF4444', sort_order: 1 },
      { name: '거래처', color: '#3B82F6', sort_order: 2 },
      { name: '잠재 고객', color: '#10B981', sort_order: 3 },
    ]

    const { error } = await supabase
      .from('customer_groups')
      .insert(defaultGroups.map(g => ({ ...g, user_id: userId })))

    if (!error) {
      loadGroups()
    }
  }

  const createGroup = async (name: string, color: string) => {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      const { data, error: createError } = await supabase
        .from('customer_groups')
        .insert([{
          user_id: user.id,
          name: name.trim(),
          color,
          sort_order: groups.length,
        }])
        .select()
        .single()

      if (createError) {
        if (createError.code === '23505') {
          throw new Error('이미 존재하는 그룹명입니다.')
        }
        throw new Error(createError.message)
      }

      await loadGroups()
      return data
    } catch (err) {
      console.error('Error creating group:', err)
      throw err
    }
  }

  const updateGroup = async (id: string, updates: { name?: string; color?: string; sort_order?: number }) => {
    try {
      const { error: updateError } = await supabase
        .from('customer_groups')
        .update(updates)
        .eq('id', id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      await loadGroups()
    } catch (err) {
      console.error('Error updating group:', err)
      throw err
    }
  }

  const deleteGroup = async (id: string) => {
    try {
      // 그룹에 속한 고객이 있는지 확인
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .eq('group_id', id)
        .limit(1)

      if (customers && customers.length > 0) {
        throw new Error('이 그룹에 속한 고객이 있어 삭제할 수 없습니다. 먼저 고객을 다른 그룹으로 이동하세요.')
      }

      const { error: deleteError } = await supabase
        .from('customer_groups')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      await loadGroups()
    } catch (err) {
      console.error('Error deleting group:', err)
      throw err
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])

  return {
    groups,
    loading,
    error,
    loadGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  }
}

