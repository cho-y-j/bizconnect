import { supabase } from '../../lib/supabaseClient';

interface ContactData {
  name: string;
  phone: string;
}

export interface UploadResult {
  success: number;
  duplicates: number;
  failed: number;
}

/**
 * 주소록 데이터를 고객 데이터로 변환 및 업로드
 */
export async function uploadContacts(
  userId: string,
  contacts: ContactData[]
): Promise<UploadResult> {
  const result: UploadResult = {
    success: 0,
    duplicates: 0,
    failed: 0,
  };

  try {
    // 고객 데이터로 변환
    const customers = contacts
      .filter((c) => c.name && c.phone && c.phone.length >= 10)
      .map((contact) => ({
        user_id: userId,
        name: contact.name.trim(),
        phone: contact.phone.replace(/\D/g, ''), // 숫자만
        industry_type: 'general',
      }));

    if (customers.length === 0) {
      return result;
    }

    // 일괄 업로드 (upsert - 중복 시 업데이트)
    const { data, error } = await supabase
      .from('customers')
      .upsert(customers, {
        onConflict: 'user_id,phone',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error('Error uploading contacts:', error);
      result.failed = customers.length;
      return result;
    }

    // 결과 분석
    const uploadedCount = data?.length || 0;
    const totalCount = customers.length;

    result.success = uploadedCount;
    result.duplicates = totalCount - uploadedCount;

    return result;
  } catch (error) {
    console.error('Error in uploadContacts:', error);
    result.failed = contacts.length;
    return result;
  }
}




