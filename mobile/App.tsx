import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ActivityIndicator, View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { CallDetectionProvider } from './src/components/CallDetectionProvider';
import { taskService } from './src/services/taskService';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ContactsUploadScreen from './src/screens/ContactsUploadScreen';
import CallbackSettingsScreen from './src/screens/CallbackSettingsScreen';
import SendSMSScreen from './src/screens/SendSMSScreen';
import SettingsScreen from './src/screens/SettingsScreen';

type AppScreen = 'Login' | 'SignUp' | 'ContactsUpload' | 'CallbackSettings' | 'SendSMS' | 'Settings';

// Navigation 없이 간단한 화면 전환
function AppContent() {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('Login');
  const [routeParams, setRouteParams] = useState<any>({});

  const navigate = (screen: string, params?: any) => {
    setCurrentScreen(screen as AppScreen);
    setRouteParams(params || {});
  };
  const goBack = () => setCurrentScreen('SendSMS');

  const appState = useRef(AppState.currentState);

  // taskService 초기화 (로그인 시)
  useEffect(() => {
    const initializeTaskService = async () => {
      if (user) {
        try {
          await taskService.setUserId(user.id);
          // 초기화 후 즉시 pending tasks 로드
          await taskService.loadPendingTasks();
        } catch (error) {
          console.error('Error initializing taskService:', error);
        }
      } else {
        // 로그아웃 시 정리
        try {
          taskService.unsubscribe();
        } catch (error) {
          console.error('Error cleaning up taskService:', error);
        }
      }
    };
    
    initializeTaskService();
  }, [user]);

  // 앱이 포그라운드로 돌아올 때 pending tasks 로드 (배터리 절약: 이벤트 기반만 처리)
  useEffect(() => {
    if (!user) return;

    console.log('📱 [App] Setting up AppState listener for user:', user.id);
    console.log('📱 [App] Initial AppState:', appState.current);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousState = appState.current;
      console.log('📱 [App] AppState changed:', previousState, '->', nextAppState);
      
      // 포그라운드로 돌아올 때 (백그라운드/비활성 -> 활성)
      if (
        (previousState === 'background' || previousState === 'inactive') &&
        nextAppState === 'active' &&
        user
      ) {
        console.log('📱 [App] ===== APP CAME TO FOREGROUND =====');
        console.log('📱 [App] Previous state:', previousState);
        console.log('📱 [App] Current state:', nextAppState);
        console.log('📱 [App] Loading pending tasks...');
        
        // 약간의 딜레이를 주어 이벤트 리스너가 설정될 시간을 줌
        setTimeout(() => {
          taskService.loadPendingTasks().catch((error) => {
            console.error('❌ [App] Error loading pending tasks on foreground:', error);
          });
        }, 500); // 500ms 딜레이
      }
      
      appState.current = nextAppState;
    });

    return () => {
      console.log('📱 [App] Removing AppState listener');
      subscription.remove();
    };
  }, [user]);

  // 로그인 후 기본 화면을 문자 보내기 화면으로 설정
  useEffect(() => {
    if (user) {
      // 로그인된 상태에서 Login 화면이면 SendSMS로 변경
      if (currentScreen === 'Login') {
        setCurrentScreen('SendSMS');
      }
    } else {
      // 로그아웃 시 Login 화면으로
      if (currentScreen !== 'Login' && currentScreen !== 'SignUp') {
        setCurrentScreen('Login');
      }
    }
  }, [user]); // user가 변경될 때만 실행

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // 로그인된 경우
  if (user) {
    // 명시적으로 설정된 화면들만 체크
    if (currentScreen === 'ContactsUpload') {
      return <ContactsUploadScreen navigation={{ navigate, goBack }} />;
    }
    if (currentScreen === 'CallbackSettings') {
      return <CallbackSettingsScreen navigation={{ navigate, goBack }} />;
    }
    if (currentScreen === 'Settings') {
      return <SettingsScreen navigation={{ navigate, goBack }} />;
    }
    // 기본 화면: 문자 보내기 화면 (SendSMS)
    return <SendSMSScreen navigation={{ navigate, goBack }} route={{ params: routeParams }} />;
  }

  // 로그인 안 된 경우
  if (currentScreen === 'Login') {
    return <LoginScreen navigation={{ navigate }} />;
  }

  return <SignUpScreen navigation={{ navigate }} />;
}

function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <CallDetectionProvider>
        <AppContent />
      </CallDetectionProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
});

export default App;
