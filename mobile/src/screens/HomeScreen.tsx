import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Linking,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../services/taskService';
import { checkDailyLimit } from '../lib/dailyLimit';
import { getTodayEvents, TodayEvent } from '../services/customerService';
import { getTodayStats, TodayStats } from '../services/statsService';
import { networkMonitor } from '../lib/networkMonitor';
import { ensurePermissions } from '../lib/permissionManager';
import { supabase } from '../../lib/supabaseClient';

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
  const [favoriteTemplates, setFavoriteTemplates] = useState<Array<{ id: string; name: string; content: string }>>([]);

  useEffect(() => {
    if (!user) return;

    let interval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const initializeScreen = async () => {
      try {
        // 권한 확인 및 요청 (앱 시작 시) - 에러가 있어도 계속 진행
        try {
          await ensurePermissions();
        } catch (error) {
          console.error('Error ensuring permissions:', error);
        }

        // 네트워크 모니터 시작 (한 번만)
        try {
          if (!networkMonitor.getIsOnline()) {
            networkMonitor.start();
          }
          setIsOnline(networkMonitor.getIsOnline());
          networkMonitor.on('change', setIsOnline);
        } catch (error) {
          console.error('Error setting up network monitor:', error);
        }

        // taskService가 초기화될 때까지 잠시 대기
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 데이터 로드 - 에러가 있어도 계속 진행
        if (isMounted) {
          loadData().catch((error) => {
            console.error('Error loading data:', error);
          });
          loadFavoriteTemplates().catch((error) => {
            console.error('Error loading templates:', error);
          });
        }

        if (isMounted) {
          // 즉시 대기 중인 작업 로드
          loadPendingTasks().catch((error) => {
            console.error('Error loading pending tasks:', error);
          });

          // 주기적으로 대기 중인 작업 확인 (5초마다 - 더 빠른 반응)
          // 실시간 구독이 실패해도 폴링으로 작업을 받을 수 있음
          const pollingInterval = setInterval(() => {
            if (isMounted && user) {
              taskService.loadPendingTasks().catch((error) => {
                console.error('Error in polling pending tasks:', error);
              });
            }
          }, 5000); // 5초마다 (웹에서 보낸 작업을 더 빠르게 감지)

          // cleanup
          return () => {
            clearInterval(pollingInterval);
          };
        }

        // 큐 상태 주기적 업데이트
        if (isMounted) {
          interval = setInterval(() => {
            if (!isMounted) return;
            try {
              const status = taskService.getQueueStatus();
              if (isMounted) {
                setQueueStatus(status);
              }
            } catch (error) {
              console.error('Error getting queue status:', error);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error in HomeScreen initialization:', error);
      }
    };

    initializeScreen();

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
      try {
        taskService.unsubscribe();
        networkMonitor.removeListener('change', setIsOnline);
      } catch (error) {
        console.error('Error cleaning up:', error);
      }
    };
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

  const loadFavoriteTemplates = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('id, name, content')
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .order('usage_count', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error loading templates:', error);
        return;
      }

      setFavoriteTemplates(data || []);
    } catch (error) {
      console.error('Error in loadFavoriteTemplates:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadPendingTasks();
    await loadFavoriteTemplates();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
        <Text style={styles.title}>비즈커넥트</Text>
        <Text style={styles.subtitle}>환영합니다, {user?.email}님</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.settingsButtonText}>⚙️</Text>
            </TouchableOpacity>
          </View>
        <View style={[styles.networkStatus, isOnline ? styles.networkOnline : styles.networkOffline]}>
          <Text style={styles.networkStatusText}>
            {isOnline ? '🟢 온라인' : '🔴 오프라인'}
          </Text>
        </View>
      </View>

        <View style={styles.content}>
        {/* 바로 문자 보내기 버튼 (가장 크고 눈에 띄게) */}
        <TouchableOpacity
          style={styles.sendSmsButton}
          onPress={() => {
            if (navigation.navigate) {
              navigation.navigate('SendSMS');
            }
          }}
        >
          <Text style={styles.sendSmsIcon}>💬</Text>
          <Text style={styles.sendSmsText}>바로 문자 보내기</Text>
        </TouchableOpacity>

        {/* 콜백 설정 카드 */}
        <TouchableOpacity
          style={styles.callbackCard}
          onPress={() => {
            if (navigation.navigate) {
              navigation.navigate('CallbackSettings');
            }
          }}
        >
          <View style={styles.callbackCardHeader}>
            <Text style={styles.callbackCardTitle}>📞 콜백 설정</Text>
            {Platform.OS === 'android' && (
              <View style={styles.androidBadge}>
                <Text style={styles.androidBadgeText}>Android</Text>
              </View>
            )}
          </View>
          <Text style={styles.callbackCardDescription}>
            통화 종료 후 자동으로 문자 발송
          </Text>
        </TouchableOpacity>

        {/* 일일 한도 배너 */}
        <View style={styles.limitBanner}>
          <View style={styles.limitHeader}>
            <Text style={styles.limitTitle}>일일 한도</Text>
            <Text style={styles.limitText}>
              {todayStats.sent}건 / {dailyLimit.limit}건
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min((todayStats.sent / dailyLimit.limit) * 100, 100)}%`,
                  backgroundColor: todayStats.sent >= dailyLimit.limit ? '#EF4444' : '#10B981',
                },
              ]}
            />
          </View>
          <Text style={styles.limitSubtext}>
            성공: {todayStats.sent}건 | 남은 한도: {dailyLimit.remaining}건
          </Text>
        </View>

        {/* 자주 쓰는 템플릿 */}
        {favoriteTemplates.length > 0 && (
          <View style={styles.templatesSection}>
            <Text style={styles.templatesSectionTitle}>자주 쓰는 템플릿</Text>
            <View style={styles.templatesList}>
              {favoriteTemplates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateButton}
                  onPress={() => {
                    if (navigation.navigate) {
                      navigation.navigate('SendSMS', { templateId: template.id });
                    }
                  }}
                >
                  <Text style={styles.templateButtonText}>⭐ {template.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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


        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
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
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 24,
  },
  content: {
    padding: 20,
    paddingBottom: 140, // 하단 여백으로 잘림 방지
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
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  callbackButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  callbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webSettingsButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  webSettingsButtonText: {
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
  limitBanner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  limitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  limitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  limitSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  sendSmsButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sendSmsIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  sendSmsText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  callbackCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  callbackCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  callbackCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  androidBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  androidBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  callbackCardDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  templatesSection: {
    marginBottom: 20,
  },
  templatesSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  templatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  templateButtonText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
});

