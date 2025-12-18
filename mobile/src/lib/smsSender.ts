import { Platform, PermissionsAndroid, Alert } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { supabase } from '../../lib/supabaseClient';
import { Task } from './types/task';
import { incrementSentCount } from './dailyLimit';
import { createShortPreviewUrl } from './shortUrl';

// SMS 최대 길이 (90바이트 기준)
const SMS_MAX_BYTES = 90;

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
      let isResolved = false; // 중복 resolve 방지
      
      SmsAndroid.autoSend(
        normalizedPhone,
        task.message_content,
        (fail: any) => {
          if (isResolved) {
            console.warn('⚠️ [sendSms] Already resolved, ignoring fail callback');
            return;
          }
          isResolved = true;
          console.error('Failed to send SMS:', fail);
          const error = fail?.message || 'SMS 발송 실패';
          updateTaskStatus(task.id, 'failed', error).catch((err) => {
            console.error('Error updating task status to failed:', err);
          });
          onFailure?.(error);
          resolve(false);
        },
        async (success: any) => {
          if (isResolved) {
            console.warn('⚠️ [sendSms] Already resolved, ignoring success callback');
            return;
          }
          isResolved = true;
          console.log('SMS sent successfully:', success);

          try {
            // 발송 기록 저장
            await saveSmsLog(task, normalizedPhone, 'sent');

            // 일일 한도 카운트 증가
            await incrementSentCount(task.user_id);

            // 작업 상태를 'completed'로 업데이트 (마지막에)
            await updateTaskStatus(task.id, 'completed');

            onSuccess?.();
            resolve(true);
          } catch (error: any) {
            console.error('Error in success callback:', error);
            // 성공했지만 상태 업데이트 실패한 경우에도 성공으로 처리
            onSuccess?.();
            resolve(true);
          }
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
 * SMS 발송 기록 저장/업데이트
 * 웹에서 이미 'pending' 상태로 생성했으면 UPDATE, 없으면 INSERT
 */
async function saveSmsLog(
  task: Task,
  phoneNumber: string,
  status: 'sent' | 'failed'
): Promise<void> {
  try {
    // 먼저 기존 로그가 있는지 확인 (웹에서 생성한 pending 로그)
    const { data: existingLog, error: selectError } = await supabase
      .from('sms_logs')
      .select('id')
      .eq('task_id', task.id)
      .maybeSingle();

    if (selectError) {
      console.warn('⚠️ Error checking existing SMS log:', selectError.message);
    }

    if (existingLog) {
      // 기존 로그가 있으면 UPDATE
      console.log('📝 Updating existing SMS log:', existingLog.id);
      const { error: updateError } = await supabase
        .from('sms_logs')
        .update({
          status,
          sent_at: new Date().toISOString(),
        })
        .eq('id', existingLog.id);

      if (updateError) {
        console.error('Error updating SMS log:', updateError);
      } else {
        console.log('✅ SMS log updated to:', status);
      }
    } else {
      // 기존 로그가 없으면 INSERT (직접 발송 등)
      console.log('📝 Inserting new SMS log for task:', task.id);
      const { error: insertError } = await supabase.from('sms_logs').insert({
        user_id: task.user_id,
        task_id: task.id,
        phone_number: phoneNumber,
        message: task.message_content,
        status,
        sent_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('Error inserting SMS log:', insertError);
      } else {
        console.log('✅ SMS log inserted');
      }
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

    // 이미 Open Graph URL인지 확인 (callbackManager에서 이미 변환된 경우)
    // 파라미터 이름이 imageUrl이지만 실제로는 previewUrl일 수 있음
    let previewUrl: string | null = null;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // 이미 Open Graph URL인 경우 (callbackManager에서 변환된 경우)
      // /p/, /preview/, /api/preview/ 패턴 모두 허용
      if (imageUrl.includes('/p/') || imageUrl.includes('/preview/') || imageUrl.includes('/api/preview/')) {
        previewUrl = imageUrl;
        console.log('✅ Already Open Graph URL:', previewUrl);
      } else {
        // 일반 이미지 URL인 경우에만 Open Graph URL로 변환 시도
        console.log('⚠️ Not an Open Graph URL, attempting conversion...');
        try {
          const { data: image, error } = await supabase
            .from('user_images')
            .select('id')
            .eq('image_url', imageUrl)
            .single();

          if (!error && image) {
            // Base62 인코딩으로 URL 단축 (73자 → 52자)
            previewUrl = createShortPreviewUrl(image.id);
            console.log('✅ Converted to Base62 short URL:', previewUrl);
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

      // 메시지 + URL 합쳐서 길이 확인
      const messageWithPreview = `${message}\n\n${previewUrl}`;
      console.log('📤 Final message length:', messageWithPreview.length);
      console.log('📤 Message:', message);
      console.log('📤 URL:', previewUrl);
      console.log('📤 SMS max bytes:', SMS_MAX_BYTES);

      // NativeModules에서 직접 Sms 모듈 가져오기
      const { NativeModules } = require('react-native');
      const SmsModule = NativeModules.Sms;

      if (!SmsModule || typeof SmsModule.autoSend !== 'function') {
        console.error('❌ SmsModule.autoSend is not a function!');
        throw new Error('SMS 모듈이 로드되지 않았습니다.');
      }

      // 90바이트 초과 시 분리 발송
      if (messageWithPreview.length > SMS_MAX_BYTES) {
        console.log('⚠️ Message exceeds 90 bytes, sending as 2 separate SMS');
        console.log('📤 SMS 1: Message only (' + message.length + ' chars)');
        console.log('📤 SMS 2: URL only (' + previewUrl.length + ' chars)');

        // SMS 1: 메시지만 발송
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('SMS 1 발송 타임아웃'));
          }, 30000);

          SmsModule.autoSend(
            normalizedPhone,
            message,
            (fail: any) => {
              clearTimeout(timeoutId);
              console.error('=== SMS 1 (message) FAILED ===', fail);
              reject(new Error(fail?.message || 'SMS 1 발송 실패'));
            },
            (success: any) => {
              clearTimeout(timeoutId);
              console.log('=== SMS 1 (message) SUCCESS ===');
              resolve();
            }
          );
        });

        // 잠시 대기 (연속 발송 방지)
        await new Promise(r => setTimeout(r, 500));

        // SMS 2: URL만 발송
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('SMS 2 발송 타임아웃'));
          }, 30000);

          SmsModule.autoSend(
            normalizedPhone,
            previewUrl,
            (fail: any) => {
              clearTimeout(timeoutId);
              console.error('=== SMS 2 (URL) FAILED ===', fail);
              reject(new Error(fail?.message || 'SMS 2 발송 실패'));
            },
            (success: any) => {
              clearTimeout(timeoutId);
              console.log('=== SMS 2 (URL) SUCCESS ===');
              console.log('✅ Both SMS sent successfully (separated)');
              resolve(true);
            }
          );
        });
      }

      // 90바이트 이하면 합쳐서 1건으로 발송
      console.log('✅ Message within 90 bytes, sending as 1 SMS');
      return new Promise((resolve, reject) => {
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




