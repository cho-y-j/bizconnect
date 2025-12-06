import { supabase } from '../../lib/supabaseClient';
import { Customer, TodayEvent } from '../lib/types/customer';

/**
 * 오늘 생일/기념일인 고객 조회
 */
export async function getTodayEvents(userId: string): Promise<TodayEvent[]> {
  try {
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-12
    const todayDay = today.getDate();

    // 오늘 생일인 고객 조회
    const { data: birthdayCustomers } = await supabase
      .from('customers')
      .select('id, name, phone, birthday')
      .eq('user_id', userId)
      .not('birthday', 'is', null);

    // 오늘 기념일인 고객 조회
    const { data: anniversaryCustomers } = await supabase
      .from('customers')
      .select('id, name, phone, anniversary')
      .eq('user_id', userId)
      .not('anniversary', 'is', null);

    const events: TodayEvent[] = [];

    // 생일 처리
    if (birthdayCustomers) {
      birthdayCustomers.forEach((customer) => {
        if (customer.birthday) {
          const birthday = new Date(customer.birthday);
          const birthdayMonth = birthday.getMonth() + 1;
          const birthdayDay = birthday.getDate();

          if (birthdayMonth === todayMonth && birthdayDay === todayDay) {
            const age = today.getFullYear() - birthday.getFullYear();
            events.push({
              id: customer.id,
              type: 'birthday',
              customer_name: customer.name,
              customer_phone: customer.phone,
              date: customer.birthday,
              age,
            });
          }
        }
      });
    }

    // 기념일 처리
    if (anniversaryCustomers) {
      anniversaryCustomers.forEach((customer) => {
        if (customer.anniversary) {
          const anniversary = new Date(customer.anniversary);
          const anniversaryMonth = anniversary.getMonth() + 1;
          const anniversaryDay = anniversary.getDate();

          if (anniversaryMonth === todayMonth && anniversaryDay === todayDay) {
            const years = today.getFullYear() - anniversary.getFullYear();
            events.push({
              id: customer.id,
              type: 'anniversary',
              customer_name: customer.name,
              customer_phone: customer.phone,
              date: customer.anniversary,
              years,
            });
          }
        }
      });
    }

    return events;
  } catch (error) {
    console.error('Error in getTodayEvents:', error);
    return [];
  }
}

/**
 * 고객 목록 조회
 */
export async function getCustomers(
  userId: string,
  limit: number = 100
): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching customers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCustomers:', error);
    return [];
  }
}



