/**
 * SMS 발송 내역 관련 타입 정의
 */

export interface SMSLog {
  id: string
  user_id: string
  task_id: string | null
  phone_number: string
  message: string
  sent_at: string
  status: 'sent' | 'failed' | 'delivered'
  error_message: string | null
  sms_id: string | null
  image_url?: string | null
  image_name?: string | null
  // 조인 데이터
  customer?: {
    id: string
    name: string
    phone: string
    group?: {
      id: string
      name: string
      color: string
    }
  }
}

export interface SMSStats {
  total: number
  sent: number
  failed: number
  delivered: number
  success_rate: number
  today_count: number
  this_week_count: number
  this_month_count: number
}

