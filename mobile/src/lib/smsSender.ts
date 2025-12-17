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

/**
 * 직접 SMS 발송 (Task 없이)
 * 앱에서 직접 문자 보낼 때 사용
 */
export async function sendSmsDirectly(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    console.log('=== sendSmsDirectly START ===');
    console.log('Phone:', phoneNumber);
    console.log('Message:', message);
    console.log('Message length:', message.length);

    // 권한 확인
    const hasPermission = await checkSmsPermission();
    if (!hasPermission) {
      const granted = await requestSmsPermission();
      if (!granted) {
        throw new Error('SMS 발송 권한이 필요합니다.');
      }
    }

    // 전화번호 정규화
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    console.log('Normalized phone:', normalizedPhone);

    // 전화번호 유효성 검사
    if (!validatePhoneNumber(normalizedPhone)) {
      throw new Error('유효하지 않은 전화번호입니다.');
    }

    // 메시지 길이 체크
    const messageCheck = checkMessageLength(message);
    if (!messageCheck.isValid) {
      throw new Error(`메시지가 너무 깁니다. (${messageCheck.length}/${messageCheck.maxLength}자)`);
    }

    // NativeModules에서 직접 Sms 모듈 가져오기
    const { NativeModules } = require('react-native');
    const SmsModule = NativeModules.Sms;
    
    if (!SmsModule || typeof SmsModule.autoSend !== 'function') {
      throw new Error('SMS 모듈이 로드되지 않았습니다.');
    }

    // SMS 발송
    return new Promise((resolve, reject) => {
      console.log('Calling NativeModules.Sms.autoSend...');
      
      // 타임아웃 설정 (30초)
      const timeoutId = setTimeout(() => {
        console.error('=== SMS TIMEOUT (30s) ===');
        reject(new Error('SMS 발송 타임아웃 (30초 초과)'));
      }, 30000);

      try {
        SmsModule.autoSend(
          normalizedPhone,
          message,
          (fail: any) => {
            clearTimeout(timeoutId);
            console.error('=== SMS FAILED ===', fail);
            console.error('Fail details:', JSON.stringify(fail, null, 2));
            reject(new Error(fail?.message || fail?.toString() || 'SMS 발송 실패'));
          },
          (success: any) => {
            clearTimeout(timeoutId);
            console.log('=== SMS SUCCESS ===');
            console.log('Success details:', JSON.stringify(success, null, 2));
            resolve(true);
          }
        );
        console.log('✅ NativeModules.Sms.autoSend called successfully');
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('=== SMS EXCEPTION ===', error);
        reject(new Error(error?.message || 'SMS 발송 중 예외 발생'));
      }
    });
  } catch (error: any) {
    console.error('=== sendSmsDirectly ERROR ===', error);
    console.error('Error stack:', error?.stack);
    throw error;
  }
}

/**
 * 직접 MMS 발송 (이미지 URL 포함)
 * 앱에서 명함 첨부하고 문자 보낼 때 사용
 * Open Graph URL을 메시지에 포함하여 SMS로 발송 (Android가 자동으로 multipart SMS 처리)
 */
