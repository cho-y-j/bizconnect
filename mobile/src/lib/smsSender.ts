import { Platform, PermissionsAndroid, Alert } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { supabase } from '../../lib/supabaseClient';
import { Task } from './types/task';
import { incrementSentCount } from './dailyLimit';

/**
 * SMS 발송 권한 확인
 */
export async function checkSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.SEND_SMS
    );
    return granted;
  } catch (error) {
    console.error('Error checking SMS permission:', error);
    return false;
  }
}

/**
 * SMS 발송 권한 요청
 */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      {
        title: 'SMS 발송 권한',
        message: '문자 메시지를 발송하기 위해 권한이 필요합니다.',
        buttonNeutral: '나중에',
        buttonNegative: '취소',
        buttonPositive: '허용',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting SMS permission:', error);
    return false;
  }
}

/**
 * 전화번호 정규화
 */
function normalizePhoneNumber(phone: string): string {
  // 하이픈, 공백 제거
  return phone.replace(/[\s-]/g, '');
}

/**
 * 전화번호 유효성 검사
 */
function validatePhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  // 한국 전화번호 형식: 010으로 시작하는 11자리 또는 10자리
  return /^010\d{7,8}$/.test(normalized);
}

/**
 * 메시지 길이 체크
 */
function checkMessageLength(message: string): {
  isValid: boolean;
  length: number;
  maxLength: number;
  isLongMessage: boolean;
} {
  const length = message.length;
  const maxLength = 90; // SMS 기본 길이
  const longMessageMaxLength = 160; // 장문 SMS 길이
  const isLongMessage = length > maxLength;

  return {
    isValid: length <= longMessageMaxLength,
    length,
    maxLength: isLongMessage ? longMessageMaxLength : maxLength,
    isLongMessage,
  };
}

/**
 * SMS 발송
 */
export async function sendSms(
  task: Task,
  onSuccess?: () => void,
  onFailure?: (error: string) => void
): Promise<boolean> {
  try {
    // 권한 확인
    const hasPermission = await checkSmsPermission();
    if (!hasPermission) {
      const granted = await requestSmsPermission();
      if (!granted) {
        const error = 'SMS 발송 권한이 필요합니다.';
        await updateTaskStatus(task.id, 'failed', error);
        onFailure?.(error);
        return false;
      }
    }

    // 전화번호 유효성 검사
    const normalizedPhone = normalizePhoneNumber(task.customer_phone);
    if (!validatePhoneNumber(normalizedPhone)) {
      const error = '유효하지 않은 전화번호입니다.';
      await updateTaskStatus(task.id, 'failed', error);
      onFailure?.(error);
      return false;
    }

    // 메시지 길이 체크
    const messageCheck = checkMessageLength(task.message_content);
    if (!messageCheck.isValid) {
      const error = `메시지가 너무 깁니다. (${messageCheck.length}/${messageCheck.maxLength}자)`;
      await updateTaskStatus(task.id, 'failed', error);
      onFailure?.(error);
      return false;
    }

    // 작업 상태를 'processing'으로 업데이트
    await updateTaskStatus(task.id, 'processing');

    // SMS 발송
    return new Promise((resolve) => {
      SmsAndroid.autoSend(
        normalizedPhone,
        task.message_content,
        (fail: any) => {
          console.error('Failed to send SMS:', fail);
          const error = fail?.message || 'SMS 발송 실패';
          updateTaskStatus(task.id, 'failed', error);
          onFailure?.(error);
          resolve(false);
        },
        async (success: any) => {
          console.log('SMS sent successfully:', success);

          // 발송 기록 저장
          await saveSmsLog(task, normalizedPhone, 'sent');

          // 일일 한도 카운트 증가
          await incrementSentCount(task.user_id);

          // 작업 상태를 'completed'로 업데이트
          await updateTaskStatus(task.id, 'completed');

          onSuccess?.();
          resolve(true);
        }
      );
    });
  } catch (error: any) {
    console.error('Error in sendSms:', error);
    const errorMessage = error?.message || '알 수 없는 오류가 발생했습니다.';
    await updateTaskStatus(task.id, 'failed', errorMessage);
    onFailure?.(errorMessage);
    return false;
  }
}

/**
 * 작업 상태 업데이트
 */
async function updateTaskStatus(
  taskId: string,
  status: Task['status'],
  errorMessage?: string
): Promise<void> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task status:', error);
    }
  } catch (error) {
    console.error('Error in updateTaskStatus:', error);
  }
}

/**
 * SMS 발송 기록 저장
 */
async function saveSmsLog(
  task: Task,
  phoneNumber: string,
  status: 'sent' | 'failed'
): Promise<void> {
  try {
    const { error } = await supabase.from('sms_logs').insert({
      user_id: task.user_id,
      task_id: task.id,
      phone_number: phoneNumber,
      message: task.message_content,
      status,
      sent_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error saving SMS log:', error);
    }
  } catch (error) {
    console.error('Error in saveSmsLog:', error);
  }
}



