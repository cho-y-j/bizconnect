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
 * MMS 발송 (명함 이미지 첨부)
 * TODO: React Native에서 MMS 직접 발송 구현 필요
 * 현재는 SMS로 대체하여 발송 (이미지는 제외)
 */
async function sendMms(
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
        const error = 'MMS 발송 권한이 필요합니다.';
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

    // 작업 상태를 'processing'으로 업데이트
    await updateTaskStatus(task.id, 'processing');

    // TODO: 실제 MMS 발송 구현
    // 현재는 이미지 없이 SMS로 발송
    // React Native에서 MMS를 직접 보내려면:
    // 1. Android Intent 사용
    // 2. 또는 네이티브 모듈 구현 필요
    
    console.warn('MMS 발송은 아직 구현되지 않았습니다. SMS로 대체하여 발송합니다.');
    
    // 임시로 SMS로 발송 (이미지 제외)
    return sendSms(task, onSuccess, onFailure);
  } catch (error: any) {
    console.error('Error in sendMms:', error);
    const errorMessage = error?.message || 'MMS 발송 중 오류가 발생했습니다.';
    await updateTaskStatus(task.id, 'failed', errorMessage);
    onFailure?.(errorMessage);
    return false;
  }
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
    // MMS인 경우 별도 처리
    if (task.is_mms) {
      return sendMms(task, onSuccess, onFailure);
    }

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

    console.log('📱 Calling SmsAndroid.autoSend:', normalizedPhone, task.message_content.substring(0, 20) + '...');

    // SMS 발송 (타임아웃 추가)
    return new Promise((resolve) => {
      let resolved = false;
      const TIMEOUT = 30000; // 30초 타임아웃

      // 타임아웃 설정
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error('❌ SMS send timeout after 30 seconds');
          const error = 'SMS 발송 타임아웃 (30초 초과)';
          updateTaskStatus(task.id, 'failed', error);
          onFailure?.(error);
          resolve(false);
        }
      }, TIMEOUT);

      try {
        console.log('📱 SmsAndroid.autoSend called, waiting for callback...');
        SmsAndroid.autoSend(
          normalizedPhone,
          task.message_content,
          (fail: any) => {
            if (resolved) {
              console.warn('⚠️ SMS fail callback called after timeout');
              return;
            }
            resolved = true;
            clearTimeout(timeoutId);
            console.error('❌ Failed to send SMS:', fail);
            const error = fail?.message || fail?.toString() || 'SMS 발송 실패';
            updateTaskStatus(task.id, 'failed', error);
            onFailure?.(error);
            resolve(false);
          },
          async (success: any) => {
            if (resolved) {
              console.warn('⚠️ SMS success callback called after timeout');
              return;
            }
            resolved = true;
            clearTimeout(timeoutId);
            console.log('✅ SMS sent successfully - callback received:', success);
            console.log('📝 Task details:', {
              id: task.id,
              phone: normalizedPhone,
              message_length: task.message_content.length
            });

            try {
              // 발송 기록 저장
              console.log('💾 Step 1: Saving SMS log...');
              await saveSmsLog(task, normalizedPhone, 'sent');
              console.log('✅ Step 1: SMS log saved');

              // 일일 한도 카운트 증가
              console.log('💾 Step 2: Incrementing daily limit...');
              await incrementSentCount(task.user_id);
              console.log('✅ Step 2: Daily limit incremented');

              // 작업 상태를 'completed'로 업데이트
              console.log('💾 Step 3: Updating task status to completed...');
              await updateTaskStatus(task.id, 'completed');
              console.log('✅ Step 3: Task status updated to completed');

              console.log('🎉 SMS sending process completed successfully!');
              onSuccess?.();
              resolve(true);
            } catch (error: any) {
              console.error('❌ Error in SMS success callback:', error);
              console.error('Error details:', error?.message, error?.stack);
              // 발송은 성공했지만 후처리 실패 - 그래도 completed로 표시
              try {
                await updateTaskStatus(task.id, 'completed');
                console.log('⚠️ Task marked as completed despite post-processing error');
              } catch (updateError) {
                console.error('❌ Failed to update task status:', updateError);
              }
              onSuccess?.();
              resolve(true);
            }
          }
        );
      } catch (error: any) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        console.error('❌ Error calling SmsAndroid.autoSend:', error);
        const errorMessage = error?.message || 'SMS 발송 함수 호출 실패';
        updateTaskStatus(task.id, 'failed', errorMessage);
        onFailure?.(errorMessage);
        resolve(false);
      }
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
    console.log('💾 Saving SMS log to database:', {
      task_id: task.id,
      phone: phoneNumber,
      status,
      user_id: task.user_id
    });

    const logData = {
      user_id: task.user_id,
      task_id: task.id,
      phone_number: phoneNumber,
      message: task.message_content,
      status,
      sent_at: new Date().toISOString(),
      image_url: task.image_url || null,
      is_mms: task.is_mms || false,
    };

    const { data, error } = await supabase.from('sms_logs').insert(logData).select();

    if (error) {
      console.error('❌ Error saving SMS log:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error; // 에러를 다시 throw하여 호출자가 알 수 있도록
    } else {
      console.log('✅ SMS log saved successfully:', data);
    }
  } catch (error: any) {
    console.error('❌ Error in saveSmsLog:', error);
    console.error('Error stack:', error?.stack);
    // 에러를 다시 throw하지 않음 - 발송은 성공했을 수 있으므로
  }
}

