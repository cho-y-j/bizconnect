import { Platform } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { Customer } from './types/customer';
import { Task } from './types/task';
import { taskService } from '../services/taskService';
import { replaceTemplateVariables } from './templateParser';

// 콜백 이벤트 타입
export type CallEventType = 'ended' | 'missed' | 'busy';

export interface CallbackConfig {
  enabled: boolean;
  autoSend: boolean;
  delay: number;
  // 3가지 옵션별 설정 (메시지 + 개별 이미지)
  onEndEnabled: boolean;
  onEndMessage: string;
  onEndImageUrl: string | null;  // 통화종료 전용 이미지
  onMissedEnabled: boolean;
  onMissedMessage: string;
  onMissedImageUrl: string | null;  // 부재중 전용 이미지
  onBusyEnabled: boolean;
  onBusyMessage: string;
  onBusyImageUrl: string | null;  // 통화중 전용 이미지
  // 기본 명함 이미지 (개별 이미지 없을 때 사용)
  businessCardEnabled: boolean;
  businessCardImageUrl: string | null;
}

// 기본 메시지
const DEFAULT_MESSAGES = {
  ended: '안녕하세요, 방금 통화 감사합니다. 궁금하신 점 있으시면 편하게 연락주세요.',
  missed: '안녕하세요, 전화를 받지 못해 죄송합니다. 확인 후 다시 연락드리겠습니다.',
  busy: '안녕하세요, 통화중이라 받지 못했습니다. 잠시 후 연락드리겠습니다.',
};

/**
 * 전화번호 정규화
 */
function normalizePhoneNumber(phone: string): string {
  // 하이픈, 공백, 괄호 제거
  return phone.replace(/[\s\-\(\)]/g, '');
}

/**
 * 전화번호로 고객 검색 (그룹 정보 포함)
 */
async function findCustomerByPhone(
  userId: string,
  phoneNumber: string
): Promise<Customer | null> {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // customers 테이블에서 검색 (그룹 정보 포함)
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        *,
        group:customer_groups(id, name)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching customers:', error);
      return null;
    }

    if (!customers) return null;

    // 정규화된 전화번호로 매칭
    const customer = customers.find(
      (c) => normalizePhoneNumber(c.phone) === normalizedPhone
    );

    return customer || null;
  } catch (error) {
    console.error('Error in findCustomerByPhone:', error);
    return null;
  }
}

/**
 * 카테고리별 발송 여부 확인
 */
function shouldSendCallback(customer: Customer | null): boolean {
  if (!customer || !customer.group_id) {
    // 그룹이 없으면 발송 (신규 고객 포함)
    return true;
  }

  const groupName = customer.group?.name?.toLowerCase() || '';
  
  // 가족/친구는 발송 안 함
  if (
    groupName.includes('가족') ||
    groupName.includes('친구') ||
    groupName.includes('family') ||
    groupName.includes('friend')
  ) {
    return false;
  }

  return true;
}

/**
 * AI 사용 여부 확인
 */
function shouldUseAI(customer: Customer | null): boolean {
  if (!customer || !customer.group_id) {
    return false;
  }

  const groupName = customer.group?.name?.toLowerCase() || '';
  
  // 거래처/VIP는 AI 사용
  if (
    groupName.includes('거래처') ||
    groupName.includes('vip') ||
    groupName.includes('비즈니스') ||
    groupName.includes('business') ||
    groupName.includes('고객')
  ) {
    return true;
  }

  return false;
}

/**
 * 사용자 콜백 설정 조회
 */
