import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import type { MessageTemplate, TemplateFormData } from '@/lib/types/template'

interface UseMessageTemplatesResult {
  templates: MessageTemplate[]
  loading: boolean
  error: string | null
  fetchTemplates: () => Promise<void>
  addTemplate: (data: TemplateFormData) => Promise<MessageTemplate | null>
  updateTemplate: (id: string, data: TemplateFormData) => Promise<MessageTemplate | null>
  deleteTemplate: (id: string) => Promise<boolean>
  incrementUsage: (id: string) => Promise<void>
}

export function useMessageTemplates(): UseMessageTemplatesResult {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('로그인이 필요합니다.')
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }
      setTemplates(data || [])
    } catch (err: any) {
      console.error('Error fetching templates:', err)
      setError(err.message || '템플릿을 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const addTemplate = async (data: TemplateFormData): Promise<MessageTemplate | null> => {
    setError(null)
    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('로그인이 필요합니다.')
        return null
      }

      // 변수 추출
      const { extractVariables } = await import('@/lib/utils/templateParser')
      const variables = extractVariables(data.content)

      const { data: newTemplate, error: insertError } = await supabase
        .from('message_templates')
        .insert({
          user_id: user.id,
          name: data.name,
          content: data.content,
          category: data.category,
          variables,
          is_favorite: data.is_favorite,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }
      setTemplates(prev => [newTemplate, ...prev])
      return newTemplate
    } catch (err: any) {
      console.error('Error adding template:', err)
      setError(err.message || '템플릿 추가에 실패했습니다.')
      return null
    }
  }

  const updateTemplate = async (id: string, data: TemplateFormData): Promise<MessageTemplate | null> => {
    setError(null)
    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('로그인이 필요합니다.')
        return null
      }

      // 변수 추출
      const { extractVariables } = await import('@/lib/utils/templateParser')
      const variables = extractVariables(data.content)

      const { data: updatedTemplate, error: updateError } = await supabase
        .from('message_templates')
        .update({
          name: data.name,
          content: data.content,
          category: data.category,
          variables,
          is_favorite: data.is_favorite,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }
      setTemplates(prev => prev.map(t => (t.id === id ? updatedTemplate : t)))
      return updatedTemplate
    } catch (err: any) {
      console.error('Error updating template:', err)
      setError(err.message || '템플릿 수정에 실패했습니다.')
      return null
    }
  }

  const deleteTemplate = async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('로그인이 필요합니다.')
        return false
      }

      const { error: deleteError } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (deleteError) {
        throw deleteError
      }
      setTemplates(prev => prev.filter(t => t.id !== id))
      return true
    } catch (err: any) {
      console.error('Error deleting template:', err)
      setError(err.message || '템플릿 삭제에 실패했습니다.')
      return false
    }
  }

  const incrementUsage = async (id: string): Promise<void> => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const { error } = await supabase.rpc('increment_template_usage', { template_id: id })
      if (error) {
        // RPC 함수가 없을 수 있으므로 직접 업데이트
        const { data: template } = await supabase
          .from('message_templates')
          .select('usage_count')
          .eq('id', id)
          .single()

        if (template) {
          await supabase
            .from('message_templates')
            .update({ usage_count: (template.usage_count || 0) + 1 })
            .eq('id', id)
        }
      } else {
        // 사용 횟수 업데이트 후 목록 새로고침
        fetchTemplates()
      }
    } catch (err) {
      console.error('Error incrementing usage:', err)
    }
  }

  return { templates, loading, error, fetchTemplates, addTemplate, updateTemplate, deleteTemplate, incrementUsage }
}