/**
 * 직접 SMS 발송 (테스트용 - Task 없이 바로 발송)
 */
export async function sendSmsDirectly(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    console.log('=== sendSmsDirectly START ===');

    // 권한 확인
    const hasPermission = await checkSmsPermission();
    console.log('SMS Permission:', hasPermission);

    if (!hasPermission) {
      const granted = await requestSmsPermission();
      console.log('Permission granted:', granted);
      if (!granted) {
        throw new Error('SMS 발송 권한이 없습니다.');
      }
    }

    // 전화번호 정규화
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    console.log('Normalized phone:', normalizedPhone);

    // SMS 발송
    return new Promise((resolve, reject) => {
      console.log('Calling SmsAndroid.autoSend...');
      SmsAndroid.autoSend(
        normalizedPhone,
        message,
        (fail: any) => {
          console.error('=== SMS FAILED ===', fail);
          reject(new Error(fail?.message || 'SMS 발송 실패'));
        },
        (success: any) => {
          console.log('=== SMS SUCCESS ===', success);
          resolve(true);
        }
      );
    });
  } catch (error: any) {
    console.error('=== sendSmsDirectly ERROR ===', error);
    throw error;
  }
}

/**
 * MMS 발송 (이미지 첨부)
 * 이미지 URL을 다운로드하여 MMS로 발송
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

    // 권한 확인
    const hasPermission = await checkSmsPermission();
    console.log('SMS Permission:', hasPermission);

    if (!hasPermission) {
      const granted = await requestSmsPermission();
      console.log('Permission granted:', granted);
      if (!granted) {
        throw new Error('MMS 발송 권한이 없습니다.');
      }
    }

    // 전화번호 정규화
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    console.log('Normalized phone:', normalizedPhone);

    // MMS 발송 (네이티브 모듈 호출)
    return new Promise((resolve, reject) => {
      console.log('Calling SmsAndroid.sendMms...');

      // sendMms 메서드가 있는지 확인
      if (typeof SmsAndroid.sendMms === 'function') {
        SmsAndroid.sendMms(
          normalizedPhone,
          message,
          imageUrl,
          (fail: any) => {
            console.error('=== MMS FAILED ===', fail);
            reject(new Error(fail?.message || 'MMS 발송 실패'));
          },
          (success: any) => {
            console.log('=== MMS SUCCESS ===', success);
            resolve(true);
          }
        );
      } else {
        // sendMms가 없으면 SMS로 대체
        console.warn('sendMms not available, falling back to SMS');
        SmsAndroid.autoSend(
          normalizedPhone,
          message + '\n\n[명함 이미지: ' + imageUrl + ']',
          (fail: any) => {
            console.error('=== SMS FALLBACK FAILED ===', fail);
            reject(new Error(fail?.message || 'SMS 발송 실패'));
          },
          (success: any) => {
            console.log('=== SMS FALLBACK SUCCESS ===', success);
            resolve(true);
          }
        );
      }
    });
  } catch (error: any) {
    console.error('=== sendMmsDirectly ERROR ===', error);
    throw error;
  }
}




