import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { initializeCallDetection, stopCallDetection } from '../services/callDetectionService';

/**
 * 통화 감지 프로바이더
 * 로그인된 사용자에게만 통화 감지 활성화
 */
export const CallDetectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // 사용자가 로그인되어 있으면 통화 감지 시작
      initializeCallDetection(user.id);

      return () => {
        // 컴포넌트 언마운트 시 정리
        stopCallDetection();
      };
    }
  }, [user]);

  return <>{children}</>;
};



