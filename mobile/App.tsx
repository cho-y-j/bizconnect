import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { CallDetectionProvider } from './src/components/CallDetectionProvider';
import { taskService } from './src/services/taskService';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import ContactsUploadScreen from './src/screens/ContactsUploadScreen';
import CallbackSettingsScreen from './src/screens/CallbackSettingsScreen';
import SendSMSScreen from './src/screens/SendSMSScreen';
import SettingsScreen from './src/screens/SettingsScreen';

type AppScreen = 'Login' | 'SignUp' | 'Home' | 'ContactsUpload' | 'CallbackSettings' | 'SendSMS' | 'Settings';

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

  // taskService 초기화 (로그인 시)
  useEffect(() => {
    if (user) {
      try {
        taskService.setUserId(user.id);
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
  }, [user]);

  // 로그인 후 기본 화면을 문자 보내기 화면으로 설정
  useEffect(() => {
    if (user) {
      // 로그인된 상태에서 Login이나 Home 화면이면 SendSMS로 변경
      // 단, 명시적으로 다른 화면으로 이동한 경우는 유지
      if (currentScreen === 'Login' || currentScreen === 'Home') {
        setCurrentScreen('SendSMS');
      }
    } else {
      // 로그아웃 시 Login 화면으로
      if (currentScreen !== 'Login' && currentScreen !== 'SignUp') {
        setCurrentScreen('Login');
      }
    }
  }, [user]); // currentScreen을 의존성에서 제거하여 무한 루프 방지

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
    // Home 화면은 명시적으로 navigate('Home')을 호출한 경우에만 표시
    if (currentScreen === 'Home') {
      return <HomeScreen navigation={{ navigate }} />;
    }
    // Login 상태도 문자 보내기 화면으로 (useEffect가 실행되기 전 렌더링 대비)
    // 기본 화면: 문자 보내기 화면 (SendSMS 또는 Login 상태 모두)
    return <SendSMSScreen navigation={{ navigate, goBack }} route={{ params: routeParams }} />;
  }

  // 로그인 안 된 경우
  if (currentScreen === 'Login' || currentScreen === 'Home') {
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
