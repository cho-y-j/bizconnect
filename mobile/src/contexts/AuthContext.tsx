import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { taskService } from '../services/taskService';
import { fcmService } from '../services/fcmService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // 세션이 있으면 서비스 초기화
      if (session?.user?.id) {
        console.log('🔧 [AuthContext] Initializing services for user:', session.user.id);

        // FCM 푸시 서비스 초기화 (메인 방식)
        fcmService.initialize().catch((error) => {
          console.error('❌ [AuthContext] Failed to initialize fcmService:', error);
        });

        // taskService 초기화 (백업용 Realtime/폴링)
        taskService.setUserId(session.user.id).catch((error) => {
          console.error('❌ [AuthContext] Failed to initialize taskService:', error);
        });
      }
    });

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // 로그인 시 서비스 초기화
      if (session?.user?.id) {
        console.log('🔧 [AuthContext] Auth state changed, initializing services for user:', session.user.id);

        // FCM 푸시 서비스 초기화
        fcmService.initialize().catch((error) => {
          console.error('❌ [AuthContext] Failed to initialize fcmService:', error);
        });

        // taskService 초기화 (백업용)
        taskService.setUserId(session.user.id).catch((error) => {
          console.error('❌ [AuthContext] Failed to initialize taskService:', error);
        });
      } else {
        // 로그아웃 시 구독 해제
        console.log('🔧 [AuthContext] User logged out, unsubscribing taskService');
        taskService.unsubscribe();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};




