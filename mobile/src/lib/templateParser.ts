import { Customer } from './types/customer';

/**
 * 템플릿 변수 치환
 */
export function replaceTemplateVariables(
  template: string,
  customer: Customer | null,
  phoneNumber: string
): string {
  let message = template;
  const now = new Date();

  // 기본 변수
  if (customer) {
    message = message.replace(/{고객명}/g, customer.name || '');
    message = message.replace(/{이름}/g, customer.name || '');
    
    // 전화번호 포맷팅
    const phone = customer.phone || phoneNumber;
    const normalizedPhone = phone.replace(/\D/g, '');
    const formattedPhone = normalizedPhone.length === 11
      ? `${normalizedPhone.slice(0, 3)}-${normalizedPhone.slice(3, 7)}-${normalizedPhone.slice(7)}`
      : phone;
    message = message.replace(/{전화번호}/g, formattedPhone);
    message = message.replace(/{phone}/g, formattedPhone);
  } else {
    message = message.replace(/{고객명}/g, '');
    message = message.replace(/{이름}/g, '');
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = normalizedPhone.length === 11
      ? `${normalizedPhone.slice(0, 3)}-${normalizedPhone.slice(3, 7)}-${normalizedPhone.slice(7)}`
      : phoneNumber;
    message = message.replace(/{전화번호}/g, formattedPhone);
    message = message.replace(/{phone}/g, formattedPhone);
  }

  // 추가 변수 (있는 경우)
  if (customer) {
    // 업종
    const industryLabels: Record<string, string> = {
      general: '일반',
      automotive: '자동차',
      insurance: '보험',
      real_estate: '부동산',
      construction: '건설',
      store: '매장관리',
    };
    const industryLabel = customer.industry_type
      ? industryLabels[customer.industry_type] || customer.industry_type
      : '';
    message = message.replace(/{업종}/g, industryLabel);
    message = message.replace(/{메모}/g, customer.notes || '');
    
    // 생일
    if (customer.birthday) {
      const birthday = new Date(customer.birthday);
      const birthdayStr = `${birthday.getFullYear()}-${String(birthday.getMonth() + 1).padStart(2, '0')}-${String(birthday.getDate()).padStart(2, '0')}`;
      message = message.replace(/{생일}/g, birthdayStr);
    }
    
    // 기념일
    if (customer.anniversary) {
      const anniversary = new Date(customer.anniversary);
      const anniversaryStr = `${anniversary.getFullYear()}-${String(anniversary.getMonth() + 1).padStart(2, '0')}-${String(anniversary.getDate()).padStart(2, '0')}`;
      message = message.replace(/{기념일}/g, anniversaryStr);
    }
  }

  // 날짜 변수
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const weekday = weekdays[now.getDay()];

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  message = message.replace(/{날짜}/g, dateStr);
  message = message.replace(/{시간}/g, timeStr);
  message = message.replace(/{년}/g, year.toString());
  message = message.replace(/{월}/g, month.toString());
  message = message.replace(/{일}/g, day.toString());
  message = message.replace(/{시}/g, hour.toString());
  message = message.replace(/{분}/g, minute.toString());
  message = message.replace(/{요일}/g, weekday);

  return message;
}

