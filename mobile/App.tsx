import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CallDetectionProvider } from './src/components/CallDetectionProvider';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import ContactsUploadScreen from './src/screens/ContactsUploadScreen';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { errorHandler } from './src/lib/errorHandler';
import { networkMonitor } from './src/lib/networkMonitor';
import { offlineQueue } from './src/lib/offlineQueue';
import { pushNotificationService } from './src/services/pushNotificationService';
import { backgroundService } from './src/services/backgroundService';
import { taskService } from './src/services/taskService';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '비즈커넥트',
          headerStyle: {
            backgroundColor: '#2563EB',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="ContactsUpload"
        component={ContactsUploadScreen}
        options={{
          title: '주소록 업로드',
          headerStyle: {
            backgroundColor: '#2563EB',
          },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // 에러 핸들러 초기화
    errorHandler.initialize();

    // 네트워크 모니터 시작
    networkMonitor.start();

    // 네트워크 상태 변경 감지
    networkMonitor.on('change', async (isOnline: boolean) => {
      if (isOnline) {
        // 온라인 복구 시 동기화
        await offlineQueue.syncWhenOnline();
        // 백그라운드 서비스 재시작
        if (user) {
          await backgroundService.start();
        }
      } else {
        // 오프라인 시 백그라운드 서비스 중지
        await backgroundService.stop();
      }
    });

    return () => {
      networkMonitor.stop();
    };
  }, []);

  useEffect(() => {
    if (user) {
      // 사용자 로그인 시 초기화
      (async () => {
        // 푸시 알림 초기화
        pushNotificationService.initialize();

        // TaskService 설정
        taskService.setUserId(user.id);

        // 대기 중인 작업 로드
        await taskService.loadPendingTasks();

        // 백그라운드 서비스 시작
        if (networkMonitor.getIsOnline()) {
          await backgroundService.start();
        }
      })();
    } else {
      // 로그아웃 시 정리
      taskService.unsubscribe();
      backgroundService.stop();
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

function App(): JSX.Element {
  return (
    <AuthProvider>
      <CallDetectionProvider>
        <RootNavigator />
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