export async function sendMmsDirectly(
  phoneNumber: string,
  message: string,
  imageUrl: string
): Promise<boolean> {
  try {
    console.log('=== sendMmsDirectly START ===');
    console.log('Phone:', phoneNumber);
    console.log('Message:', message);
    console.log('Image URL:', imageUrl);
    console.log('Image URL type:', imageUrl.startsWith('http') ? 'HTTP' : imageUrl.startsWith('file://') ? 'LOCAL_FILE' : 'UNKNOWN');

    // 권한 확인
    const hasPermission = await checkSmsPermission();
    if (!hasPermission) {
      const granted = await requestSmsPermission();
      if (!granted) {
        throw new Error('MMS 발송 권한이 필요합니다.');
      }
    }

    // 전화번호 정규화
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    console.log('Normalized phone:', normalizedPhone);

    // 전화번호 유효성 검사
    if (!validatePhoneNumber(normalizedPhone)) {
      throw new Error('유효하지 않은 전화번호입니다.');
    }

    // Open Graph URL로 변환 또는 사용
    let previewUrl: string | null = null;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // HTTP URL인 경우
      if (imageUrl.includes('/preview/') || imageUrl.includes('/api/preview/')) {
        // 이미 Open Graph URL인 경우
        previewUrl = imageUrl;
        console.log('✅ Already Open Graph URL:', previewUrl);
      } else {
        // 일반 이미지 URL인 경우 Open Graph URL로 변환 시도
        try {
          const { data: image, error } = await supabase
            .from('user_images')
            .select('id')
            .eq('image_url', imageUrl)
            .single();
          
          if (!error && image) {
            const baseUrl = 'https://bizconnect-ten.vercel.app';
            previewUrl = `${baseUrl}/api/preview/${image.id}`;
            console.log('✅ Converted to Open Graph URL:', previewUrl);
          } else {
            // 변환 실패 시 원본 URL 사용
            previewUrl = imageUrl;
            console.warn('⚠️ Could not convert to Open Graph URL, using original:', previewUrl);
          }
        } catch (error: any) {
          console.error('❌ Error converting to Open Graph URL:', error);
          previewUrl = imageUrl;
        }
      }
    } else {
      // 로컬 파일인 경우는 Open Graph URL로 변환 불가
      console.warn('⚠️ Local file cannot be converted to Open Graph URL');
      previewUrl = null;
    }

    // Open Graph URL이 있으면 메시지에 포함하여 SMS 발송
    if (previewUrl) {
      console.log('📷 Sending SMS with Open Graph preview URL:', previewUrl);
      
      // Open Graph URL을 메시지 마지막에 배치
      // 일반 문자 발송과 동일한 방식으로 처리 (Android가 자동으로 multipart SMS 처리)
      const messageWithPreview = `${message}\n\n${previewUrl}`;
      console.log('📤 Final message length:', messageWithPreview.length);
      
      // sendSmsDirectly와 동일한 방식으로 NativeModules.Sms 사용
      return new Promise((resolve, reject) => {
        console.log('Calling NativeModules.Sms.autoSend...');
        console.log('Phone:', normalizedPhone);
        console.log('Message length:', messageWithPreview.length);

        // NativeModules에서 직접 Sms 모듈 가져오기
        const { NativeModules } = require('react-native');
        const SmsModule = NativeModules.Sms;
        console.log('SmsModule:', SmsModule);
        console.log('SmsModule.autoSend:', typeof SmsModule?.autoSend);

        if (!SmsModule || typeof SmsModule.autoSend !== 'function') {
          console.error('❌ SmsModule.autoSend is not a function!');
          reject(new Error('SMS 모듈이 로드되지 않았습니다.'));
          return;
        }

        // 타임아웃 설정 (30초)
        const timeoutId = setTimeout(() => {
          console.error('=== SMS TIMEOUT (30s) ===');
          reject(new Error('SMS 발송 타임아웃 (30초 초과)'));
        }, 30000);

        try {
          console.log('✅ Calling SmsModule.autoSend now...');
          SmsModule.autoSend(
            normalizedPhone,
            messageWithPreview,
            (fail: any) => {
              clearTimeout(timeoutId);
              console.error('=== SMS (with Open Graph URL) FAILED ===', fail);
              console.error('Fail details:', JSON.stringify(fail, null, 2));
              reject(new Error(fail?.message || fail?.toString() || 'SMS 발송 실패'));
            },
            (success: any) => {
              clearTimeout(timeoutId);
              console.log('=== SMS (with Open Graph URL) SUCCESS ===');
              console.log('Success details:', JSON.stringify(success, null, 2));
              resolve(true);
            }
          );
          console.log('✅ SmsModule.autoSend called successfully');
        } catch (error: any) {
          clearTimeout(timeoutId);
          console.error('=== SMS EXCEPTION ===', error);
          reject(new Error(error?.message || 'SMS 발송 중 예외 발생'));
        }
      });
    } else {
      // Open Graph URL이 없으면 일반 SMS로 발송
      console.log('⚠️ No preview URL available, calling sendSmsDirectly for SMS only');
      return sendSmsDirectly(phoneNumber, message);
    }
  } catch (error: any) {
    console.error('=== sendMmsDirectly ERROR ===', error);
    console.error('Error stack:', error?.stack);
    throw error;
  }
}




