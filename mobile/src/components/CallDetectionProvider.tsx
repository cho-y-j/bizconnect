import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { initializeCallDetection, stopCallDetection } from '../services/callDetectionService';
import { checkPermission, requestPermission } from '../lib/permissionManager';
import { PermissionsAndroid } from 'react-native';

/**
 * 통화 감지 프로바이더
 * 로그인된 사용자에게만 통화 감지 활성화
 */
export const CallDetectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user && Platform.OS === 'android') {
      const initializeCallDetectionWithPermission = async () => {
        try {
          // Activity가 준비될 때까지 잠시 대기 (네이티브 모듈 크래시 방지)
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 전화 상태 권한 확인
          const hasPhoneStatePermission = await checkPermission(
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
          );
          const hasCallLogPermission = await checkPermission(
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
          );

          // 권한이 없으면 요청
          if (!hasPhoneStatePermission) {
            const granted = await requestPermission(
              PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
              '전화 상태 권한',
              '통화 종료 후 자동으로 콜백 문자를 보내기 위해 전화 상태 접근 권한이 필요합니다.'
            );
            if (!granted) {
              console.warn('Phone state permission denied');
              return;
            }
          }

          if (!hasCallLogPermission) {
            const granted = await requestPermission(
              PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
              '통화 기록 권한',
              '통화 기록을 확인하기 위해 권한이 필요합니다.'
            );
            if (!granted) {
              console.warn('Call log permission denied');
              return;
            }
          }

          // 권한이 있으면 통화 감지 시작
          initializeCallDetection(user.id);
        } catch (error) {
          console.error('Error in CallDetectionProvider:', error);
          // 에러가 발생해도 앱이 크래시되지 않도록 처리
        }
      };

      initializeCallDetectionWithPermission();

      return () => {
        // 컴포넌트 언마운트 시 정리
        try {
          stopCallDetection();
        } catch (error) {
          console.error('Error stopping call detection:', error);
        }
      };
    }
  }, [user]);

  return <>{children}</>;
};




