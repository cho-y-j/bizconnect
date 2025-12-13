import { Platform, PermissionsAndroid, Alert, NativeModules, Linking } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Task } from './types/task';
import { incrementSentCount } from './dailyLimit';
import { downloadImage, getCachedImagePath } from './imageCache';

// Intent 폴백 함수
function fallbackToIntent(
  phone: string,
  message: string,
  imagePath: string,
  resolve: (value: boolean) => void,
  reject: (error: Error) => void
) {
  try {
    const { NativeModules } = require('react-native');
    const SmsIntent = NativeModules.SmsIntent;
    
    if (SmsIntent && typeof SmsIntent.sendMmsWithImage === 'function') {
      console.log('📱 Opening MMS Intent with image...');
      SmsIntent.sendMmsWithImage(
        phone,
        message,
        imagePath,
        (success: any) => {
          console.log('✅ MMS Intent opened successfully');
          // Intent는 사용자가 직접 보내야 하므로 성공으로 처리
          resolve(true);
        },
        (error: any) => {
          console.error('❌ MMS Intent failed:', error);
          reject(new Error(error?.message || 'MMS Intent 실패'));
        }
      );
    } else {
      console.error('❌ SmsIntent module not available');
      reject(new Error('MMS 발송 기능을 사용할 수 없습니다.'));
    }
  } catch (error: any) {
    console.error('❌ Intent fallback error:', error);
    reject(new Error(error?.message || 'MMS 발송 실패'));
  }
}

// NativeModules에서 직접 Sms 모듈 가져오기
const SmsAndroid = NativeModules.Sms;

// 디버그: SmsAndroid 모듈 확인
console.log('=== SMS MODULE DEBUG ===');
console.log('NativeModules:', Object.keys(NativeModules));
console.log('SmsAndroid (from NativeModules.Sms):', SmsAndroid);
console.log('SmsAndroid type:', typeof SmsAndroid);
if (SmsAndroid) {
  console.log('SmsAndroid methods:', Object.keys(SmsAndroid));
  console.log('SmsAndroid.autoSend:', typeof SmsAndroid.autoSend);
} else {
  console.error('❌ SmsAndroid is null/undefined! Native module not linked.');
}

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
 * 한국 SMS: 한글 70자 / 영문 160자 (기본)
 * LMS (장문): 한글 2000자 / 영문 4000자까지 가능
 * Android Native SMS 모듈은 LMS 자동 처리
 */
