import { ErrorUtils } from 'react-native';
import { supabase } from '../lib/supabaseClient';

interface ErrorLog {
  message: string;
  stack?: string;
  timestamp: string;
  userId?: string;
  context?: any;
}

/**
 * 전역 에러 핸들러
 */
class ErrorHandler {
  private errorLogs: ErrorLog[] = [];
  private maxLogs = 100;

  /**
   * 에러 핸들러 초기화
   */
  initialize(): void {
    try {
      // JavaScript 에러 캐치 (ErrorUtils가 있는 경우에만)
      if (ErrorUtils && typeof ErrorUtils.getGlobalHandler === 'function') {
        const originalHandler = ErrorUtils.getGlobalHandler();
        ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
          this.logError(error, { isFatal });
          if (originalHandler) {
            originalHandler(error, isFatal);
          }
        });
      }
    } catch (e) {
      console.warn('ErrorUtils not available:', e);
    }

    try {
      // Promise rejection 캐치
      const originalUnhandledRejection = (global as any).onunhandledrejection;
      (global as any).onunhandledrejection = (event: any) => {
        const error = event?.reason || new Error('Unhandled promise rejection');
        this.logError(error, { type: 'promise_rejection' });
        if (originalUnhandledRejection) {
          originalUnhandledRejection(event);
        }
      };
    } catch (e) {
      console.warn('Failed to set unhandled rejection handler:', e);
    }
  }

  /**
   * 에러 로깅
   */
  async logError(error: Error | string, context?: any): Promise<void> {
    const errorLog: ErrorLog = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      timestamp: new Date().toISOString(),
      context,
    };

    try {
      // 사용자 ID 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        errorLog.userId = user.id;
      }
    } catch (e) {
      // 무시
    }

    // 로컬 로그에 추가
    this.errorLogs.push(errorLog);
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs.shift();
    }

    // 콘솔에 출력
    console.error('Error logged:', errorLog);

    // Supabase에 전송 (선택적)
    try {
      await this.sendToSupabase(errorLog);
    } catch (e) {
      console.error('Failed to send error to Supabase:', e);
    }
  }

  /**
   * Supabase에 에러 로그 전송
   */
  private async sendToSupabase(errorLog: ErrorLog): Promise<void> {
    // error_logs 테이블이 있다고 가정 (나중에 생성)
    // await supabase.from('error_logs').insert(errorLog);
  }

  /**
   * 에러 로그 조회
   */
  getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  /**
   * 에러 로그 초기화
   */
  clearErrorLogs(): void {
    this.errorLogs = [];
  }

  /**
   * 사용자 친화적 에러 메시지 생성
   */
  getUserFriendlyMessage(error: Error | string): string {
    const message = typeof error === 'string' ? error : error.message;

    // 일반적인 에러 메시지 변환
    if (message.includes('network') || message.includes('Network')) {
      return '네트워크 연결을 확인해주세요.';
    }
    if (message.includes('permission')) {
      return '권한이 필요합니다. 설정에서 권한을 허용해주세요.';
    }
    if (message.includes('limit') || message.includes('한도')) {
      return '일일 한도를 초과했습니다.';
    }
    if (message.includes('auth') || message.includes('인증')) {
      return '인증에 실패했습니다. 다시 로그인해주세요.';
    }

    return '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
}

export const errorHandler = new ErrorHandler();




