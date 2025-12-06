export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  birthday?: string | null;
  anniversary?: string | null;
  industry_type?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
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