async function getCallbackConfig(userId: string): Promise<CallbackConfig> {
  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select(`
        auto_callback_enabled,
        callback_on_end_enabled,
        callback_on_end_message,
        callback_on_end_image_url,
        callback_on_missed_enabled,
        callback_on_missed_message,
        callback_on_missed_image_url,
        callback_on_busy_enabled,
        callback_on_busy_message,
        callback_on_busy_image_url,
        business_card_enabled,
        business_card_image_url
      `)
      .eq('user_id', userId)
      .single();

    if (error || !settings) {
      // 설정이 없으면 기본값 (모든 옵션 비활성화 - 안전한 기본값)
      console.warn('⚠️ No callback settings found, using safe defaults (all disabled)');
      return {
        enabled: false, // 기본 비활성화 (안전)
        autoSend: true,
        delay: 0,
        onEndEnabled: false,
        onEndMessage: DEFAULT_MESSAGES.ended,
        onEndImageUrl: null,
        onMissedEnabled: false,
        onMissedMessage: DEFAULT_MESSAGES.missed,
        onMissedImageUrl: null,
        onBusyEnabled: false,
        onBusyMessage: DEFAULT_MESSAGES.busy,
        onBusyImageUrl: null,
        businessCardEnabled: false,
        businessCardImageUrl: null,
      };
    }

    return {
      enabled: settings.auto_callback_enabled ?? false, // null이면 false (안전)
      autoSend: true,
      delay: 0,
      onEndEnabled: settings.callback_on_end_enabled ?? false, // null이면 false (안전)
      onEndMessage: settings.callback_on_end_message || DEFAULT_MESSAGES.ended,
      onEndImageUrl: settings.callback_on_end_image_url || null,
      onMissedEnabled: settings.callback_on_missed_enabled ?? false, // null이면 false (안전)
      onMissedMessage: settings.callback_on_missed_message || DEFAULT_MESSAGES.missed,
      onMissedImageUrl: settings.callback_on_missed_image_url || null,
      onBusyEnabled: settings.callback_on_busy_enabled ?? false, // null이면 false (안전)
      onBusyMessage: settings.callback_on_busy_message || DEFAULT_MESSAGES.busy,
      onBusyImageUrl: settings.callback_on_busy_image_url || null,
      businessCardEnabled: settings.business_card_enabled ?? false,
      businessCardImageUrl: settings.business_card_image_url || null,
    };
  } catch (error) {
    console.error('Error in getCallbackConfig:', error);
    // 에러 시에도 안전한 기본값 반환 (모든 콜백 비활성화)
    console.warn('⚠️ Error fetching callback config, using safe defaults (all disabled)');
    return {
      enabled: false, // 에러 시 비활성화 (안전)
      autoSend: true,
      delay: 0,
      onEndEnabled: false,
      onEndMessage: DEFAULT_MESSAGES.ended,
      onEndImageUrl: null,
      onMissedEnabled: false,
      onMissedMessage: DEFAULT_MESSAGES.missed,
      onMissedImageUrl: null,
      onBusyEnabled: false,
      onBusyMessage: DEFAULT_MESSAGES.busy,
      onBusyImageUrl: null,
      businessCardEnabled: false,
      businessCardImageUrl: null,
    };
  }
}

/**
 * 콜백 템플릿 가져오기
 */
async function getCallbackTemplate(
  userId: string,
  isNewCustomer: boolean
): Promise<string | null> {
  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select(
        isNewCustomer ? 'callback_template_new' : 'callback_template_existing'
      )
      .eq('user_id', userId)
      .single();

    if (error || !settings) {
      return null;
    }

    return isNewCustomer
      ? settings.callback_template_new
      : settings.callback_template_existing;
  } catch (error) {
    console.error('Error in getCallbackTemplate:', error);
    return null;
  }
}

/**
 * 명함 이미지 URL 가져오기
 */
async function getBusinessCardImage(userId: string): Promise<string | null> {
  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('business_card_enabled, business_card_image_url')
      .eq('user_id', userId)
      .single();

    if (error || !settings) {
      return null;
    }

    // 명함 자동 첨부가 활성화되어 있고 이미지가 있으면 반환
    if (settings.business_card_enabled && settings.business_card_image_url) {
      return settings.business_card_image_url;
    }

    return null;
  } catch (error) {
    console.error('Error in getBusinessCardImage:', error);
    return null;
  }
}

/**
 * 콜백 문자 발송
 */
