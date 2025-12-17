'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/lib/auth'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingCard, setUploadingCard] = useState(false)
  const [uploadingProfile, setUploadingProfile] = useState(false)

  // 기본 설정
  const [settings, setSettings] = useState({
    industry_type: 'general',
    limit_mode: 'safe',
    throttle_interval: 15,
    auto_callback_enabled: true,
    callback_template_new: '',
    callback_template_existing: '',
  })

  // 콜백 옵션 설정 (3가지 옵션)
  const [callbackOptions, setCallbackOptions] = useState({
    callback_on_end_enabled: true,
    callback_on_end_message: '안녕하세요, 방금 통화 감사합니다. 궁금하신 점 있으시면 편하게 연락주세요.',
    callback_on_missed_enabled: true,
    callback_on_missed_message: '안녕하세요, 전화를 받지 못해 죄송합니다. 확인 후 다시 연락드리겠습니다.',
    callback_on_busy_enabled: true,
    callback_on_busy_message: '안녕하세요, 통화중이라 받지 못했습니다. 잠시 후 연락드리겠습니다.',
  })

  // 알림 설정
  const [notifications, setNotifications] = useState({
    push_notifications_enabled: true,
    birthday_notifications_enabled: true,
    anniversary_notifications_enabled: true,
    task_notifications_enabled: true,
    notification_time: '09:00',
    birthday_reminder_days: 1,
    anniversary_reminder_days: 1,
  })

  // 명함 정보
  const [businessCard, setBusinessCard] = useState({
    business_card_enabled: false,
    business_card_image_url: '',
    full_name: '',
    phone: '',
    company_name: '',
    position: '',
    department: '',
    email: '',
    website: '',
    address: '',
    bio: '',
    specialties: [] as string[],
    social_links: {
      linkedin: '',
      instagram: '',
      facebook: '',
      twitter: '',
    },
    profile_image_url: '',
  })

  const [specialtyInput, setSpecialtyInput] = useState('')

  // AI 의도 샘플 관리
  const [aiIntentSamples, setAiIntentSamples] = useState<string[]>([])
  const [newIntentSample, setNewIntentSample] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        setError('설정을 불러오는 중 오류가 발생했습니다.')
      } else if (data) {
        setSettings({
          industry_type: data.industry_type || 'general',
          limit_mode: data.limit_mode || 'safe',
          throttle_interval: data.throttle_interval || 15,
          auto_callback_enabled: data.auto_callback_enabled ?? true,
          callback_template_new: data.callback_template_new || '',
          callback_template_existing: data.callback_template_existing || '',
        })

        setCallbackOptions({
          callback_on_end_enabled: data.callback_on_end_enabled ?? true,
          callback_on_end_message: data.callback_on_end_message || '안녕하세요, 방금 통화 감사합니다. 궁금하신 점 있으시면 편하게 연락주세요.',
          callback_on_missed_enabled: data.callback_on_missed_enabled ?? true,
          callback_on_missed_message: data.callback_on_missed_message || '안녕하세요, 전화를 받지 못해 죄송합니다. 확인 후 다시 연락드리겠습니다.',
          callback_on_busy_enabled: data.callback_on_busy_enabled ?? true,
          callback_on_busy_message: data.callback_on_busy_message || '안녕하세요, 통화중이라 받지 못했습니다. 잠시 후 연락드리겠습니다.',
        })

        setNotifications({
          push_notifications_enabled: data.push_notifications_enabled ?? true,
          birthday_notifications_enabled: data.birthday_notifications_enabled ?? true,
          anniversary_notifications_enabled: data.anniversary_notifications_enabled ?? true,
          task_notifications_enabled: data.task_notifications_enabled ?? true,
          notification_time: data.notification_time ? data.notification_time.substring(0, 5) : '09:00',
          birthday_reminder_days: data.birthday_reminder_days || 1,
          anniversary_reminder_days: data.anniversary_reminder_days || 1,
        })

        setBusinessCard({
          business_card_enabled: data.business_card_enabled || false,
          business_card_image_url: data.business_card_image_url || '',
          full_name: data.full_name || '',
          phone: data.phone || '',
          company_name: data.company_name || '',
          position: data.position || '',
          department: data.department || '',
          email: data.email || '',
          website: data.website || '',
          address: data.address || '',
          bio: data.bio || '',
          specialties: data.specialties || [],
          social_links: data.social_links || {
            linkedin: '',
            instagram: '',
            facebook: '',
            twitter: '',
          },
          profile_image_url: data.profile_image_url || '',
        })

        // AI 의도 샘플 로드
        if (data.ai_intent_samples && Array.isArray(data.ai_intent_samples)) {
          setAiIntentSamples(data.ai_intent_samples)
        } else {
          // 기본값 설정
          setAiIntentSamples([
            '기존 대화를 확인하고 온화한 말투로 고객 안부를 물어주는 문자',
            '고객과의 관계를 유지하며 간단한 인사 문자',
            '새로운 상품이나 서비스를 소개하는 영업 문자',
            '약속이나 미팅 일정을 확인하는 문자',
            '고객의 문의나 불만에 대한 답변 문자',
            '명절이나 기념일 인사 문자',
            '고객의 구매 결정을 돕는 추진 문자',
          ])
        }
      }
    } catch (err) {
      console.error('Error:', err)
      setError('설정을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('로그인이 필요합니다.')
        return
      }

      // full_name 검증 및 준비
      const trimmedFullName = businessCard.full_name?.trim()
      if (!trimmedFullName || trimmedFullName.length === 0) {
        setError('이름은 필수 항목입니다. "개인정보 상세 입력" 섹션에서 이름을 입력해주세요.')
        setSaving(false)
        return
      }

      // DB에 존재하는 컬럼만 저장
      const saveData = {
        user_id: user.id,
        // 기본 설정
        industry_type: settings.industry_type,
        limit_mode: settings.limit_mode,
        throttle_interval: settings.throttle_interval,
        auto_callback_enabled: settings.auto_callback_enabled,
        callback_template_new: settings.callback_template_new,
        callback_template_existing: settings.callback_template_existing,
        // 콜백 옵션
        callback_on_end_enabled: callbackOptions.callback_on_end_enabled,
        callback_on_end_message: callbackOptions.callback_on_end_message,
        callback_on_missed_enabled: callbackOptions.callback_on_missed_enabled,
        callback_on_missed_message: callbackOptions.callback_on_missed_message,
        callback_on_busy_enabled: callbackOptions.callback_on_busy_enabled,
        callback_on_busy_message: callbackOptions.callback_on_busy_message,
        // 명함
        business_card_enabled: businessCard.business_card_enabled,
        business_card_image_url: businessCard.business_card_image_url || null,
        // 개인정보 상세 입력 (AI가 사용자를 이해하기 위한 정보)
        full_name: trimmedFullName, // 검증된 이름 저장 (null이 아님)
        phone: businessCard.phone?.trim() || null, // 전화번호 (관리자용)
        company_name: businessCard.company_name || null,
        position: businessCard.position || null,
        department: businessCard.department || null,
        email: businessCard.email || null,
        website: businessCard.website || null,
        address: businessCard.address || null,
        bio: businessCard.bio || null,
        specialties: businessCard.specialties.length > 0 ? businessCard.specialties : null,
        social_links: businessCard.social_links,
        profile_image_url: businessCard.profile_image_url || null,
        // 알림
        push_notifications_enabled: notifications.push_notifications_enabled,
        birthday_notifications_enabled: notifications.birthday_notifications_enabled,
        anniversary_notifications_enabled: notifications.anniversary_notifications_enabled,
        task_notifications_enabled: notifications.task_notifications_enabled,
        notification_time: notifications.notification_time + ':00',
        birthday_reminder_days: notifications.birthday_reminder_days,
        anniversary_reminder_days: notifications.anniversary_reminder_days,
        // AI 의도 샘플
        ai_intent_samples: aiIntentSamples.length > 0 ? aiIntentSamples : null,
        updated_at: new Date().toISOString(),
      }

      // 디버깅: 저장 전 로그
      console.log('💾 [DEBUG] 설정 저장 시도:')
      console.log('  - user.id:', user.id)
      console.log('  - businessCard.full_name 원본:', businessCard.full_name)
      console.log('  - trimmedFullName:', trimmedFullName)
      console.log('  - saveData.full_name:', saveData.full_name)

      const { data: upsertedData, error } = await supabase
        .from('user_settings')
        .upsert(saveData, { onConflict: 'user_id' })
        .select('full_name') // 저장된 full_name 확인

      if (error) {
        console.error('❌ 설정 저장 실패:', error)
        setError('설정 저장 중 오류가 발생했습니다: ' + error.message)
      } else {
        // 저장 후 실제로 DB에 반영되었는지 확인
        const savedFullName = upsertedData?.[0]?.full_name
        console.log('✅ 설정 저장 성공:', {
          savedFullName,
          expectedFullName: trimmedFullName,
          match: savedFullName === trimmedFullName
        })

        if (!savedFullName || savedFullName.trim() !== trimmedFullName) {
          console.error('⚠️ 저장된 이름이 예상과 다릅니다!')
          setError('이름이 제대로 저장되지 않았습니다. 다시 시도해주세요.')
        } else {
          setSuccess(`설정이 저장되었습니다. (이름: ${savedFullName})`)
          setTimeout(() => setSuccess(''), 3000)
        }
        
        // 저장 후 설정 다시 로드하여 UI 업데이트
        await loadSettings()
      }
    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || '설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'card' | 'profile') => {
    if (type === 'card') {
      setUploadingCard(true)
    } else {
      setUploadingProfile(true)
    }
    setError('')

    try {
      // Vercel 요청 크기 제한 (4.5MB) 체크
      const maxSize = 4.5 * 1024 * 1024 // 4.5MB
      if (file.size > maxSize) {
        setError('파일 크기는 4.5MB 이하여야 합니다. (Vercel 제한)')
        if (type === 'card') {
          setUploadingCard(false)
        } else {
          setUploadingProfile(false)
        }
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
      formData.append('category', type === 'card' ? 'business_card' : 'profile')

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = '이미지 업로드 실패'
        if (response.status === 413) {
          errorMessage = '파일 크기가 너무 큽니다. 4.5MB 이하의 파일을 업로드해주세요.'
        } else {
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // JSON 파싱 실패 시 상태 텍스트 사용
          errorMessage = `이미지 업로드 실패 (상태 코드: ${response.status})`
          }
        }
        console.error('❌ Image upload failed:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
        })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.success || !data.image) {
        console.error('❌ Invalid response from upload API:', data)
        throw new Error('서버 응답이 올바르지 않습니다.')
      }

      console.log('✅ Image upload successful:', {
        imageId: data.image.id,
        imageUrl: data.image.image_url,
        type,
      })
      
      // user_settings에 이미지 URL 저장
      const fieldName = type === 'card' ? 'business_card_image_url' : 'profile_image_url'
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          [fieldName]: data.image.image_url,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })

      if (settingsError) {
        console.error('❌ Error saving image URL to settings:', settingsError)
        throw new Error('이미지는 업로드되었지만 설정 저장에 실패했습니다: ' + settingsError.message)
      }

      // 상태 업데이트
      if (type === 'card') {
        setBusinessCard(prev => ({ ...prev, business_card_image_url: data.image.image_url }))
      } else {
        setBusinessCard(prev => ({ ...prev, profile_image_url: data.image.image_url }))
      }

      setSuccess('이미지가 업로드되고 저장되었습니다.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('❌ Image upload error:', {
        message: err.message,
        stack: err.stack,
        type,
      })
      setError(err.message || '이미지 업로드 중 오류가 발생했습니다.')
      setTimeout(() => setError(''), 5000)
    } finally {
      if (type === 'card') {
        setUploadingCard(false)
      } else {
        setUploadingProfile(false)
      }
    }
  }

  const addSpecialty = () => {
    if (specialtyInput.trim() && !businessCard.specialties.includes(specialtyInput.trim())) {
      setBusinessCard(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialtyInput.trim()],
      }))
      setSpecialtyInput('')
    }
  }

  const removeSpecialty = (specialty: string) => {
    setBusinessCard(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty),
    }))
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
            <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
              비즈커넥트
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-xl font-semibold text-gray-900">설정</h1>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* 개인정보 상세 입력 */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            개인정보 상세 입력
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            상세한 개인정보를 입력하면 AI가 더 정확한 메시지를 추천할 수 있습니다.
          </p>

          <div className="space-y-4">
            {/* 프로필 이미지 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로필 이미지
              </label>
              {businessCard.profile_image_url && (
                <img
                  src={businessCard.profile_image_url}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleImageUpload(file, 'profile')
                  }
                }}
                disabled={uploadingProfile}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
              />
            </div>

            {/* 기본 정보 */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessCard.full_name}
                  onChange={(e) => setBusinessCard(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  회사명
                </label>
                <input
                  type="text"
                  value={businessCard.company_name}
                  onChange={(e) => setBusinessCard(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="(주)비즈커넥트"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  직책
                </label>
                <input
                  type="text"
                  value={businessCard.position}
                  onChange={(e) => setBusinessCard(prev => ({ ...prev, position: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="대표이사"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  부서
                </label>
                <input
                  type="text"
                  value={businessCard.department}
                  onChange={(e) => setBusinessCard(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="영업팀"
                />
              </div>
            </div>

            {/* 연락처 정보 */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={businessCard.phone}
                  onChange={(e) => {
                    // 숫자와 하이픈만 허용
                    const value = e.target.value.replace(/[^\d-]/g, '')
                    setBusinessCard(prev => ({ ...prev, phone: value }))
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="010-1234-5678"
                />
                <p className="text-xs text-gray-500 mt-1">
                  관리자가 전체 이용자를 관리할 때 사용될 수 있습니다.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  value={businessCard.email}
                  onChange={(e) => setBusinessCard(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="hong@example.com"
                />
              </div>
            </div>

            {/* 웹사이트 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                웹사이트
              </label>
              <input
                type="url"
                value={businessCard.website}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            </div>

            {/* 주소 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주소
              </label>
              <input
                type="text"
                value={businessCard.address}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="서울시 강남구 테헤란로 123"
              />
            </div>

            {/* 자기소개 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                자기소개 / 비즈니스 소개
              </label>
              <textarea
                rows={4}
                value={businessCard.bio}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, bio: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="안녕하세요. 10년 이상의 경력을 가진 영업 전문가입니다..."
              />
              <p className="text-xs text-gray-500 mt-1">
                AI가 더 정확한 메시지를 추천할 수 있도록 상세히 작성해주세요.
              </p>
            </div>

            {/* 전문 분야 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전문 분야
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addSpecialty()
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 보험, 부동산, 자동차"
                />
                <button
                  type="button"
                  onClick={addSpecialty}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  추가
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {businessCard.specialties.map((specialty, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {specialty}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(specialty)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 소셜 링크 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                소셜 링크
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="url"
                  value={businessCard.social_links.linkedin}
                  onChange={(e) => setBusinessCard(prev => ({
                    ...prev,
                    social_links: { ...prev.social_links, linkedin: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="LinkedIn URL"
                />
                <input
                  type="url"
                  value={businessCard.social_links.instagram}
                  onChange={(e) => setBusinessCard(prev => ({
                    ...prev,
                    social_links: { ...prev.social_links, instagram: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Instagram URL"
                />
                <input
                  type="url"
                  value={businessCard.social_links.facebook}
                  onChange={(e) => setBusinessCard(prev => ({
                    ...prev,
                    social_links: { ...prev.social_links, facebook: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Facebook URL"
                />
                <input
                  type="url"
                  value={businessCard.social_links.twitter}
                  onChange={(e) => setBusinessCard(prev => ({
                    ...prev,
                    social_links: { ...prev.social_links, twitter: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Twitter URL"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 기본 설정 */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            기본 설정
          </h2>

          <div className="space-y-4">
            {/* 업종 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                업종
              </label>
              <select
                value={settings.industry_type}
                onChange={(e) => setSettings(prev => ({ ...prev, industry_type: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">일반</option>
                <option value="insurance">보험</option>
                <option value="automotive">자동차</option>
                <option value="real_estate">부동산</option>
                <option value="construction">건설</option>
                <option value="retail">매장/소매</option>
                <option value="service">서비스업</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                업종을 선택하면 해당 업종에 맞는 템플릿과 자동화 기능이 제공됩니다.
              </p>
            </div>

            {/* 일일 한도 모드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                일일 발송 한도 모드
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="limitMode"
                    value="safe"
                    checked={settings.limit_mode === 'safe'}
                    onChange={(e) => setSettings(prev => ({ ...prev, limit_mode: e.target.value }))}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium text-gray-900">안전 모드 (199건/일)</span>
                    <p className="text-xs text-gray-500">통신사 제재 위험이 낮습니다. 권장합니다.</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="limitMode"
                    value="max"
                    checked={settings.limit_mode === 'max'}
                    onChange={(e) => setSettings(prev => ({ ...prev, limit_mode: e.target.value }))}
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium text-gray-900">최대 모드 (490건/일)</span>
                    <p className="text-xs text-gray-500">통신사 제재 위험이 있습니다. 주의해서 사용하세요.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* 스로틀링 간격 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                발송 간격 (초)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={settings.throttle_interval}
                onChange={(e) => setSettings(prev => ({ ...prev, throttle_interval: parseInt(e.target.value) || 15 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                문자 발송 간격입니다. 기본값은 15초입니다. 너무 짧으면 통신사 제재를 받을 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 콜백 서비스 설정 */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            콜백 서비스 설정
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            통화 종료 후 자동으로 고객에게 문자를 발송하는 기능입니다. 상황별로 다른 메시지를 보낼 수 있습니다.
          </p>

          <div className="space-y-6">
            {/* 콜백 활성화 */}
            <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <input
                type="checkbox"
                id="autoCallbackEnabled"
                checked={settings.auto_callback_enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, auto_callback_enabled: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="autoCallbackEnabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                콜백 서비스 활성화
              </label>
            </div>
            <p className="text-xs text-gray-500 -mt-4">
              활성화하면 통화 종료 후 자동으로 설정된 템플릿으로 문자를 발송합니다.
            </p>

            {settings.auto_callback_enabled && (
              <>
                {/* 3가지 콜백 옵션 */}
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-gray-800">상황별 콜백 메시지 설정</h3>

                  {/* 통화 종료 옵션 */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          통화종료
                        </span>
                        <span className="text-sm text-gray-600">정상적으로 통화가 끝났을 때</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={callbackOptions.callback_on_end_enabled}
                          onChange={(e) => setCallbackOptions(prev => ({ ...prev, callback_on_end_enabled: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                    {callbackOptions.callback_on_end_enabled && (
                      <textarea
                        rows={3}
                        value={callbackOptions.callback_on_end_message}
                        onChange={(e) => setCallbackOptions(prev => ({ ...prev, callback_on_end_message: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                        placeholder="통화 종료 후 발송할 메시지"
                      />
                    )}
                  </div>

                  {/* 부재중 옵션 */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                          부재중
                        </span>
                        <span className="text-sm text-gray-600">전화를 받지 못했을 때</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={callbackOptions.callback_on_missed_enabled}
                          onChange={(e) => setCallbackOptions(prev => ({ ...prev, callback_on_missed_enabled: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                      </label>
                    </div>
                    {callbackOptions.callback_on_missed_enabled && (
                      <textarea
                        rows={3}
                        value={callbackOptions.callback_on_missed_message}
                        onChange={(e) => setCallbackOptions(prev => ({ ...prev, callback_on_missed_message: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-sm"
                        placeholder="부재중 후 발송할 메시지"
                      />
                    )}
                  </div>

                  {/* 통화중 옵션 */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          통화중
                        </span>
                        <span className="text-sm text-gray-600">다른 통화 중이라 받지 못했을 때</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={callbackOptions.callback_on_busy_enabled}
                          onChange={(e) => setCallbackOptions(prev => ({ ...prev, callback_on_busy_enabled: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                      </label>
                    </div>
                    {callbackOptions.callback_on_busy_enabled && (
                      <textarea
                        rows={3}
                        value={callbackOptions.callback_on_busy_message}
                        onChange={(e) => setCallbackOptions(prev => ({ ...prev, callback_on_busy_message: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                        placeholder="통화중일 때 발송할 메시지"
                      />
                    )}
                  </div>
                </div>

                {/* 신규/기존 고객 템플릿 (기존 기능) */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-semibold text-gray-800 mb-4">고객 유형별 템플릿 (고급)</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    신규 고객과 기존 고객에 따라 다른 메시지를 보낼 수 있습니다. 위의 상황별 메시지보다 우선 적용됩니다.
                  </p>

                  {/* 신규 고객 콜백 템플릿 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      신규 고객 콜백 템플릿
                    </label>
                    <textarea
                      rows={3}
                      value={settings.callback_template_new}
                      onChange={(e) => setSettings(prev => ({ ...prev, callback_template_new: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="안녕하세요 {고객명}님! 방금 전 통화 감사드립니다. 저는 {회사명}의 {직책} {이름}입니다."
                    />
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">사용 가능한 변수:</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">{'{고객명}'}</span>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">{'{이름}'}</span>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">{'{회사명}'}</span>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">{'{직책}'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 기존 고객 콜백 템플릿 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      기존 고객 콜백 템플릿
                    </label>
                    <textarea
                      rows={3}
                      value={settings.callback_template_existing}
                      onChange={(e) => setSettings(prev => ({ ...prev, callback_template_existing: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="안녕하세요 {고객명}님! 방금 전 통화 감사드립니다."
                    />
                  </div>
                </div>
              </>
            )}

            {/* 안내 */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>안내:</strong> 콜백 서비스는 모바일 앱에서 통화 종료를 감지한 후 자동으로 발송됩니다.
                상황별 메시지는 통화 상태(종료/부재중/통화중)에 따라 자동으로 선택됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 알림 설정 */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            알림 설정
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            푸시 알림을 통해 중요한 일정과 작업 완료를 알려드립니다.
          </p>

          <div className="space-y-4">
            {/* 푸시 알림 활성화 */}
            <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <input
                type="checkbox"
                id="pushNotificationsEnabled"
                checked={notifications.push_notifications_enabled}
                onChange={(e) => setNotifications(prev => ({ ...prev, push_notifications_enabled: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="pushNotificationsEnabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                푸시 알림 활성화
              </label>
            </div>
            <p className="text-xs text-gray-500 -mt-4">
              모바일 앱에서 푸시 알림을 받으려면 활성화해야 합니다.
            </p>

            {/* 알림 시간 설정 */}
            {notifications.push_notifications_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 시간
                </label>
                <input
                  type="time"
                  value={notifications.notification_time}
                  onChange={(e) => setNotifications(prev => ({ ...prev, notification_time: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  매일 이 시간에 알림을 받습니다. (예: 생일, 기념일 알림)
                </p>
              </div>
            )}

            {/* 생일 알림 */}
            {notifications.push_notifications_enabled && (
              <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="birthdayNotificationsEnabled"
                    checked={notifications.birthday_notifications_enabled}
                    onChange={(e) => setNotifications(prev => ({ ...prev, birthday_notifications_enabled: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="birthdayNotificationsEnabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                    생일 알림
                  </label>
                </div>
                {notifications.birthday_notifications_enabled && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      알림 시점 (D-일)
                    </label>
                    <select
                      value={notifications.birthday_reminder_days}
                      onChange={(e) => setNotifications(prev => ({ ...prev, birthday_reminder_days: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="0">당일 (D-Day)</option>
                      <option value="1">1일 전 (D-1)</option>
                      <option value="3">3일 전 (D-3)</option>
                      <option value="7">1주일 전 (D-7)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* 기념일 알림 */}
            {notifications.push_notifications_enabled && (
              <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anniversaryNotificationsEnabled"
                    checked={notifications.anniversary_notifications_enabled}
                    onChange={(e) => setNotifications(prev => ({ ...prev, anniversary_notifications_enabled: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="anniversaryNotificationsEnabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                    기념일 알림
                  </label>
                </div>
                {notifications.anniversary_notifications_enabled && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      알림 시점 (D-일)
                    </label>
                    <select
                      value={notifications.anniversary_reminder_days}
                      onChange={(e) => setNotifications(prev => ({ ...prev, anniversary_reminder_days: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="0">당일 (D-Day)</option>
                      <option value="1">1일 전 (D-1)</option>
                      <option value="3">3일 전 (D-3)</option>
                      <option value="7">1주일 전 (D-7)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* 작업 완료 알림 */}
            {notifications.push_notifications_enabled && (
              <div className="flex items-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <input
                  type="checkbox"
                  id="taskNotificationsEnabled"
                  checked={notifications.task_notifications_enabled}
                  onChange={(e) => setNotifications(prev => ({ ...prev, task_notifications_enabled: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="taskNotificationsEnabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                  작업 완료 알림
                </label>
              </div>
            )}

            {/* 안내 */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>안내:</strong> 푸시 알림은 모바일 앱에서만 작동합니다. 
                웹에서는 브라우저 알림을 사용할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* AI 의도 샘플 관리 */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            AI 메시지 추천 의도 샘플 관리
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            AI 메시지 추천 시 사용할 의도 샘플을 관리합니다. 자주 사용하는 의도를 추가하거나 수정할 수 있습니다.
          </p>

          <div className="space-y-4">
            {/* 기존 샘플 목록 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                현재 의도 샘플 목록
              </label>
              <div className="space-y-2">
                {aiIntentSamples.map((sample, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sample}
                      onChange={(e) => {
                        const newSamples = [...aiIntentSamples]
                        newSamples[idx] = e.target.value
                        setAiIntentSamples(newSamples)
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAiIntentSamples(aiIntentSamples.filter((_, i) => i !== idx))
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 새 샘플 추가 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 의도 샘플 추가
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIntentSample}
                  onChange={(e) => setNewIntentSample(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (newIntentSample.trim()) {
                        setAiIntentSamples([...aiIntentSamples, newIntentSample.trim()])
                        setNewIntentSample('')
                      }
                    }
                  }}
                  placeholder="예: 고객의 생일을 축하하는 문자"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newIntentSample.trim()) {
                      setAiIntentSamples([...aiIntentSamples, newIntentSample.trim()])
                      setNewIntentSample('')
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            {/* 기본값으로 초기화 */}
            <div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('기본 의도 샘플로 초기화하시겠습니까?')) {
                    setAiIntentSamples([
                      '기존 대화를 확인하고 온화한 말투로 고객 안부를 물어주는 문자',
                      '고객과의 관계를 유지하며 간단한 인사 문자',
                      '새로운 상품이나 서비스를 소개하는 영업 문자',
                      '약속이나 미팅 일정을 확인하는 문자',
                      '고객의 문의나 불만에 대한 답변 문자',
                      '명절이나 기념일 인사 문자',
                      '고객의 구매 결정을 돕는 추진 문자',
                    ])
                  }
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                기본값으로 초기화
              </button>
            </div>
          </div>
        </div>

        {/* 명함 설정 */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            명함 설정
          </h2>

          <div className="space-y-4">
            {/* 명함 이미지 업로드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                명함 이미지
              </label>
              {businessCard.business_card_image_url && (
                <img
                  src={businessCard.business_card_image_url}
                  alt="Business Card"
                  className="max-w-xs h-32 object-contain border border-gray-200 rounded-lg mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleImageUpload(file, 'card')
                  }
                }}
                disabled={uploadingCard}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
              />
            </div>

            {/* 명함 자동 첨부 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="businessCardEnabled"
                checked={businessCard.business_card_enabled}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, business_card_enabled: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="businessCardEnabled" className="text-sm font-medium text-gray-700">
                문자 발송 시 명함 자동 첨부
              </label>
            </div>
            <p className="text-xs text-gray-500">
              활성화하면 문자 발송 페이지에서 "명함 첨부" 체크박스가 기본으로 선택됩니다.
            </p>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </main>
    </div>
  )
}

