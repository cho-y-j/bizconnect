import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import Contacts from 'react-native-contacts';
import { useAuth } from '../contexts/AuthContext';
import { uploadContacts } from '../services/contactsService';
import { Customer } from '../lib/types/customer';

interface ContactItem {
  id: string;
  name: string;
  phone: string;
  hasPhone: boolean;
  selected: boolean;
}

export default function ContactsUploadScreen({ navigation }: any) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactItem[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredContacts(
        contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.phone.includes(query)
        )
      );
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const permission = await Contacts.requestPermission();
      if (permission !== 'authorized') {
        Alert.alert('권한 필요', '주소록을 읽기 위해 권한이 필요합니다.');
        setLoading(false);
        return;
      }

      const allContacts = await Contacts.getAll();
      
      // 전화번호가 있는 연락처만 필터링
      const contactsWithPhone = allContacts
        .filter((contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map((contact, index) => {
          // 첫 번째 전화번호 사용
          const phone = contact.phoneNumbers[0].number.replace(/\D/g, '');
          return {
            id: contact.recordID || `contact-${index}`,
            name: contact.displayName || contact.givenName || '이름 없음',
            phone: phone,
            hasPhone: phone.length >= 10,
            selected: false,
          };
        })
        .filter((c) => c.hasPhone);

      setContacts(contactsWithPhone);
      setFilteredContacts(contactsWithPhone);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      Alert.alert('오류', '주소록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const selectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const handleUpload = async () => {
    if (!user || selectedContacts.size === 0) {
      Alert.alert('알림', '업로드할 연락처를 선택해주세요.');
      return;
    }

    Alert.alert(
      '업로드 확인',
      `${selectedContacts.size}개의 연락처를 업로드하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '업로드',
          onPress: async () => {
            setUploading(true);
            try {
              const contactsToUpload = filteredContacts.filter((c) =>
                selectedContacts.has(c.id)
              );

              const result = await uploadContacts(
                user.id,
                contactsToUpload.map((c) => ({
                  name: c.name,
                  phone: c.phone,
                }))
              );

              Alert.alert(
                '업로드 완료',
                `성공: ${result.success}개\n중복: ${result.duplicates}개\n실패: ${result.failed}개`,
                [
                  {
                    text: '확인',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('업로드 실패', error.message || '업로드 중 오류가 발생했습니다.');
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>주소록을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack?.() || navigation.navigate?.('SendSMS')}
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>주소록 업로드</Text>
        <Text style={styles.subtitle}>
          {filteredContacts.length}개 중 {selectedContacts.size}개 선택됨
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.selectAllButton}
          onPress={selectAll}
        >
          <Text style={styles.selectAllText}>
            {selectedContacts.size === filteredContacts.length ? '전체 해제' : '전체 선택'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading || selectedContacts.size === 0}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.uploadButtonText}>
              업로드 ({selectedContacts.size})
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.contactItem,
              selectedContacts.has(item.id) && styles.contactItemSelected,
            ]}
            onPress={() => toggleContact(item.id)}
          >
            <View style={styles.contactCheckbox}>
              {selectedContacts.has(item.id) && (
                <View style={styles.checkboxChecked} />
              )}
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactPhone}>{item.phone}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>연락처가 없습니다.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectAllButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  uploadButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contactItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  contactCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2563EB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 16,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#2563EB',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});