async function sendCallbackSms(
  userId: string,
  customer: Customer | null,
  phoneNumber: string,
  template: string
): Promise<void> {
  try {
    // 템플릿 변수 치환
    const message = replaceTemplateVariables(template, customer, phoneNumber);

    // 명함 이미지 확인
    const businessCardImage = await getBusinessCardImage(userId);
    const isMMS = !!businessCardImage;

    // tasks 테이블에 작업 생성
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        customer_id: customer?.id || null,
        customer_phone: phoneNumber,
        customer_name: customer?.name || null,
        message_content: message,
        type: isMMS ? 'send_mms' : 'callback',
        status: 'pending',
        priority: 1, // 콜백은 우선순위 높게
        image_url: businessCardImage,
        image_name: businessCardImage ? '명함' : null,
        is_mms: isMMS,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating callback task:', error);
      return;
    }

    // 큐에 추가 (taskService가 자동으로 처리)
    if (task) {
      await taskService.addTaskToQueue(task);
    }
  } catch (error) {
    console.error('Error in sendCallbackSms:', error);
  }
}

/**
 * 통화 종료 처리
 */
export async function handleCallEnded(
  userId: string,
  phoneNumber: string,
  onNewCustomer?: (customer: Customer | null, phoneNumber: string) => void,
  onCallbackReady?: (message: string) => void
): Promise<void> {
  try {
    console.log('=== CALLBACK START ===');
    console.log('Call ended with:', phoneNumber);
    console.log('User ID:', userId);

    // [테스트 모드] 무조건 발송 - DB 설정 무시
    // ⚠️ 테스트 모드 비활성화 - 프로덕션에서는 false로 설정
    const TEST_MODE = false;
    const DEFAULT_MESSAGE = '안녕하세요, 방금 통화 감사합니다. 궁금하신 점 있으시면 편하게 연락주세요.';

    if (TEST_MODE) {
      console.log('=== TEST MODE: 무조건 발송 ===');

      // 바로 SMS 발송 시도
      try {
        const { sendSmsDirectly } = require('./smsSender');
        console.log('Sending SMS to:', phoneNumber);
        console.log('Message:', DEFAULT_MESSAGE);

        await sendSmsDirectly(phoneNumber, DEFAULT_MESSAGE);
        console.log('=== SMS SENT SUCCESS ===');
      } catch (smsError) {
        console.error('=== SMS SEND ERROR ===', smsError);
      }
      return;
    }

    // [기존 로직] DB 설정 확인 후 발송
    // 콜백 설정 확인
    const config = await getCallbackConfig(userId);
    console.log('Callback config:', config);
    if (!config.enabled) {
      console.log('Callback is disabled');
      return;
    }

    // 고객 검색
    const customer = await findCustomerByPhone(userId, phoneNumber);
    const isNewCustomer = !customer;
    console.log('Customer found:', customer ? customer.name : 'New customer');

    // 카테고리별 발송 여부 확인
    if (!shouldSendCallback(customer)) {
      console.log('Callback skipped for category:', customer?.group?.name);
      return;
    }

    // AI 사용 여부 확인
    const useAI = shouldUseAI(customer);
    let template: string | null = null;
    let message: string = '';

    if (useAI) {
      // AI 맞춤 메시지 생성 (나중에 API 연동)
      // 현재는 기본 템플릿 사용
      template = await getCallbackTemplate(userId, isNewCustomer);
      if (!template) {
        console.log('No callback template found');
        return;
      }
      message = replaceTemplateVariables(template, customer, phoneNumber);

      // TODO: AI API 호출하여 맞춤 메시지 생성
      // const aiMessage = await generateAIMessage(userId, customer, phoneNumber);
      // message = aiMessage || message;
    } else {
      // 기본 템플릿 사용
      template = await getCallbackTemplate(userId, isNewCustomer);
      if (!template) {
        console.log('No callback template found');
        return;
      }
      message = replaceTemplateVariables(template, customer, phoneNumber);
    }

    // 신규 고객인 경우 알림
    if (isNewCustomer && onNewCustomer) {
      onNewCustomer(null, phoneNumber);
    }

    // 메시지 미리보기
    if (onCallbackReady) {
      onCallbackReady(message);
    }

    // 자동 발송 또는 확인 후 발송
    if (config.autoSend) {
      // 지연 시간 후 자동 발송
      setTimeout(() => {
        sendCallbackSms(userId, customer, phoneNumber, template!);
      }, config.delay * 1000);
    } else {
      // 확인 후 발송 (사용자 승인 필요)
      // 이 경우 onCallbackReady 콜백에서 사용자가 승인하면 발송
    }
  } catch (error) {
    console.error('Error in handleCallEnded:', error);
  }
}

