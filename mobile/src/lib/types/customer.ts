export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  group_id?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  industry_type?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  // 조인 데이터
  group?: {
    id: string;
    name: string;
  } | null;
}

export interface TodayEvent {
  id: string;
  type: 'birthday' | 'anniversary';
  customer_name: string;
  customer_phone: string;
  date: string;
  age?: number;
  years?: number;
}




