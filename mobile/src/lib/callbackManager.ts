import { Platform } from 'react-native';
import CallDetectorManager from 'react-native-call-detection';
import { supabase } from '../../lib/supabaseClient';
import { Customer } from './types/customer';
import { Task } from './types/task';
import { taskService } from '../services/taskService';
import { replaceTemplateVariables } from './templateParser';

export interface CallbackConfig {
  enabled: boolean;
  autoSend: boolean; // 자동 발송 vs 확인 후 발송
  delay: number; // 발송 지연 시간 (초)
}

/**
 * 전화번호 정규화
 */
function normalizePhoneNumber(phone: string): string {
  // 하이픈, 공백, 괄호 제거
  return phone.replace(/[\s\-\(\)]/g, '');
}

/**
 * 전화번호로 고객 검색
 */
async function findCustomerByPhone(
  userId: string,
  phoneNumber: string
): Promise<Customer | null> {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // customers 테이블에서 검색
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
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
 * 사용자 콜백 설정 조회
 */
async function getCallbackConfig(userId: string): Promise<CallbackConfig> {
  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('auto_callback_enabled, callback_template_new, callback_template_existing')
      .eq('user_id', userId)
      .single();

    if (error || !settings) {
      return {
        enabled: false,
        autoSend: false,
        delay: 0,
      };
    }

    return {
      enabled: settings.auto_callback_enabled || false,
      autoSend: false, // 기본값: 확인 후 발송
      delay: 0, // 기본값: 즉시 발송
    };
  } catch (error) {
    console.error('Error in getCallbackConfig:', error);
    return {
      enabled: false,
      autoSend: false,
      delay: 0,
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
        priority: 1, // 콜백은 우선순위 높게
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
    console.log('Call ended with:', phoneNumber);

    // 콜백 설정 확인
    const config = await getCallbackConfig(userId);
    if (!config.enabled) {
      console.log('Callback is disabled');
      return;
    }

    // 고객 검색
    const customer = await findCustomerByPhone(userId, phoneNumber);
    const isNewCustomer = !customer;

    // 템플릿 가져오기
    const template = await getCallbackTemplate(userId, isNewCustomer);
    if (!template) {
      console.log('No callback template found');
      return;
    }

    // 신규 고객인 경우 알림
    if (isNewCustomer && onNewCustomer) {
      onNewCustomer(null, phoneNumber);
    }

    // 메시지 미리보기
    const message = replaceTemplateVariables(template, customer, phoneNumber);
    if (onCallbackReady) {
      onCallbackReady(message);
    }

    // 자동 발송 또는 확인 후 발송
    if (config.autoSend) {
      // 지연 시간 후 자동 발송
      setTimeout(() => {
        sendCallbackSms(userId, customer, phoneNumber, template);
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



