import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Linking } from 'react-native';
import { smsApprovalService } from '../lib/smsApproval';

export default function SettingsScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [autoApprove, setAutoApprove] = useState(false);

  // 자동 승인 설정 로드
  useEffect(() => {
    loadAutoApproveSetting();
  }, []);

  const loadAutoApproveSetting = async () => {
    if (Platform.OS === 'android') {
      const isEnabled = await smsApprovalService.getAutoApprove();
      setAutoApprove(isEnabled);
    }
  };

  const handleAutoApproveChange = async (value: boolean) => {
    if (value) {
      Alert.alert(
        '자동 승인 활성화',
        '웹에서 문자 발송 요청 시 확인 없이 자동으로 발송됩니다.\n\n⚠️ 보안 위험: 계정이 해킹되면 불법 문자가 자동으로 발송될 수 있습니다.\n\n정말 활성화하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '활성화',
            style: 'destructive',
            onPress: async () => {
              const result = await smsApprovalService.setAutoApprove(true);
              setAutoApprove(result);
            }
          }
        ]
      );
    } else {
      const result = await smsApprovalService.setAutoApprove(false);
      setAutoApprove(result);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>설정</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.content}>
          {/* 콜백 설정 (우선 배치) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>콜백 서비스</Text>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('CallbackSettings')}
            >
              <View style={styles.settingItemLeft}>
                <Text style={styles.settingItemIcon}>📞</Text>
                <View style={styles.settingItemText}>
                  <Text style={styles.settingItemTitle}>콜백 설정</Text>
                  <Text style={styles.settingItemDescription}>
                    통화 종료 후 자동 문자 발송 설정
                  </Text>
                </View>
              </View>
              {Platform.OS === 'android' && (
                <View style={styles.androidBadge}>
                  <Text style={styles.androidBadgeText}>Android</Text>
                </View>
              )}
              <Text style={styles.settingItemArrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* 웹 문자 발송 설정 (Android만) */}
          {Platform.OS === 'android' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>웹 문자 발송</Text>
              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <Text style={styles.settingItemIcon}>🔐</Text>
                  <View style={styles.settingItemText}>
                    <Text style={styles.settingItemTitle}>자동 승인</Text>
                    <Text style={styles.settingItemDescription}>
                      {autoApprove
                        ? '웹 문자 요청 시 자동 발송 (보안 주의!)'
                        : '웹 문자 요청 시 승인/취소 선택'}
                    </Text>
                  </View>
                </View>
                <View style={autoApprove ? styles.warningBadge : styles.safeBadge}>
                  <Text style={styles.badgeText}>{autoApprove ? '위험' : '안전'}</Text>
                </View>
                <Switch
                  value={autoApprove}
                  onValueChange={handleAutoApproveChange}
                  trackColor={{ false: '#10B981', true: '#EF4444' }}
                  thumbColor={autoApprove ? '#fff' : '#fff'}
                />
              </View>
            </View>
          )}

          {/* 주소록 관리 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>주소록 관리</Text>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('ContactsUpload')}
            >
              <View style={styles.settingItemLeft}>
                <Text style={styles.settingItemIcon}>📇</Text>
                <View style={styles.settingItemText}>
                  <Text style={styles.settingItemTitle}>주소록 업로드</Text>
                  <Text style={styles.settingItemDescription}>
                    CSV/엑셀 파일로 고객 정보 업로드
                  </Text>
                </View>
              </View>
              <Text style={styles.settingItemArrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* 기타 설정 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기타</Text>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => Linking.openURL('https://bizconnect-web.vercel.app')}
            >
              <View style={styles.settingItemLeft}>
                <Text style={styles.settingItemIcon}>🌐</Text>
                <View style={styles.settingItemText}>
                  <Text style={styles.settingItemTitle}>웹에서 상세 설정</Text>
                  <Text style={styles.settingItemDescription}>
                    웹 브라우저에서 더 많은 설정 관리
                  </Text>
                </View>
              </View>
              <Text style={styles.settingItemArrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* 사용자 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>계정</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <Text style={styles.settingItemIcon}>👤</Text>
                <View style={styles.settingItemText}>
                  <Text style={styles.settingItemTitle}>이메일</Text>
                  <Text style={styles.settingItemDescription}>{user?.email}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 로그아웃 버튼 */}
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
    padding: 16,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    width: 60,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingItemText: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingItemDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  androidBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  androidBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  warningBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  safeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  settingItemArrow: {
    fontSize: 18,
    color: '#9CA3AF',
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
});