/**
 * 통화 이벤트 처리 (3가지 타입: ended, missed, busy)
 */
export async function handleCallEvent(
  userId: string,
  phoneNumber: string,
  eventType: CallEventType
): Promise<void> {
  try {
    console.log('=== CALLBACK EVENT START ===');
    console.log('Event type:', eventType);
    console.log('Phone:', phoneNumber);
    console.log('User ID:', userId);

    // 콜백 설정 가져오기
    const config = await getCallbackConfig(userId);
    console.log('Callback config:', JSON.stringify(config, null, 2));
    console.log('Callback enabled:', config.enabled);

    // ⚠️ 가장 중요한 체크: 전체 콜백 기능 OFF 체크
    // auto_callback_enabled가 false이면 어떠한 경우에도 콜백 발송 안 함
    if (!config.enabled) {
      console.log('❌❌❌ CALLBACK DISABLED - STOPPING ALL CALLBACK OPERATIONS ❌❌❌');
      console.log('❌ Callback is disabled globally (auto_callback_enabled = false)');
      console.log('❌ No callback will be sent for any event type');
      console.log('💡 To enable: Go to Callback Settings and turn on "콜백 서비스 활성화"');
      return; // 즉시 종료 - 이후 코드 실행 안 됨
    }

    // 이벤트 타입별 ON/OFF, 메시지, 개별 이미지 확인
    // ⚠️ 추가 안전장치: config.enabled가 false면 이미 return했으므로 여기까지 오지 않음
    // 하지만 혹시 모를 경우를 대비해 이중 체크
    if (!config.enabled) {
      console.log('❌❌❌ DOUBLE CHECK: Callback still disabled - stopping ❌❌❌');
      return;
    }

    let isEnabled = false;
    let message = '';
    let eventImageUrl: string | null = null;

    switch (eventType) {
      case 'ended':
        isEnabled = config.onEndEnabled;
        message = config.onEndMessage;
        eventImageUrl = config.onEndImageUrl;
        break;
      case 'missed':
        isEnabled = config.onMissedEnabled;
        message = config.onMissedMessage;
        eventImageUrl = config.onMissedImageUrl;
        break;
      case 'busy':
        isEnabled = config.onBusyEnabled;
        message = config.onBusyMessage;
        eventImageUrl = config.onBusyImageUrl;
        break;
    }

    console.log(`Event ${eventType} enabled:`, isEnabled);
    console.log(`Event ${eventType} message:`, message);
    console.log(`Event ${eventType} specific image:`, eventImageUrl);

    // 이벤트별 ON/OFF 체크
    if (!isEnabled) {
      console.log(`❌ Callback for ${eventType} is disabled`);
      console.log(`💡 To enable: Go to Callback Settings and turn on "${eventType}" option`);
      return;
    }

    // 고객 검색
    const customer = await findCustomerByPhone(userId, phoneNumber);
    console.log('Customer found:', customer ? customer.name : 'Unknown/New');

    // 카테고리별 발송 여부 확인 (가족/친구는 발송 안 함)
    if (!shouldSendCallback(customer)) {
      console.log('Callback skipped for category:', customer?.group?.name);
      return;
    }

    // 템플릿 변수 치환
    const finalMessage = replaceTemplateVariables(message, customer, phoneNumber);
    console.log('Final message:', finalMessage);

    // 이미지 우선순위 결정:
    // 1. 이벤트 타입별 개별 이미지가 있으면 그것 사용
    // 2. 개별 이미지 없고 business_card_enabled=true면 기본 명함 사용
    // 3. 둘 다 없으면 이미지 없이 SMS로 발송
    let imageUrl: string | null = null;
    if (eventImageUrl) {
      imageUrl = eventImageUrl;
      console.log('Using event-specific image:', imageUrl);
    } else if (config.businessCardEnabled && config.businessCardImageUrl) {
      imageUrl = config.businessCardImageUrl;
      console.log('Using default business card:', imageUrl);
    }

    // 이미지 URL을 Open Graph URL로 변환
    let previewUrl: string | null = null;
    if (imageUrl) {
      try {
        // 이미 Open Graph URL인 경우
        if (imageUrl.includes('/preview/') || imageUrl.includes('/api/preview/')) {
          previewUrl = imageUrl;
          console.log('✅ Already Open Graph URL:', previewUrl);
        } else {
          // 일반 이미지 URL인 경우 Open Graph URL로 변환
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
        }
      } catch (error: any) {
        console.error('❌ Error converting to Open Graph URL:', error);
        previewUrl = imageUrl; // 에러 시 원본 URL 사용
      }
    }

    const isMMS = !!previewUrl;
    console.log('Final image URL (original):', imageUrl);
    console.log('Final preview URL (Open Graph):', previewUrl);
    console.log('Is MMS:', isMMS);

    // SMS/MMS 발송
    try {
      const { sendSmsDirectly, sendMmsDirectly } = require('./smsSender');

      console.log('📤 Attempting to send callback message...');
      console.log('Is MMS:', isMMS);
      console.log('Image URL:', imageUrl);

      if (isMMS && previewUrl) {
        // MMS 발송 (Open Graph URL 포함)
        console.log('📷 Sending SMS with Open Graph preview URL:', previewUrl);
        await sendMmsDirectly(phoneNumber, finalMessage, previewUrl);
        console.log('✅ SMS with Open Graph URL sent successfully');
      } else {
        // SMS 발송
        console.log('📱 Sending SMS (no image)');
        await sendSmsDirectly(phoneNumber, finalMessage);
        console.log('✅ SMS sent successfully');
      }

      console.log('=== CALLBACK SENT SUCCESS ===');

      // 발송 기록 저장 (Open Graph URL 저장)
      await saveCallbackLog(userId, customer, phoneNumber, finalMessage, eventType, isMMS, previewUrl || imageUrl);
      console.log('✅ Callback log saved');
    } catch (smsError: any) {
      console.error('=== CALLBACK SEND ERROR ===');
      console.error('Error message:', smsError?.message);
      console.error('Error stack:', smsError?.stack);
      console.error('Full error:', JSON.stringify(smsError, null, 2));
    }
  } catch (error) {
    console.error('Error in handleCallEvent:', error);
  }
}