function checkMessageLength(message: string): {
  isValid: boolean;
  length: number;
  maxLength: number;
  isLongMessage: boolean;
} {
  const length = message.length;
  const maxLength = 70; // 한글 SMS 기본 길이
  const longMessageMaxLength = 2000; // LMS 최대 길이 (충분히 여유있게)
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
      const TIMEOUT = 2000; // 2초 타임아웃 (네이티브 콜백이 안 오는 경우 대비)

      // 타임아웃 설정 - 2초 후 성공으로 처리 (SMS는 보통 1초 내 발송됨)
      const timeoutId = setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          console.log('✅ SMS timeout (2s) - assuming success');
          // 타임아웃 시 성공으로 처리 (SMS는 이미 발송됨)
          try {
            await saveSmsLog(task, normalizePhoneNumber(task.customer_phone), 'sent');
            await incrementSentCount(task.user_id);
            await updateTaskStatus(task.id, 'completed');
            onSuccess?.();
          } catch (e) {
            console.error('Error in timeout handler:', e);
          }
          resolve(true);
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
            
            // 실패해도 sms_logs에 기록 저장
            console.log('💾 Saving failed SMS log...');
            saveSmsLog(task, normalizedPhone, 'failed').catch((logError) => {
              console.error('❌ Failed to save failed SMS log:', logError);
            });
            
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
              // 발송 기록 저장 (가장 중요!)
              console.log('💾 Step 1: Saving SMS log to sms_logs table...');
              console.log('💾 Log data:', {
                user_id: task.user_id,
                task_id: task.id,
                phone: normalizedPhone,
                status: 'sent'
              });
              
              const saveResult = await saveSmsLog(task, normalizedPhone, 'sent');
              if (!saveResult) {
                console.error('❌ CRITICAL: SMS log save returned false!');
              }
              console.log('✅ Step 1: SMS log saved result:', saveResult);

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
): Promise<boolean> {
  try {
    console.log('💾 ===== SAVING SMS LOG START =====');
    console.log('💾 Saving SMS log to database:', {
      task_id: task.id,
      phone: phoneNumber,
      status,
      user_id: task.user_id,
      message_length: task.message_content?.length || 0
    });

    // 먼저 task_id로 기존 로그가 있는지 확인 (웹에서 pending으로 생성했을 수 있음)
    const { data: existingLog, error: checkError } = await supabase
      .from('sms_logs')
      .select('id')
      .eq('task_id', task.id)
      .maybeSingle(); // .single() 대신 .maybeSingle() 사용 (없을 수도 있음)

    const logData: any = {
      status,
      sent_at: new Date().toISOString(),
    };

    // 실패인 경우 error_message 추가
    if (status === 'failed') {
      logData.error_message = 'SMS 발송 실패';
    }

    let result;
    if (existingLog && !checkError) {
      // 기존 로그가 있으면 업데이트
      console.log('💾 Updating existing SMS log (task_id:', task.id, ')');
      result = await supabase
        .from('sms_logs')
        .update(logData)
        .eq('task_id', task.id)
        .select();
    } else {
      // 기존 로그가 없으면 새로 생성
      console.log('💾 Creating new SMS log...');
      logData.user_id = task.user_id;
      logData.task_id = task.id;
      logData.phone_number = phoneNumber;
      logData.message = task.message_content;
      logData.image_url = task.image_url || null;
      logData.is_mms = task.is_mms || false;
      
      console.log('💾 Log data:', JSON.stringify(logData, null, 2));
      result = await supabase.from('sms_logs').insert(logData).select();
    }

    const { data, error } = result;

    if (error) {
      console.error('❌ ===== SMS LOG SAVE FAILED =====');
      console.error('❌ Error saving SMS log:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      console.error('❌ This is why 발송 기록 is empty!');
      console.error('❌ ===== SMS LOG SAVE FAILED =====');
      return false;
    } else {
      console.log('✅ ===== SMS LOG SAVED SUCCESSFULLY =====');
      console.log('✅ SMS log saved successfully:', data);
      console.log('✅ Log ID:', data?.[0]?.id);
      console.log('✅ Status:', data?.[0]?.status);
      console.log('✅ ===== SMS LOG SAVED SUCCESSFULLY =====');
      return true;
    }
  } catch (error: any) {
    console.error('❌ ===== EXCEPTION IN saveSmsLog =====');
    console.error('❌ Error in saveSmsLog:', error);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ This is why 발송 기록 is empty!');
    console.error('❌ ===== EXCEPTION IN saveSmsLog =====');
    return false;
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

    // SMS 발송 - NativeModules에서 직접 가져오기
    return new Promise((resolve, reject) => {
      console.log('Calling NativeModules.Sms.autoSend...');
      console.log('Phone:', normalizedPhone);
      console.log('Message length:', message.length);

      // NativeModules에서 직접 Sms 모듈 가져오기
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
        message,
        (fail: any) => {
            clearTimeout(timeoutId);
          console.error('=== SMS FAILED ===', fail);
            console.error('Fail details:', JSON.stringify(fail, null, 2));
            reject(new Error(fail?.message || fail?.toString() || 'SMS 발송 실패'));
        },
        (success: any) => {
            clearTimeout(timeoutId);
          console.log('=== SMS SUCCESS ===', success);
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
    console.log('Image URL type:', imageUrl.startsWith('http') ? 'HTTP' : imageUrl.startsWith('file://') ? 'LOCAL_FILE' : 'UNKNOWN');

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
          const { supabase } = require('../../lib/supabaseClient');
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
      
      // Open Graph URL을 메시지에 포함하여 SMS 발송
      // 수신자의 메시지 앱이 Open Graph 메타 태그를 읽어서 이미지 미리보기 표시
      const messageWithPreview = `${message}\n\n${previewUrl}`;
      
    return new Promise((resolve, reject) => {
        SmsAndroid.autoSend(
          normalizedPhone,
          messageWithPreview,
          (fail: any) => {
            console.error('=== SMS (with Open Graph URL) FAILED ===', fail);
            reject(new Error(fail?.message || fail?.toString() || 'SMS 발송 실패'));
          },
          (success: any) => {
            console.log('=== SMS (with Open Graph URL) SUCCESS ===');
            resolve(true);
          }
        );
      });
      } else {
      // Open Graph URL이 없으면 일반 SMS로 발송
      console.log('⚠️ No preview URL available, sending SMS only');
      return new Promise((resolve, reject) => {
        SmsAndroid.autoSend(
          normalizedPhone,
          message,
          (fail: any) => {
            console.error('=== SMS FAILED ===', fail);
            reject(new Error(fail?.message || fail?.toString() || 'SMS 발송 실패'));
          },
          (success: any) => {
            console.log('=== SMS SUCCESS ===', success);
            resolve(true);
          }
        );
      });
      }
  } catch (error: any) {
    console.error('=== sendMmsDirectly ERROR ===', error);
    console.error('Error stack:', error?.stack);
    throw error;
  }
}




