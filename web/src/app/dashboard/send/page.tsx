'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'
import { useCustomerGroups } from '@/lib/hooks/useCustomerGroups'
import { useMessageTemplates } from '@/lib/hooks/useMessageTemplates'
import { replaceTemplateVariables } from '@/lib/utils/templateParser'
import AIMessageSuggestions from '@/components/AIMessageSuggestions'
import ConversationSummary from '@/components/ConversationSummary'
import EmojiPicker from '@/components/EmojiPicker'
import CustomerPicker from '@/components/CustomerPicker'
import type { Customer } from '@/lib/types/customer'
import type { MessageTemplate } from '@/lib/types/template'
import { AVAILABLE_VARIABLES } from '@/lib/types/template'

type SendMode = 'single' | 'multiple' | 'group' | 'tag' | 'csv'

export default function SendSMSPage() {
  const router = useRouter()
  const { groups } = useCustomerGroups()
  const { templates } = useMessageTemplates()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 발송 모드
  const [sendMode, setSendMode] = useState<SendMode>('single')
  
  // 단건 발송
  const [singlePhone, setSinglePhone] = useState('')
  const [singleName, setSingleName] = useState('')
  
  // 다중 발송
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customersLoading, setCustomersLoading] = useState(false)
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  
  // CSV 발송
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<Array<{ name: string; phone: string; message?: string }>>([])
  const [csvPreview, setCsvPreview] = useState<Array<{ name: string; phone: string; message?: string }>>([])
  
  // 그룹/태그 발송
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  
  // 템플릿
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  
  // 메시지
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState('')
  
  // 예약 발송
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  
  // AI 추천
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [aiCustomerId, setAiCustomerId] = useState<string | undefined>()
  const [aiCustomerPhone, setAiCustomerPhone] = useState<string | undefined>()
  const [aiCustomerName, setAiCustomerName] = useState<string | undefined>()
  
  // 요약 정보 (문자 보낼 때 참고용)
  const [summaryInfo, setSummaryInfo] = useState<any>(null)
  const [showSummary, setShowSummary] = useState(false)
  
  // 이미지 첨부
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string; previewUrl?: string } | null>(null)
  const [savedImages, setSavedImages] = useState<any[]>([])
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingBusinessCard, setUploadingBusinessCard] = useState(false)
  const [attachBusinessCard, setAttachBusinessCard] = useState(false)
  const [userSettings, setUserSettings] = useState<any>(null)
  const [showBusinessCardUpload, setShowBusinessCardUpload] = useState(false)
  
  // 이모티콘
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  useEffect(() => {
    checkAuth()
    if (sendMode === 'multiple') {
      loadCustomers()
    }
    if (sendMode === 'tag') {
      loadAvailableTags()
    }
    if (sendMode === 'csv') {
      setCsvData([])
      setCsvPreview([])
      setCsvFile(null)
    }
    loadSavedImages()
    loadUserSettings()
    
    // URL 파라미터에서 customerId 확인
    const urlParams = new URLSearchParams(window.location.search)
    const customerIdParam = urlParams.get('customerId')
    const customerIdsParam = urlParams.get('customerIds')
    const autoSchedule = urlParams.get('autoSchedule') // 'birthday' or 'anniversary'
    const taskIdParam = urlParams.get('taskId')
    const phoneParam = urlParams.get('phone')
    const nameParam = urlParams.get('name')
    const messageParam = urlParams.get('message')
    
    if (taskIdParam && phoneParam) {
      // 작업에서 온 경우 - 전화번호와 이름, 메시지 미리 채우기
      setSendMode('single')
      setSinglePhone(decodeURIComponent(phoneParam))
      setSingleName(decodeURIComponent(nameParam || ''))
      if (messageParam) {
        setMessage(decodeURIComponent(messageParam))
      }
      // 전화번호로 고객 찾기
      loadCustomerByPhone(decodeURIComponent(phoneParam))
    } else if (customerIdParam) {
      // 고객 정보 로드 및 단건 발송 모드로 설정
      loadCustomerForSend(customerIdParam)
      loadSummaryForCustomer(customerIdParam)
      
      // 자동 발송 예약 처리
      if (autoSchedule === 'birthday' || autoSchedule === 'anniversary') {
        handleAutoSchedule(customerIdParam, autoSchedule)
      }
    } else if (customerIdsParam) {
      // 여러 고객 선택된 경우
      const ids = customerIdsParam.split(',').filter(Boolean)
      if (ids.length > 0) {
        setSendMode('multiple')
        setSelectedCustomers(ids)
        loadCustomers()
      }
    }
  }, [sendMode])

  // 고객 검색 필터링
  useEffect(() => {
    if (customerSearchQuery.trim()) {
      const query = customerSearchQuery.toLowerCase()
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
  }, [customerSearchQuery, customers])

  // 템플릿 선택 시 메시지 자동 입력
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (template) {
        setMessage(template.content)
      }
    }
  }, [selectedTemplateId, templates])

  // 고객 검색 필터링
  useEffect(() => {
    if (customerSearchQuery.trim()) {
      const query = customerSearchQuery.toLowerCase()
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
  }, [customerSearchQuery, customers])

  const checkAuth = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/auth/login')
    }
  }

  const loadCustomerForSend = async (customerId: string) => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('user_id', user.id)
        .single()

      if (customer) {
        setSendMode('single')
        setSingleName(customer.name)
        setSinglePhone(customer.phone)
        setAiCustomerId(customer.id)
        setAiCustomerPhone(customer.phone)
        setAiCustomerName(customer.name)
      }
    } catch (error) {
      console.error('Error loading customer:', error)
    }
  }

  const loadSummaryForCustomer = async (customerId: string) => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const { data: summary } = await supabase
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('customer_id', customerId)
        .single()

      if (summary) {
        setSummaryInfo(summary)
      }
    } catch (error) {
      // 요약이 없어도 괜찮음
    }
  }

  const loadCustomerByPhone = async (phone: string) => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      // 전화번호 정규화 (하이픈 제거)
      const normalizedPhone = phone.replace(/\D/g, '')

      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)

      if (customers) {
        // 전화번호로 고객 찾기 (정규화된 번호로 비교)
        const customer = customers.find(c => c.phone.replace(/\D/g, '') === normalizedPhone)
        if (customer) {
          setAiCustomerId(customer.id)
          setAiCustomerPhone(customer.phone)
          setAiCustomerName(customer.name)
          loadSummaryForCustomer(customer.id)
        }
      }
    } catch (error) {
      console.error('Error loading customer by phone:', error)
    }
  }

  const handleAutoSchedule = async (customerId: string, type: 'birthday' | 'anniversary') => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      // 고객 정보 로드
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('user_id', user.id)
        .single()

      if (!customer) {
        setError('고객 정보를 찾을 수 없습니다.')
        return
      }

      // 생일 또는 기념일 날짜 확인
      const eventDate = type === 'birthday' ? customer.birthday : customer.anniversary
      if (!eventDate) {
        setError(`${type === 'birthday' ? '생일' : '기념일'} 정보가 없습니다.`)
        return
      }

      // 올해의 생일/기념일 날짜 계산
      const eventDateObj = new Date(eventDate)
      const today = new Date()
      const thisYear = today.getFullYear()
      const thisYearEvent = new Date(thisYear, eventDateObj.getMonth(), eventDateObj.getDate())
      
      // 이미 지난 경우 내년으로 설정
      const targetDate = thisYearEvent < today 
        ? new Date(thisYear + 1, eventDateObj.getMonth(), eventDateObj.getDate())
        : thisYearEvent

      // 오전 9시로 설정
      targetDate.setHours(9, 0, 0, 0)

      // 예약 발송 활성화
      setIsScheduled(true)
      setScheduledDate(targetDate.toISOString().split('T')[0])
      setScheduledTime('09:00')

      // 기본 메시지 설정
      const defaultMessage = type === 'birthday'
        ? `${customer.name}님, 생일 축하합니다! 🎂 건강하고 행복한 한 해 되시길 바랍니다.`
        : `${customer.name}님, 기념일 축하합니다! 💝 오늘도 특별한 하루 되시길 바랍니다.`
      
      setMessage(defaultMessage)
      setSuccess(`${type === 'birthday' ? '생일' : '기념일'} 자동 발송이 예약되었습니다. (${targetDate.toLocaleDateString('ko-KR')} 오전 9시)`)
    } catch (error) {
      console.error('Error handling auto schedule:', error)
      setError('자동 발송 예약 중 오류가 발생했습니다.')
    }
  }

  const loadCustomers = async () => {
    try {
      setCustomersLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      setCustomers(data || [])
      setFilteredCustomers(data || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setCustomersLoading(false)
    }
  }

  const loadSavedImages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading images:', error)
      } else {
        setSavedImages(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // 이미지 URL을 Open Graph URL로 변환하는 헬퍼 함수
  const getPreviewUrl = async (imageUrl: string): Promise<string> => {
    if (!imageUrl) return imageUrl
    
    // 이미 Open Graph URL인 경우 그대로 반환
    if (imageUrl.includes('/preview/')) {
      return imageUrl
    }

    try {
      // user_images 테이블에서 이미지 URL로 ID 찾기
      const { data: image, error } = await supabase
        .from('user_images')
        .select('id')
        .eq('image_url', imageUrl)
        .single()

      if (error || !image) {
        // 찾을 수 없으면 원본 URL 반환
        console.warn('Image not found in user_images, using original URL:', imageUrl)
        return imageUrl
      }

      // Open Graph URL 생성 (API 라우트 사용 - 페이지 라우트가 작동하지 않을 때 대체)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconnect-ten.vercel.app'
      return `${baseUrl}/api/preview/${image.id}`
    } catch (error) {
      console.error('Error converting to preview URL:', error)
      return imageUrl
    }
  }

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)
      setError('')

      // Vercel 요청 크기 제한 (4.5MB) 체크
      const maxSize = 4.5 * 1024 * 1024 // 4.5MB
      if (file.size > maxSize) {
        setError('파일 크기는 4.5MB 이하여야 합니다. (Vercel 제한)')
        setUploadingImage(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('로그인이 필요합니다.')
        return
      }

      // 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('세션이 만료되었습니다.')
        return
      }

      // FormData 생성
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)
      formData.append('category', 'general')

      // API 호출
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        if (response.status === 413) {
          setError('파일 크기가 너무 큽니다. 4.5MB 이하의 파일을 업로드해주세요.')
          return
        }
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `서버 오류 (${response.status})` }
        }
        setError(errorData.error || '이미지 업로드 실패')
        return
      }

      const result = await response.json()

      if (result.success && result.image) {
        // 업로드된 이미지 선택 (Open Graph URL 저장, 미리보기는 원본 URL)
        const previewUrl = result.image.preview_url || result.image.image_url
        setSelectedImage({
          url: result.image.image_url, // 미리보기용 원본 URL
          name: result.image.name,
          previewUrl: previewUrl // 발송용 Open Graph URL
        })
        // 메시지에 Open Graph URL 자동 추가
        if (previewUrl) {
          const currentMessage = message.trim()
          // 이미 링크가 있으면 제거 후 새로 추가
          const messageWithoutLink = currentMessage.replace(/\s*https?:\/\/[^\s]+/g, '').trim()
          setMessage(messageWithoutLink ? `${messageWithoutLink}\n\n${previewUrl}` : previewUrl)
        }
        // 저장된 이미지 목록 새로고침
        await loadSavedImages()
        setSuccess('이미지가 업로드되었습니다.')
        setShowImagePicker(false) // 업로드 완료 후 선택기 닫기
      }
    } catch (error: any) {
      console.error('Image upload error:', error)
      setError('이미지 업로드 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const loadUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error loading user settings:', error)
      } else {
        setUserSettings(data)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    setError('')
    setCsvData([])
    setCsvPreview([])

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setError('CSV 파일에 헤더와 최소 1개의 데이터 행이 필요합니다.')
        return
      }

      // 헤더 파싱
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const requiredHeaders = ['name', 'phone']
      
      if (!requiredHeaders.every(h => headers.includes(h))) {
        setError(`CSV 파일에 필수 컬럼이 없습니다: ${requiredHeaders.join(', ')}`)
        return
      }

      // 데이터 파싱
      const rows: Array<{ name: string; phone: string; message?: string }> = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const row: { name: string; phone: string; message?: string } = {
          name: '',
          phone: '',
        }

        headers.forEach((header, index) => {
          const value = values[index] || ''
          if (header === 'name' || header === '이름') {
            row.name = value
          } else if (header === 'phone' || header === '전화번호' || header === 'phone_number') {
            row.phone = value.replace(/\D/g, '')
          } else if (header === 'message' || header === '메시지' || header === 'content') {
            row.message = value
          }
        })

        if (row.name && row.phone && row.phone.length >= 10) {
          rows.push(row)
        }
      }

      if (rows.length === 0) {
        setError('업로드할 유효한 데이터가 없습니다.')
        return
      }

      setCsvData(rows)
      setCsvPreview(rows.slice(0, 10)) // 처음 10개만 미리보기
      setSuccess(`${rows.length}개의 수신자가 준비되었습니다.`)
    } catch (err: any) {
      console.error('CSV 파싱 오류:', err)
      setError('CSV 파일을 읽는 중 오류가 발생했습니다: ' + err.message)
    }
  }

  const loadAvailableTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 먼저 사용자의 고객 ID 목록 가져오기
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)

      if (!customers || customers.length === 0) {
        setAvailableTags([])
        return
      }

      const customerIds = customers.map(c => c.id)

      // 고객 ID 목록으로 태그 조회
      const { data: tags, error } = await supabase
        .from('customer_tags')
        .select('tag_name')
        .in('customer_id', customerIds)

      if (error) {
        console.error('Error loading tags:', error)
        setAvailableTags([])
        return
      }

      if (tags && tags.length > 0) {
        const uniqueTags = [...new Set(tags.map(t => t.tag_name).filter(Boolean))]
        setAvailableTags(uniqueTags.sort())
      } else {
        setAvailableTags([])
      }
    } catch (error) {
      console.error('Error loading tags:', error)
      setAvailableTags([])
    }
  }

  const handlePreview = () => {
    if (!message.trim()) {
      setPreview('')
      return
    }

    // 미리보기용 고객 데이터 생성
    let previewCustomer: any = null
    if (sendMode === 'single' && singleName) {
      previewCustomer = { name: singleName, phone: singlePhone }
    } else if (sendMode === 'multiple' && selectedCustomers.length > 0) {
      const firstCustomer = customers.find(c => selectedCustomers.includes(c.id))
      if (firstCustomer) {
        previewCustomer = firstCustomer
      }
    }

    const previewText = replaceTemplateVariables(message, {
      customer: previewCustomer || undefined,
    })

    setPreview(previewText)
  }

  useEffect(() => {
    handlePreview()
  }, [message, singleName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      if (!message.trim()) {
        setError('메시지를 입력해주세요.')
        setLoading(false)
        return
      }

      // 예약 시간 계산
      let scheduledAt: string | null = null
      if (isScheduled && scheduledDate && scheduledTime) {
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
        if (scheduledDateTime > new Date()) {
          scheduledAt = scheduledDateTime.toISOString()
        } else {
          setError('예약 시간은 현재 시간 이후여야 합니다.')
          setLoading(false)
          return
        }
      }

      let tasksToCreate: any[] = []

      // 발송 모드에 따라 작업 생성
      if (sendMode === 'single') {
        // 단건 발송
        if (!singlePhone.trim()) {
          setError('전화번호를 입력해주세요.')
          setLoading(false)
          return
        }

        const normalizedPhone = singlePhone.replace(/\D/g, '')
        if (normalizedPhone.length < 10) {
          setError('전화번호를 올바르게 입력해주세요.')
          setLoading(false)
          return
        }

        // 이미지 URL 결정: previewUrl이 있으면 사용, 없으면 url 사용
        const finalImageUrl = selectedImage?.previewUrl || selectedImage?.url || null
        
        tasksToCreate.push({
          user_id: user.id,
          customer_phone: normalizedPhone,
          customer_name: singleName || null,
          message_content: replaceTemplateVariables(message.trim(), {
            customer: singleName ? { name: singleName, phone: normalizedPhone } : undefined,
          }),
          type: selectedImage ? 'send_mms' : 'send_sms',
          status: scheduledAt ? 'pending' : 'pending',
          priority: 0,
          scheduled_at: scheduledAt,
          template_id: selectedTemplateId || null,
          image_url: finalImageUrl, // Open Graph URL 사용
          image_name: selectedImage?.name || null,
          is_mms: !!selectedImage,
        })
      } else if (sendMode === 'multiple') {
        // 다중 발송
        if (selectedCustomers.length === 0) {
          setError('고객을 선택해주세요.')
          setLoading(false)
          return
        }

        const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id))
        
        // 고객 정보와 그룹/태그 정보를 함께 가져오기
        const customerIds = selectedCustomerData.map(c => c.id)
        const { data: customersWithDetails } = await supabase
          .from('customers')
          .select(`
            *,
            group:customer_groups(*),
            tags:customer_tags(tag_name)
          `)
          .in('id', customerIds)
          .eq('user_id', user.id)

        // 이미지 URL 결정: previewUrl이 있으면 사용, 없으면 url 사용
        const finalImageUrl = selectedImage?.previewUrl || selectedImage?.url || null
        
        tasksToCreate = (customersWithDetails || []).map(customer => ({
          user_id: user.id,
          customer_id: customer.id,
          customer_phone: customer.phone.replace(/\D/g, ''),
          customer_name: customer.name,
          message_content: replaceTemplateVariables(message.trim(), { customer }),
          type: selectedImage ? 'send_mms' : 'send_sms',
          status: 'pending',
          priority: 0,
          scheduled_at: scheduledAt,
          template_id: selectedTemplateId || null,
          image_url: finalImageUrl, // Open Graph URL 사용
          image_name: selectedImage?.name || null,
          is_mms: !!selectedImage,
        }))
      } else if (sendMode === 'group') {
        // 그룹별 발송
        if (!selectedGroupId) {
          setError('그룹을 선택해주세요.')
          setLoading(false)
          return
        }

        const { data: groupCustomers } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .eq('group_id', selectedGroupId)

        if (!groupCustomers || groupCustomers.length === 0) {
          setError('선택한 그룹에 고객이 없습니다.')
          setLoading(false)
          return
        }

        // 그룹 고객 정보와 그룹/태그 정보를 함께 가져오기
        const { data: groupCustomersWithDetails } = await supabase
          .from('customers')
          .select(`
            *,
            group:customer_groups(*),
            tags:customer_tags(tag_name)
          `)
          .eq('user_id', user.id)
          .eq('group_id', selectedGroupId)

        // 명함 이미지 결정 (Open Graph URL로 변환)
        let finalImage = selectedImage
        if (attachBusinessCard && userSettings?.business_card_image_url) {
          const previewUrl = await getPreviewUrl(userSettings.business_card_image_url)
          finalImage = { 
            url: userSettings.business_card_image_url, // 미리보기용 원본 URL
            name: '명함',
            previewUrl: previewUrl // 발송용 Open Graph URL
          }
        }
        
        // 이미지 URL 결정: previewUrl이 있으면 사용, 없으면 url 사용
        const finalImageUrl = finalImage?.previewUrl || finalImage?.url || null

        tasksToCreate = (groupCustomersWithDetails || []).map(customer => ({
          user_id: user.id,
          customer_id: customer.id,
          customer_phone: customer.phone.replace(/\D/g, ''),
          customer_name: customer.name,
          message_content: replaceTemplateVariables(message.trim(), { customer }),
          type: finalImage ? 'send_mms' : 'send_sms',
          status: 'pending',
          priority: 0,
          scheduled_at: scheduledAt,
          template_id: selectedTemplateId || null,
          image_url: finalImageUrl, // Open Graph URL 사용
          image_name: finalImage?.name || null,
          is_mms: !!finalImage,
        }))
      } else if (sendMode === 'tag') {
        // 태그별 발송
        if (selectedTags.length === 0) {
          setError('태그를 선택해주세요.')
          setLoading(false)
          return
        }

        // 태그가 있는 고객 조회
        const { data: customerTags } = await supabase
          .from('customer_tags')
          .select('customer_id')
          .in('tag_name', selectedTags)

        if (!customerTags || customerTags.length === 0) {
          setError('선택한 태그에 해당하는 고객이 없습니다.')
          setLoading(false)
          return
        }

        const uniqueCustomerIds = [...new Set(customerTags.map(t => t.customer_id))]
        const { data: tagCustomers } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .in('id', uniqueCustomerIds)

        if (!tagCustomers || tagCustomers.length === 0) {
          setError('고객 정보를 불러올 수 없습니다.')
          setLoading(false)
          return
        }

        // 태그 고객 정보와 그룹/태그 정보를 함께 가져오기
        const tagCustomerIds = tagCustomers.map(c => c.id)
        const { data: tagCustomersWithDetails } = await supabase
          .from('customers')
          .select(`
            *,
            group:customer_groups(*),
            tags:customer_tags(tag_name)
          `)
          .eq('user_id', user.id)
          .in('id', tagCustomerIds)

        // 명함 이미지 결정 (Open Graph URL로 변환)
        let finalImage = selectedImage
        if (attachBusinessCard && userSettings?.business_card_image_url) {
          const previewUrl = await getPreviewUrl(userSettings.business_card_image_url)
          finalImage = { 
            url: userSettings.business_card_image_url, // 미리보기용 원본 URL
            name: '명함',
            previewUrl: previewUrl // 발송용 Open Graph URL
          }
        }
        
        // 이미지 URL 결정: previewUrl이 있으면 사용, 없으면 url 사용
        const finalImageUrl = finalImage?.previewUrl || finalImage?.url || null

        tasksToCreate = (tagCustomersWithDetails || []).map(customer => ({
          user_id: user.id,
          customer_id: customer.id,
          customer_phone: customer.phone.replace(/\D/g, ''),
          customer_name: customer.name,
          message_content: replaceTemplateVariables(message.trim(), { customer }),
          type: finalImage ? 'send_mms' : 'send_sms',
          status: 'pending',
          priority: 0,
          scheduled_at: scheduledAt,
          template_id: selectedTemplateId || null,
          image_url: finalImageUrl, // Open Graph URL 사용
          image_name: finalImage?.name || null,
          is_mms: !!finalImage,
        }))
      } else if (sendMode === 'csv') {
        // CSV 발송
        if (csvData.length === 0) {
          setError('CSV 파일을 업로드해주세요.')
          setLoading(false)
          return
        }

        if (!message.trim() && csvData.every(row => !row.message)) {
          setError('메시지를 입력해주세요.')
          setLoading(false)
          return
        }

        // 명함 이미지 결정 (Open Graph URL로 변환)
        let finalImage = selectedImage
        if (attachBusinessCard && userSettings?.business_card_image_url) {
          const previewUrl = await getPreviewUrl(userSettings.business_card_image_url)
          finalImage = { 
            url: userSettings.business_card_image_url, // 미리보기용 원본 URL
            name: '명함',
            previewUrl: previewUrl // 발송용 Open Graph URL
          }
        }
        
        // 이미지 URL 결정: previewUrl이 있으면 사용, 없으면 url 사용
        const finalImageUrl = finalImage?.previewUrl || finalImage?.url || null

        // CSV 데이터로 작업 생성
        tasksToCreate = csvData.map(row => {
          // CSV에 메시지가 있으면 사용, 없으면 입력한 메시지 사용
          const finalMessage = row.message || message.trim()
          return {
            user_id: user.id,
            customer_id: null, // CSV는 고객 DB에 없을 수 있음
            customer_phone: row.phone.replace(/\D/g, ''),
            customer_name: row.name,
            message_content: replaceTemplateVariables(finalMessage, {
              customer: { name: row.name, phone: row.phone },
            }),
            type: finalImage ? 'send_mms' : 'send_sms',
            status: 'pending',
            priority: 0,
            scheduled_at: scheduledAt,
            template_id: selectedTemplateId || null,
            image_url: finalImageUrl, // Open Graph URL 사용
            image_name: finalImage?.name || null,
            is_mms: !!finalImage,
          }
        })
      }

      // tasks 테이블에 작업 생성
      console.log('📝 Creating tasks in database...', tasksToCreate.length, 'tasks')
      const { data: insertedTasks, error: insertError } = await supabase
        .from('tasks')
        .insert(tasksToCreate)
        .select()

      if (insertError) {
        console.error('❌ Failed to create tasks:', insertError)
        console.error('❌ Error code:', insertError.code)
        console.error('❌ Error message:', insertError.message)
        setError('작업 생성 중 오류가 발생했습니다: ' + insertError.message)
      } else if (insertedTasks && insertedTasks.length > 0) {
        // 작업 생성 성공 시 즉시 sms_logs에 'pending' 상태로 기록 생성
        // 실패해도 기록이 남도록 하기 위함
        try {
          const logsToCreate = insertedTasks.map(task => ({
            user_id: task.user_id,
            task_id: task.id,
            phone_number: task.customer_phone,
            message: task.message_content,
            status: 'pending', // pending → sent/failed로 업데이트됨
            sent_at: new Date().toISOString(),
            image_url: task.image_url || null, // Open Graph URL 저장
            is_mms: task.is_mms || false,
          }))

          const { data: insertedLogs, error: logError } = await supabase
            .from('sms_logs')
            .insert(logsToCreate)
            .select()

          if (logError) {
            console.error('❌ Failed to create SMS logs:', logError)
            console.error('❌ Error details:', JSON.stringify(logError, null, 2))
            console.error('❌ Error code:', logError.code)
            console.error('❌ Error message:', logError.message)
            console.error('❌ This means 발송 기록 will be empty!')
            // 사용자에게도 알림
            setError(`작업은 생성되었지만 발송 기록 생성 실패: ${logError.message}. Supabase SQL을 실행했는지 확인하세요.`)
            // 로그 생성 실패해도 작업은 생성되었으므로 계속 진행
          } else {
            console.log('✅ SMS logs created:', insertedLogs?.length || 0)
            console.log('✅ Log IDs:', insertedLogs?.map(log => log.id))
          }
        } catch (logErr: any) {
          console.error('❌ Exception creating SMS logs:', logErr)
          // 로그 생성 실패해도 작업은 생성되었으므로 계속 진행
        }
        if (scheduledAt) {
          const scheduledDate = new Date(scheduledAt)
          setSuccess(`${tasksToCreate.length}개의 발송 작업이 예약되었습니다. (${scheduledDate.toLocaleString('ko-KR')}에 발송 예정)`)
        } else {
          setSuccess(`${tasksToCreate.length}개의 문자를 발송했습니다. 모바일 앱에서 즉시 처리됩니다.`)
        }
        
        // 폼 초기화
        setSinglePhone('')
        setSingleName('')
        setSelectedCustomers([])
        setSelectedGroupId('')
        setSelectedTags([])
        setCsvData([])
        setCsvPreview([])
        setCsvFile(null)
        setMessage('')
        setPreview('')
        setIsScheduled(false)
        setScheduledDate('')
        setScheduledTime('')
        
        // 2초 후 대시보드로 이동
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('작업 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

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
              <h1 className="text-xl font-semibold text-gray-900">문자 보내기</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            {/* 발송 모드 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                발송 방식
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setSendMode('single')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    sendMode === 'single'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  단건 발송
                </button>
                <button
                  type="button"
                  onClick={() => setSendMode('multiple')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    sendMode === 'multiple'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  다중 발송
                </button>
                <button
                  type="button"
                  onClick={() => setSendMode('group')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    sendMode === 'group'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  그룹별
                </button>
                <button
                  type="button"
                  onClick={() => setSendMode('tag')}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    sendMode === 'tag'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  태그별
                </button>
              </div>
            </div>

            {/* 단건 발송 */}
            {sendMode === 'single' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전화번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={singlePhone}
                    onChange={(e) => setSinglePhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="010-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    고객명 (선택)
                  </label>
                  <input
                    type="text"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="홍길동"
                  />
                </div>
                
                {/* 요약 정보 표시 (참고용) */}
                {summaryInfo && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-blue-900">📋 이전 대화 요약 (참고용)</h4>
                      <Link
                        href={`/dashboard/customers/${aiCustomerId}`}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        전체 보기 →
                      </Link>
                    </div>
                    <p className="text-xs text-blue-800 line-clamp-2 mb-2">{summaryInfo.summary}</p>
                    {summaryInfo.next_actions && summaryInfo.next_actions.length > 0 && (
                      <div className="text-xs text-blue-700">
                        <strong>다음 액션:</strong> {summaryInfo.next_actions[0]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 다중 발송 */}
            {sendMode === 'multiple' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    고객 선택 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      loadCustomers()
                      setShowCustomerPicker(true)
                    }}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📋 고객 목록에서 선택
                  </button>
                </div>
                {customersLoading ? (
                  <div className="text-center py-4 text-gray-500">로딩 중...</div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    고객이 없습니다.{' '}
                    <Link href="/dashboard/customers/new" className="text-blue-600 hover:text-blue-700">
                      고객 추가하기
                    </Link>
                    {' 또는 '}
                    <Link href="/dashboard/customers/upload" className="text-blue-600 hover:text-blue-700">
                      CSV로 일괄 등록
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* 고객 검색 */}
                    <div className="mb-3">
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        placeholder="고객 이름 또는 전화번호로 검색..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-2">
                      {filteredCustomers.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          검색 결과가 없습니다.
                        </div>
                      ) : (
                        <>
                          {/* 전체 선택/해제 */}
                          <div className="mb-2 pb-2 border-b border-gray-200">
                            <label className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                                onChange={() => {
                                  if (selectedCustomers.length === filteredCustomers.length) {
                                    setSelectedCustomers([])
                                  } else {
                                    setSelectedCustomers(filteredCustomers.map(c => c.id))
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm font-semibold text-gray-700">
                                전체 선택 ({filteredCustomers.length}명)
                              </span>
                            </label>
                          </div>
                          {filteredCustomers.map((customer) => (
                            <label
                              key={customer.id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCustomers.includes(customer.id)}
                                onChange={() => toggleCustomer(customer.id)}
                                className="rounded"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                                <span className="text-xs text-gray-500 ml-2">({formatPhone(customer.phone)})</span>
                              </div>
                            </label>
                          ))}
                        </>
                      )}
                    </div>
                  </>
                )}
                {selectedCustomers.length > 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {selectedCustomers.length}명 선택됨
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomers([])}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      선택 해제
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CSV 발송 */}
            {sendMode === 'csv' && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV 파일 업로드 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleCsvFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    CSV 형식: name,phone,message (선택) 또는 엑셀 파일 (.xlsx, .xls)
                    <br />
                    예시: 홍길동,01012345678,안녕하세요 {`{고객명}`}님!
                  </p>
                </div>

                {csvPreview.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      수신자 미리보기 ({csvData.length}명)
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">전화번호</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">메시지</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {csvPreview.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-900">{row.name}</td>
                              <td className="px-4 py-2 text-sm text-gray-500">{formatPhone(row.phone)}</td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {row.message ? (
                                  <span className="text-xs">{row.message.substring(0, 30)}...</span>
                                ) : (
                                  <span className="text-gray-400">아래 메시지 사용</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvData.length > 10 && (
                        <div className="p-2 text-center text-xs text-gray-500 bg-gray-50">
                          외 {csvData.length - 10}명 더...
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 CSV에 message 컬럼이 있으면 개별 메시지를 사용하고, 없으면 아래 입력한 메시지를 모두에게 발송합니다.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 그룹별 발송 */}
            {sendMode === 'group' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  그룹 선택 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedGroupId === group.id
                          ? 'text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                      style={{
                        backgroundColor: selectedGroupId === group.id ? group.color : undefined,
                      }}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 태그별 발송 */}
            {sendMode === 'tag' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  태그 선택 <span className="text-red-500">*</span>
                </label>
                {availableTags.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    사용 가능한 태그가 없습니다.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                {selectedTags.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    {selectedTags.length}개 태그 선택됨
                  </div>
                )}
              </div>
            )}

            {/* 템플릿 선택 */}
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  템플릿 선택 (선택)
                </label>
                <div className="flex gap-2 mb-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value)
                      if (e.target.value) {
                        const template = templates.find(t => t.id === e.target.value)
                        if (template) {
                          setMessage(template.content)
                        }
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">템플릿 선택...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.is_favorite ? '⭐ ' : ''}{template.name} ({template.category})
                      </option>
                    ))}
                  </select>
                  <Link
                    href="/dashboard/templates"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    템플릿 관리
                  </Link>
                </div>
              </div>
            )}

            {/* 메시지 입력 */}
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  메시지 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {/* 단건 발송 시 요약 보기 버튼 */}
                  {sendMode === 'single' && (singlePhone || aiCustomerId) && (
                    <button
                      type="button"
                      onClick={() => setShowSummary(!showSummary)}
                      className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    >
                      {showSummary ? '📋 요약 숨기기' : '📋 대화 요약 보기'}
                    </button>
                  )}
                  <Link
                    href="/dashboard/templates"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    템플릿 관리 →
                  </Link>
                </div>
              </div>
              <div className="relative">
                <textarea
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                    setSelectedTemplateId('') // 수동 입력 시 템플릿 선택 해제
                  }}
                  className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="메시지를 입력하세요. 변수를 사용할 수 있습니다. 또는 AI 버튼을 눌러 의도를 입력하세요."
                />
                {/* AI 버튼 고정 (우측 하단) */}
                <button
                  type="button"
                  onClick={() => {
                    // 단건 발송 모드에서 고객 정보 설정
                    if (sendMode === 'single') {
                      setAiCustomerId(undefined)
                      setAiCustomerPhone(singlePhone)
                      setAiCustomerName(singleName)
                    } else if (sendMode === 'multiple' && selectedCustomers.length === 1) {
                      const customer = customers.find(c => selectedCustomers.includes(c.id))
                      if (customer) {
                        setAiCustomerId(customer.id)
                        setAiCustomerPhone(customer.phone)
                        setAiCustomerName(customer.name)
                      }
                    }
                    setShowAISuggestions(true)
                  }}
                  className="absolute bottom-3 right-3 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-1"
                  title="AI 메시지 추천"
                >
                  ✨ AI
                </button>
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">
                  사용 가능한 변수:
                </p>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <span
                      key={variable.key}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                      title={variable.description}
                    >
                      {variable.key}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 이미지 첨부 및 이모티콘 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowImagePicker(!showImagePicker)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  📷 이미지 첨부
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (userSettings?.business_card_image_url) {
                      // 명함 이미지가 있으면 Open Graph URL로 변환하여 선택
                      const previewUrl = await getPreviewUrl(userSettings.business_card_image_url)
                      setSelectedImage({ 
                        url: userSettings.business_card_image_url, // 미리보기용 원본 URL
                        name: '명함',
                        previewUrl: previewUrl // 발송용 Open Graph URL
                      })
                      setAttachBusinessCard(true)
                      // 메시지에 Open Graph URL 자동 추가
                      if (previewUrl) {
                        const currentMessage = message.trim()
                        // 이미 링크가 있으면 제거 후 새로 추가
                        const messageWithoutLink = currentMessage.replace(/\s*https?:\/\/[^\s]+/g, '').trim()
                        setMessage(messageWithoutLink ? `${messageWithoutLink}\n\n${previewUrl}` : previewUrl)
                      }
                    } else {
                      // 명함 이미지가 없으면 업로드 화면 표시
                      setShowBusinessCardUpload(true)
                    }
                  }}
                  className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
                    attachBusinessCard || (selectedImage?.name === '명함')
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  💼 명함 첨부 {attachBusinessCard || (selectedImage?.name === '명함') ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  😀 이모티콘
                </button>
              </div>

              {/* 선택된 이미지 표시 */}
              {selectedImage && (
                <div className="relative inline-block p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <img
                    src={selectedImage.url} // 항상 원본 URL 사용 (미리보기용)
                    alt={selectedImage.name}
                    className="max-w-xs max-h-48 rounded"
                    onError={(e) => {
                      // 에러 발생 시 savedImages에서 찾기
                      const img = savedImages.find(i => i.name === selectedImage.name)
                      if (img) {
                        (e.target as HTMLImageElement).src = img.image_url
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      // 메시지에서 Open Graph URL 제거
                      if (selectedImage?.previewUrl) {
                        const currentMessage = message.trim()
                        const messageWithoutLink = currentMessage.replace(selectedImage.previewUrl, '').trim()
                        setMessage(messageWithoutLink)
                      }
                      setSelectedImage(null)
                      setAttachBusinessCard(false)
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    title="이미지 선택 취소"
                  >
                    ×
                  </button>
                  <p className="text-xs text-gray-600 mt-1">{selectedImage.name}</p>
                  {selectedImage.previewUrl && (
                    <p className="text-xs text-green-600 mt-1">✓ Open Graph 링크 준비됨 (발송 시 자동 추가)</p>
                  )}
                </div>
              )}

              {/* 명함 이미지 업로드 */}
              {showBusinessCardUpload && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-900">명함 이미지 업로드</h4>
                    <button
                      type="button"
                      onClick={() => setShowBusinessCardUpload(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">명함 이미지 선택:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          try {
                            // Vercel 요청 크기 제한 (4.5MB) 체크
                            const maxSize = 4.5 * 1024 * 1024 // 4.5MB
                            if (file.size > maxSize) {
                              setError('파일 크기는 4.5MB 이하여야 합니다. (Vercel 제한)')
                              return
                            }

                            setUploadingBusinessCard(true)
                            setError('')

                            const { data: { user } } = await supabase.auth.getUser()
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
                            formData.append('name', '명함')
                            formData.append('category', 'business_card')

                            const response = await fetch('/api/upload-image', {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                              },
                              body: formData,
                            })

                            if (!response.ok) {
                              if (response.status === 413) {
                                setError('파일 크기가 너무 큽니다. 4.5MB 이하의 파일을 업로드해주세요.')
                              } else {
                                let errorData
                                try {
                                  errorData = await response.json()
                                } catch {
                                  errorData = { error: `서버 오류 (${response.status})` }
                                }
                                setError(errorData.error || '명함 이미지 업로드 실패')
                              }
                              return
                            }

                            const result = await response.json()

                            if (result.success && result.image) {
                              // user_settings에 명함 이미지 URL 저장
                              const { error: settingsError } = await supabase
                                .from('user_settings')
                                .upsert({
                                  user_id: user.id,
                                  business_card_image_url: result.image.image_url,
                                  updated_at: new Date().toISOString(),
                                }, {
                                  onConflict: 'user_id',
                                })

                              if (settingsError) {
                                console.error('Error saving business card:', settingsError)
                                setError('명함 이미지는 업로드되었지만 설정 저장에 실패했습니다.')
                              } else {
                                // 명함 이미지 선택
                                const previewUrl = result.image.preview_url || result.image.image_url
                                setSelectedImage({
                                  url: result.image.image_url, // 미리보기용 원본 URL
                                  name: '명함',
                                  previewUrl: previewUrl // 발송용 Open Graph URL
                                })
                                setAttachBusinessCard(true)
                                setShowBusinessCardUpload(false)
                                
                                // 메시지에 Open Graph URL 자동 추가
                                if (previewUrl) {
                                  const currentMessage = message.trim()
                                  // 이미 링크가 있으면 제거 후 새로 추가
                                  const messageWithoutLink = currentMessage.replace(/\s*https?:\/\/[^\s]+/g, '').trim()
                                  setMessage(messageWithoutLink ? `${messageWithoutLink}\n\n${previewUrl}` : previewUrl)
                                }
                                
                                // userSettings 새로고침
                                await loadUserSettings()
                                setSuccess('명함 이미지가 업로드되었습니다.')
                              }
                            }
                          } catch (error: any) {
                            console.error('Business card upload error:', error)
                            setError('명함 이미지 업로드 중 오류가 발생했습니다: ' + error.message)
                          } finally {
                            setUploadingBusinessCard(false)
                          }
                        }
                      }}
                      disabled={uploadingBusinessCard}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {uploadingBusinessCard && (
                      <p className="text-xs text-gray-500 mt-1">업로드 중...</p>
                    )}
                  </div>
                </div>
              )}

              {/* 이미지 선택기 */}
              {showImagePicker && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-900">이미지 선택</h4>
                    <button
                      type="button"
                      onClick={() => setShowImagePicker(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* 저장된 이미지 목록 */}
                  {savedImages.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">저장된 이미지:</p>
                      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                        {savedImages.map((img) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={async () => {
                              // 이미지 ID로 Open Graph URL 생성
                              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconnect-ten.vercel.app'
                              const previewUrl = `${baseUrl}/preview/${img.id}`
                              setSelectedImage({ 
                                url: img.image_url, // 미리보기용 원본 URL
                                name: img.name,
                                previewUrl: previewUrl // 발송용 Open Graph URL
                              })
                              // 메시지에 Open Graph URL 자동 추가
                              const currentMessage = message.trim()
                              // 이미 링크가 있으면 제거 후 새로 추가
                              const messageWithoutLink = currentMessage.replace(/\s*https?:\/\/[^\s]+/g, '').trim()
                              setMessage(messageWithoutLink ? `${messageWithoutLink}\n\n${previewUrl}` : previewUrl)
                              setShowImagePicker(false)
                            }}
                            className="relative aspect-square border-2 border-gray-300 rounded hover:border-blue-500 transition-colors overflow-hidden"
                          >
                            <img
                              src={img.image_url}
                              alt={img.name}
                              className="w-full h-full object-cover"
                            />
                            {img.is_favorite && (
                              <span className="absolute top-1 right-1 text-yellow-500">⭐</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 새 이미지 업로드 */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">새 이미지 업로드:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleImageUpload(file)
                        }
                      }}
                      disabled={uploadingImage}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {uploadingImage && (
                      <p className="text-xs text-gray-500 mt-1">업로드 중...</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 단건 발송 시 요약 표시 */}
            {sendMode === 'single' && showSummary && aiCustomerId && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <ConversationSummary
                  customerId={aiCustomerId}
                  customerPhone={singlePhone || aiCustomerPhone || ''}
                  customerName={singleName || aiCustomerName || '고객'}
                  onSummaryUpdate={() => {
                    // 요약 업데이트 시 정보 다시 로드
                    loadSummaryForCustomer(aiCustomerId)
                  }}
                />
              </div>
            )}
            {sendMode === 'single' && showSummary && !aiCustomerId && singlePhone && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 고객이 등록되어 있지 않아 요약 기능을 사용할 수 없습니다. 
                  고객을 먼저 등록하시면 이전 대화 요약을 확인할 수 있습니다.
                </p>
              </div>
            )}

            {/* 예약 발송 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="isScheduled"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="isScheduled" className="text-sm font-medium text-gray-700">
                  예약 발송
                </label>
              </div>
              {isScheduled && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      예약 날짜 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required={isScheduled}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      예약 시간 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required={isScheduled}
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
              {isScheduled && scheduledDate && scheduledTime && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    📅 예약 시간: {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('ko-KR')}
                  </p>
                </div>
              )}
            </div>

            {/* 미리보기 */}
            {preview && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  미리보기
                </label>
                <div className="text-sm text-blue-800 whitespace-pre-wrap">
                  {preview}
                </div>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '발송 중...' : '문자 발송'}
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                취소
              </Link>
            </div>

            {/* 안내 */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                💡 <strong>안내:</strong> 웹에서 문자를 발송하면, 모바일 앱이 자동으로 처리하여 실제 문자를 발송합니다.
                발송된 문자는 "발송 기록"에서 확인할 수 있습니다. 모바일 앱이 실행 중이어야 합니다.
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* AI 추천 모달 */}
      {showAISuggestions && (
        <AIMessageSuggestions
          customerId={aiCustomerId}
          customerPhone={aiCustomerPhone}
          customerName={aiCustomerName}
          onSelect={(msg) => {
            setMessage(msg)
            setShowAISuggestions(false)
          }}
          onClose={() => setShowAISuggestions(false)}
          onIntentSelect={(intent) => {
            // 의도 샘플 선택 시 메시지 입력 필드에 자동 입력 (수정 가능)
            setMessage(intent)
          }}
        />
      )}

      {/* 고객 선택 모달 */}
      {showCustomerPicker && (
        <CustomerPicker
          selectedCustomers={selectedCustomers}
          onSelect={(customerIds) => {
            setSelectedCustomers(customerIds)
            setShowCustomerPicker(false)
          }}
          onClose={() => setShowCustomerPicker(false)}
        />
      )}

    </div>
  )
}