/**
 * 콜백 발송 기록 저장
 */
async function saveCallbackLog(
  userId: string,
  customer: Customer | null,
  phoneNumber: string,
  message: string,
  eventType: CallEventType,
  isMMS: boolean,
  imageUrl: string | null
): Promise<void> {
  try {
    const { error } = await supabase.from('sms_logs').insert({
      user_id: userId,
      customer_id: customer?.id || null,
      phone_number: phoneNumber,
      message: message,
      status: 'sent',
      type: `callback_${eventType}`,
      sent_at: new Date().toISOString(),
      is_mms: isMMS,
      image_url: imageUrl,
    });

    if (error) {
      console.error('Error saving callback log:', error);
    }
  } catch (error) {
    console.error('Error in saveCallbackLog:', error);
  }
}

/**
 * 사용자 승인 후 콜백 발송
 */
export async function sendApprovedCallback(
  userId: string,
  customer: Customer | null,
  phoneNumber: string,
  message: string
): Promise<void> {
  try {
    // tasks 테이블에 작업 생성
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        customer_id: customer?.id || null,
        customer_phone: phoneNumber,
        customer_name: customer?.name || null,
        message_content: message,
        type: 'callback',
        status: 'pending',
        priority: 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating callback task:', error);
      return;
    }

    // 큐에 추가
    if (task) {
      await taskService.addTaskToQueue(task);
    }
  } catch (error) {
    console.error('Error in sendApprovedCallback:', error);
  }
}




