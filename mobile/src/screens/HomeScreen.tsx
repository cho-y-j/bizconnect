import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../services/taskService';
import { checkDailyLimit } from '../lib/dailyLimit';
import { getTodayEvents, TodayEvent } from '../services/customerService';
import { getTodayStats, TodayStats } from '../services/statsService';
import { networkMonitor } from '../lib/networkMonitor';

export default function HomeScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [queueStatus, setQueueStatus] = useState({
    queueLength: 0,
    isProcessing: false,
    currentTask: null as any,
  });
  const [dailyLimit, setDailyLimit] = useState({
    remaining: 0,
    limit: 199,
    limitMode: 'safe' as 'safe' | 'max',
  });
  const [todayStats, setTodayStats] = useState<TodayStats>({
    sent: 0,
    failed: 0,
    successRate: 0,
    pendingTasks: 0,
  });
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (user) {
      // 데이터 로드 (taskService는 App.tsx에서 이미 설정됨)
      loadData();
      loadPendingTasks();

      // 네트워크 상태 확인
      setIsOnline(networkMonitor.getIsOnline());
      networkMonitor.on('change', setIsOnline);

      // 큐 상태 주기적 업데이트
      const interval = setInterval(() => {
        setQueueStatus(taskService.getQueueStatus());
      }, 1000);

      return () => {
        clearInterval(interval);
        taskService.unsubscribe();
        networkMonitor.removeListener('change', setIsOnline);
      };
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // 일일 한도 조회
    const limit = await checkDailyLimit(user.id);
    if (limit) {
      setDailyLimit({
        remaining: limit.remaining,
        limit: limit.limit,
        limitMode: limit.limitMode,
      });
    }

    // 오늘 통계 조회
    const stats = await getTodayStats(user.id);
    setTodayStats(stats);

    // 오늘 생일/기념일 조회
    const events = await getTodayEvents(user.id);
    setTodayEvents(events);
  };

  const loadPendingTasks = async () => {
    if (!user) return;
    await taskService.loadPendingTasks();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadPendingTasks();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>비즈커넥트</Text>
        <Text style={styles.subtitle}>환영합니다, {user?.email}님</Text>
        <View style={[styles.networkStatus, isOnline ? styles.networkOnline : styles.networkOffline]}>
          <Text style={styles.networkStatusText}>
            {isOnline ? '🟢 온라인' : '🔴 오프라인'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* 오늘의 할 일 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 할 일</Text>
          
          {/* 오늘 생일/기념일 */}
          {todayEvents.length > 0 && (
            <View style={styles.eventsContainer}>
              {todayEvents.map((event) => (
                <View
                  key={`${event.type}-${event.id}`}
                  style={[
                    styles.eventCard,
                    event.type === 'birthday'
                      ? styles.birthdayCard
                      : styles.anniversaryCard,
                  ]}
                >
                  <Text style={styles.eventIcon}>
                    {event.type === 'birthday' ? '🎂' : '💝'}
                  </Text>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventName}>{event.customer_name}님</Text>
                    <Text style={styles.eventDescription}>
                      {event.type === 'birthday'
                        ? `${event.age}세 생일을 축하합니다!`
                        : `${event.years}주년 기념일입니다!`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 발송 대기 작업 */}
          {todayStats.pendingTasks > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 발송 대기 작업</Text>
              <Text style={styles.cardText}>
                {todayStats.pendingTasks}개의 작업이 대기 중입니다
              </Text>
            </View>
          )}

          {todayEvents.length === 0 && todayStats.pendingTasks === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>오늘 할 일이 없습니다.</Text>
            </View>
          )}
        </View>

        {/* 통계 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 오늘 통계</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayStats.sent}</Text>
              <Text style={styles.statLabel}>발송</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.failedValue]}>
                {todayStats.failed}
              </Text>
              <Text style={styles.statLabel}>실패</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.successValue]}>
                {todayStats.successRate}%
              </Text>
              <Text style={styles.statLabel}>성공률</Text>
            </View>
          </View>
        </View>

        {/* 큐 상태 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 발송 큐 상태</Text>
          <Text style={styles.cardText}>
            대기 중: {queueStatus.queueLength}개
          </Text>
          <Text style={styles.cardText}>
            처리 중: {queueStatus.isProcessing ? '예' : '아니오'}
          </Text>
          {queueStatus.currentTask && (
            <Text style={styles.cardTextSmall}>
              현재 작업: {queueStatus.currentTask.customer_phone}
            </Text>
          )}
        </View>

        {/* 일일 한도 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 일일 한도</Text>
          <Text style={styles.cardText}>
            남은 발송: {dailyLimit.remaining}건
          </Text>
          <Text style={styles.cardText}>
            오늘 발송: {todayStats.sent}건 / {dailyLimit.limit}건
          </Text>
          <Text style={styles.cardTextSmall}>
            모드: {dailyLimit.limitMode === 'safe' ? '안전 (199건)' : '최대 (499건)'}
          </Text>
          {dailyLimit.remaining === 0 && (
            <Text style={styles.warningText}>
              ⚠️ 일일 한도가 초과되었습니다.
            </Text>
          )}
        </View>

        {/* 빠른 액션 버튼 */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ContactsUpload')}
          >
            <Text style={styles.actionButtonText}>📇 주소록 업로드</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardTextSmall: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  eventsContainer: {
    marginBottom: 16,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  birthdayCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EC4899',
  },
  anniversaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  eventIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  failedValue: {
    color: '#EF4444',
  },
  successValue: {
    color: '#10B981',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickActions: {
    marginTop: 20,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  networkStatus: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  networkOnline: {
    backgroundColor: '#D1FAE5',
  },
  networkOffline: {
    backgroundColor: '#FEE2E2',
  },
  networkStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
});

