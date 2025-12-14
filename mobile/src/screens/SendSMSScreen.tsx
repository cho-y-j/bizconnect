import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
  SafeAreaView,
  Image,
  PermissionsAndroid,
  Switch,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { sendSmsDirectly, sendMmsDirectly } from '../lib/smsSender';
import { Customer } from '../lib/types/customer';
import { launchImageLibrary } from 'react-native-image-picker';
import { incrementSentCount } from '../lib/dailyLimit';
import { downloadImage, getCachedImagePath } from '../lib/imageCache';

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
}

export default function SendSMSScreen({ navigation, route }: any) {
  const { user, signOut } = useAuth();
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null); // Open Graph URL
  const [uploadingImage, setUploadingImage] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [savedImages, setSavedImages] = useState<any[]>([]); // user_images 테이블에서 불러온 이미지들
  const [showImagePicker, setShowImagePicker] = useState(false); // 이미지 선택 모달 표시 여부
  const [loadingSavedImages, setLoadingSavedImages] = useState(false);
  const [businessCardImageUrl, setBusinessCardImageUrl] = useState<string | null>(null); // 명함 이미지 URL
  const [attachBusinessCard, setAttachBusinessCard] = useState(false); // 명함 첨부 체크박스
  const messageInputRef = useRef<TextInput>(null);

  useEffect(() => {
    console.log('📱 SendSMSScreen mounted, user:', user?.id);
    if (user) {
      loadCustomers();
      loadTemplates();
      loadSavedImages();
      loadBusinessCard();
    } else {
      console.log('⚠️ User not yet loaded, waiting...');
      setCustomersLoading(true);
    }
  }, [user]);

  useEffect(() => {
    if (route?.params?.templateId) {
      const template = templates.find((t) => t.id === route.params.templateId);
      if (template) {
        setMessage(template.content);
      }
    }
  }, [route?.params?.templateId, templates]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone.includes(searchQuery)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    if (!user) {
      console.log('❌ loadCustomers: user is null');
      return;
    }
    setCustomersLoading(true);
    console.log('🔍 Loading customers for user:', user.id);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
        .limit(500);

      if (error) {
        console.error('❌ Error loading customers:', error);
        setCustomersLoading(false);
        return;
      }

      console.log('✅ Loaded customers:', data?.length || 0);
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error) {
      console.error('❌ Error in loadCustomers:', error);
    } finally {
      setCustomersLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('id, name, content')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('usage_count', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading templates:', error);
        return;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error('Error in loadTemplates:', error);
    }
  };

  const loadSavedImages = async () => {
    if (!user) return;
    setLoadingSavedImages(true);
    try {
      const { data, error } = await supabase
        .from('user_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading saved images:', error);
        return;
      }

      console.log('✅ Loaded saved images:', data?.length || 0);
      setSavedImages(data || []);
    } catch (error) {
      console.error('Error in loadSavedImages:', error);
    } finally {
      setLoadingSavedImages(false);
    }
  };

  const loadBusinessCard = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('business_card_image_url')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading business card:', error);
        return;
      }

      if (data?.business_card_image_url) {
        console.log('✅ Loaded business card:', data.business_card_image_url);
        setBusinessCardImageUrl(data.business_card_image_url);
      }
    } catch (error) {
      console.error('Error in loadBusinessCard:', error);
    }
  };

  const handleSelectBusinessCard = async () => {
    if (!businessCardImageUrl) {
      Alert.alert('알림', '명함 이미지가 설정되지 않았습니다.');
      return;
    }

    try {
      // user_images에서 명함 이미지 찾기
      const { data: image, error } = await supabase
        .from('user_images')
        .select('id')
        .eq('image_url', businessCardImageUrl)
        .eq('category', 'business_card')
        .single();

      if (error || !image) {
        // user_images에 없으면 직접 URL 사용
        const baseUrl = 'https://bizconnect-ten.vercel.app';
        // user_settings의 business_card_image_url을 직접 사용
        setSelectedImage(businessCardImageUrl);
        // Open Graph URL 생성 시도 (user_images에 없으면 원본 URL 사용)
        setSelectedImagePreviewUrl(businessCardImageUrl);
        setShowImagePicker(false);
        console.log('✅ Business card selected (direct URL)');
        return;
      }

      // Open Graph URL 생성
      const baseUrl = 'https://bizconnect-ten.vercel.app';
      const previewUrl = `${baseUrl}/api/preview/${image.id}`;
      
      setSelectedImage(businessCardImageUrl);
      setSelectedImagePreviewUrl(previewUrl);
      setShowImagePicker(false);
      
      console.log('✅ Business card selected, preview URL:', previewUrl);
    } catch (error: any) {
      console.error('Error selecting business card:', error);
      Alert.alert('오류', '명함 이미지 선택 중 오류가 발생했습니다.');
    }
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllCustomers = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map((c) => c.id));
    }
  };

  const handleAIGenerate = async () => {
    if (!user || selectedCustomers.length === 0) {
      Alert.alert('알림', '고객을 선택해주세요.');
      return;
    }

    if (selectedCustomers.length > 1) {
      Alert.alert('알림', 'AI 문자 생성은 한 명의 고객만 선택할 수 있습니다.');
      return;
    }

    const customerId = selectedCustomers[0];
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    setAiGenerating(true);
    setSelectedCustomerId(customerId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('오류', '세션이 만료되었습니다.');
        return;
      }

      const response = await fetch('https://bizconnect-ten.vercel.app/api/ai/suggest-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customerId: customer.id,
          customerPhone: customer.phone,
          customerName: customer.name,
          intent: '안부 인사 및 관계 유지',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI 추천을 받을 수 없습니다.');
      }

      const data = await response.json();
      const suggestions = data.suggestions;
      // 정중한 버전을 기본으로 사용
      if (suggestions.formal) {
        setMessage(suggestions.formal);
      } else if (suggestions.casual) {
        setMessage(suggestions.casual);
      }
    } catch (error: any) {
      console.error('AI generate error:', error);
      Alert.alert('오류', error.message || 'AI 문자 생성 중 오류가 발생했습니다.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSummarize = async () => {
    if (!user || selectedCustomers.length === 0) {
      Alert.alert('알림', '고객을 선택해주세요.');
      return;
    }

    if (selectedCustomers.length > 1) {
      Alert.alert('알림', '요약은 한 명의 고객만 선택할 수 있습니다.');
      return;
    }

    const customerId = selectedCustomers[0];
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    setSummaryLoading(true);
    setShowSummary(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('오류', '세션이 만료되었습니다.');
        return;
      }

      const response = await fetch('https://bizconnect-ten.vercel.app/api/ai/summarize-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customerId: customer.id,
          customerPhone: customer.phone,
          saveToMemo: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '요약을 생성할 수 없습니다.');
      }

      const data = await response.json();
      setSummaryData(data.summary);

      // 요약 정보를 바탕으로 AI 문자 생성
      if (data.summary) {
        const aiResponse = await fetch('https://bizconnect-ten.vercel.app/api/ai/suggest-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            customerId: customer.id,
            customerPhone: customer.phone,
            customerName: customer.name,
            intent: `과거 대화 요약: ${data.summary.summary}. 주요 포인트: ${data.summary.keyPoints?.join(', ')}. 다음 액션: ${data.summary.nextActions?.join(', ')}`,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          if (aiData.suggestions?.formal) {
            setMessage(aiData.suggestions.formal);
          }
        }
      }
    } catch (error: any) {
      console.error('Summarize error:', error);
      Alert.alert('오류', error.message || '요약 생성 중 오류가 발생했습니다.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const requestImagePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      // Android 13+ (API 33+)에서는 READ_MEDIA_IMAGES 사용
      // Android 12 이하에서는 READ_EXTERNAL_STORAGE 사용
      const permission = Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      console.log('📷 Requesting permission:', permission);
      const granted = await PermissionsAndroid.request(permission);
      console.log('📷 Permission result:', granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting image permission:', error);
      return false;
    }
  };

  const handlePickImage = async () => {
    // 이미지 선택 모달 표시 (저장된 이미지 또는 새로 선택)
    setShowImagePicker(true);
  };

  const handleSelectSavedImage = async (image: any) => {
    try {
      console.log('📷 Selected saved image:', image);
      
      // Open Graph URL 생성
      const baseUrl = 'https://bizconnect-ten.vercel.app';
      const previewUrl = `${baseUrl}/api/preview/${image.id}`;
      
      setSelectedImage(image.image_url);
      setSelectedImagePreviewUrl(previewUrl);
      setShowImagePicker(false);
      
      console.log('✅ Image selected, preview URL:', previewUrl);
    } catch (error: any) {
      console.error('Error selecting saved image:', error);
      Alert.alert('오류', '이미지 선택 중 오류가 발생했습니다.');
    }
  };

  const handlePickNewImage = async () => {
    try {
      setShowImagePicker(false);
      
      const hasPerm = await requestImagePermission();
      if (!hasPerm) {
        Alert.alert('권한 필요', '이미지 접근 권한을 허용해주세요.');
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2048,
        maxHeight: 2048,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) return;

      console.log('📷 Selected new image URI:', asset.uri);
      console.log('📷 Image type:', asset.type);
      console.log('📷 Image file size:', asset.fileSize);

      // 이미지 업로드 및 저장
      await uploadAndSaveImage(asset);
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('오류', '이미지 선택 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  };

  const uploadAndSaveImage = async (asset: any) => {
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    setUploadingImage(true);
    try {
      // 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('오류', '세션이 만료되었습니다.');
        return;
      }

      // React Native FormData 생성 (File 객체 없이 직접 사용)
      const formData = new FormData();
      
      // 파일명 생성
      const fileName = asset.fileName || `image_${Date.now()}.jpg`;
      const fileType = asset.type || 'image/jpeg';
      
      // React Native에서는 uri를 직접 FormData에 추가
      // @ts-ignore - React Native FormData는 uri를 직접 지원
      formData.append('file', {
        uri: asset.uri,
        type: fileType,
        name: fileName,
      });
      formData.append('name', fileName);
      formData.append('category', 'general');

      console.log('📤 Uploading image:', {
        uri: asset.uri,
        type: fileType,
        name: fileName,
      });

      // API 호출
      const uploadResponse = await fetch('https://bizconnect-ten.vercel.app/api/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // Content-Type은 FormData가 자동으로 설정하므로 명시하지 않음
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || '이미지 업로드 실패');
      }

      const uploadData = await uploadResponse.json();
      console.log('✅ Image uploaded successfully:', uploadData);

      // 저장된 이미지 목록 새로고침
      await loadSavedImages();

      // 선택된 이미지 설정
      setSelectedImage(uploadData.image.image_url);
      setSelectedImagePreviewUrl(uploadData.image.preview_url);
      
      Alert.alert('성공', '이미지가 업로드되었습니다.');
    } catch (error: any) {
      console.error('Image upload error:', error);
      Alert.alert('오류', error.message || '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setSelectedImagePreviewUrl(null);
    setAttachBusinessCard(false); // 명함 첨부도 해제
  };

  const handleSend = async () => {
    console.log('📤 handleSend called');

    if (!message.trim()) {
      Alert.alert('알림', '메시지를 입력해주세요.');
      return;
    }

    if (selectedCustomers.length === 0) {
      Alert.alert('알림', '수신자를 선택해주세요.');
      return;
    }

    setSending(true);

    try {
      const selectedCustomersData = customers.filter((c) =>
        selectedCustomers.includes(c.id)
      );

      console.log('📤 Sending to', selectedCustomersData.length, 'customers');

      let successCount = 0;
      let failCount = 0;

      for (const customer of selectedCustomersData) {
        try {
          console.log('📤 Sending to:', customer.name, customer.phone);

          // NativeModules 디버그
          const { NativeModules } = require('react-native');
          console.log('📤 NativeModules.Sms:', NativeModules.Sms);
          console.log('📤 NativeModules.Sms?.autoSend:', typeof NativeModules.Sms?.autoSend);

          // 이미지가 있으면 Open Graph URL을 사용하여 MMS 발송
          if (selectedImage) {
            console.log('📤 Sending message with image attachment');
            console.log('📤 Selected image URL:', selectedImage);
            console.log('📤 Preview URL (Open Graph):', selectedImagePreviewUrl);
            
            // Open Graph URL이 있으면 그것을 사용, 없으면 원본 URL 사용
            const imageUrlToSend = selectedImagePreviewUrl || selectedImage;
            
            // sendMmsDirectly는 Open Graph URL을 자동으로 처리함
            console.log('📤 Calling sendMmsDirectly with Open Graph URL:', imageUrlToSend);
            await sendMmsDirectly(customer.phone, message, imageUrlToSend);
            console.log('✅ sendMmsDirectly completed');
          } else {
            console.log('📤 Sending SMS directly using NativeModules.Sms');
            // 직접 NativeModules.Sms.autoSend 호출
            const normalizedPhone = customer.phone.replace(/\D/g, '');
            console.log('📤 Normalized phone:', normalizedPhone);
            console.log('📤 Message:', message);

            await new Promise((resolve, reject) => {
              console.log('📤 Calling NativeModules.Sms.autoSend...');

              // 타임아웃: 2초 후 자동 성공 처리 (네이티브 콜백이 안 올 경우)
              // SMS는 대부분 1초 내 발송 완료되므로 2초면 충분
              const timeout = setTimeout(() => {
                console.log('📤 SMS timeout (2s) - assuming success');
                resolve(true);
              }, 2000);

              try {
                NativeModules.Sms.autoSend(
                  normalizedPhone,
                  message,
                  (fail: any) => {
                    clearTimeout(timeout);
                    console.error('📤 SMS FAILED:', fail);
                    reject(new Error(fail?.toString() || 'SMS 발송 실패'));
                  },
                  (success: any) => {
                    clearTimeout(timeout);
                    console.log('📤 SMS SUCCESS callback received');
                    resolve(true);
                  }
                );
                console.log('📤 autoSend called - waiting for callback (max 2s)');
              } catch (e: any) {
                clearTimeout(timeout);
                console.error('📤 autoSend exception:', e);
                reject(e);
              }
            });
          }

          // 발송 로그 기록 (웹 히스토리/AI 분석용)
          const { error: logError } = await supabase.from('sms_logs').insert({
            user_id: user?.id,
            customer_id: customer.id,
            phone_number: customer.phone.replace(/\D/g, ''),
            message,
            status: 'sent',
            sent_at: new Date().toISOString(),
            is_mms: !!selectedImage,
            image_url: selectedImagePreviewUrl || selectedImage || null, // Open Graph URL 우선 사용
          });

          if (logError) {
            console.error('Error saving SMS log:', logError);
          }

          // 일일 한도 카운트 증가
          if (user?.id) {
            await incrementSentCount(user.id);
          }

          successCount++;
          // 대량 발송 시에만 지연 (단일 문자는 즉시 발송)
          if (selectedCustomersData.length > 1) {
            await new Promise((res) => setTimeout(res, 300));
          }
        } catch (error: any) {
          console.error('=== SEND ERROR ===');
          console.error('Customer:', customer.name, customer.phone);
          console.error('Error message:', error?.message);
          console.error('Error stack:', error?.stack);
          console.error('Full error:', JSON.stringify(error, null, 2));
          
          // 실패 로그도 기록
          try {
            await supabase.from('sms_logs').insert({
              user_id: user?.id,
              customer_id: customer.id,
              phone_number: customer.phone.replace(/\D/g, ''),
              message,
              status: 'failed',
              sent_at: new Date().toISOString(),
              error_message: error?.message || error?.toString() || '발송 실패',
              is_mms: !!selectedImage,
              image_url: selectedImagePreviewUrl || selectedImage || null, // Open Graph URL 우선 사용
            });
          } catch (logError) {
            console.error('Error saving failed log:', logError);
          }
          failCount++;
        }
      }

      Alert.alert(
        '발송 완료',
        `성공: ${successCount}건, 실패: ${failCount}건`,
        [
          {
            text: '확인',
            onPress: () => {
              setMessage('');
              setSelectedCustomers([]);
              setSelectedImage(null);
              setSelectedImagePreviewUrl(null);
              setSearchQuery('');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('오류', error.message || '문자 발송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            {/* 헤더 */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.welcomeText}>{user?.email?.split('@')[0]}님</Text>
              </View>
              <Text style={styles.headerTitle}>문자 보내기</Text>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.settingsButtonText}>⚙️</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
            {/* 선택된 수신자 표시 (상단) */}
            {selectedCustomers.length > 0 && (
              <View style={styles.selectedSection}>
                <Text style={styles.selectedTitle}>선택된 수신자 ({selectedCustomers.length}명)</Text>
                <View style={styles.selectedChips}>
                  {customers.filter(c => selectedCustomers.includes(c.id)).slice(0, 5).map(customer => (
                    <TouchableOpacity
                      key={customer.id}
                      style={styles.selectedChip}
                      onPress={() => toggleCustomerSelection(customer.id)}
                    >
                      <Text style={styles.selectedChipText}>{customer.name}</Text>
                      <Text style={styles.selectedChipRemove}>✕</Text>
                    </TouchableOpacity>
                  ))}
                  {selectedCustomers.length > 5 && (
                    <View style={styles.selectedChipMore}>
                      <Text style={styles.selectedChipMoreText}>+{selectedCustomers.length - 5}명</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* 검색 및 고객 선택 */}
            <View style={styles.searchSection}>
              <TextInput
                style={styles.searchInput}
                placeholder="고객 검색 (이름 또는 전화번호)"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {filteredCustomers.length > 0 && (
                <TouchableOpacity onPress={selectAllCustomers} style={styles.selectAllBtn}>
                  <Text style={styles.selectAllBtnText}>
                    {selectedCustomers.length === filteredCustomers.length ? '전체해제' : '전체선택'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 고객 목록 (컴팩트) */}
            <View style={styles.customerListSection}>
              {customersLoading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingText}>로딩중...</Text>
                </View>
              ) : filteredCustomers.length === 0 ? (
                <Text style={styles.emptyText}>
                  {searchQuery ? '검색 결과 없음' : '고객이 없습니다'}
                </Text>
              ) : (
                <View style={styles.customerGrid}>
                  {filteredCustomers.slice(0, 20).map((customer) => (
                    <TouchableOpacity
                      key={customer.id}
                      style={[
                        styles.customerChip,
                        selectedCustomers.includes(customer.id) && styles.customerChipSelected,
                      ]}
                      onPress={() => toggleCustomerSelection(customer.id)}
                    >
                      <Text style={[
                        styles.customerChipText,
                        selectedCustomers.includes(customer.id) && styles.customerChipTextSelected,
                      ]}>
                        {customer.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {filteredCustomers.length > 20 && (
                    <Text style={styles.moreText}>외 {filteredCustomers.length - 20}명</Text>
                  )}
                </View>
              )}
            </View>

            {/* 메시지 작성 영역 */}
            <View style={styles.messageSection}>
              <Text style={styles.sectionLabel}>메시지</Text>
              <TextInput
                ref={messageInputRef}
                style={styles.messageInput}
                multiline
                numberOfLines={4}
                placeholder="메시지를 입력하세요..."
                placeholderTextColor="#9CA3AF"
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />
              {/* 명함 첨부 체크박스 */}
              {businessCardImageUrl && (
                <View style={styles.businessCardRow}>
                  <View style={styles.businessCardCheckbox}>
                    <Switch
                      value={attachBusinessCard}
                      onValueChange={(value) => {
                        setAttachBusinessCard(value);
                        if (value) {
                          // 명함 첨부 시 자동으로 명함 이미지 선택
                          handleSelectBusinessCard();
                        } else {
                          // 명함 해제 시 이미지 제거
                          setSelectedImage(null);
                          setSelectedImagePreviewUrl(null);
                        }
                      }}
                      trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                      thumbColor="#fff"
                    />
                    <Text style={styles.businessCardLabel}>📇 명함 첨부</Text>
                  </View>
                  {attachBusinessCard && (
                    <Text style={styles.businessCardHint}>✓ 명함이 메시지와 함께 발송됩니다</Text>
                  )}
                </View>
              )}

              {/* 이미지 첨부 */}
              <View style={styles.imageRow}>
                {selectedImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <View style={styles.imagePreviewSmall}>
                      <Image source={{ uri: selectedImage }} style={styles.imageThumb} resizeMode="cover" />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={handleRemoveImage}>
                        <Text style={styles.removeImageBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.imageAttachedLabel}>✓ 이미지 첨부됨</Text>
                    <TouchableOpacity style={styles.changeImageBtn} onPress={handlePickImage}>
                      <Text style={styles.changeImageBtnText}>이미지 변경</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} disabled={uploadingImage}>
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="#6B7280" />
                    ) : (
                      <Text style={styles.attachBtnText}>📷 이미지 첨부</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 템플릿 (간소화) */}
            {templates.length > 0 && (
              <View style={styles.templatesSection}>
                <TouchableOpacity
                  style={styles.templatesHeader}
                  onPress={() => setShowTemplates(!showTemplates)}
                >
                  <Text style={styles.templatesTitle}>템플릿 {showTemplates ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showTemplates && (
                  <View style={styles.templatesList}>
                    {templates.map((template) => (
                      <TouchableOpacity
                        key={template.id}
                        style={styles.templateItem}
                        onPress={() => {
                          setMessage(template.content);
                          setShowTemplates(false);
                        }}
                      >
                        <Text style={styles.templateName}>{template.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 콜백 옵션 설정 카드 */}
            <TouchableOpacity
              style={styles.callbackOptionCard}
              onPress={() => {
                if (navigation.navigate) {
                  navigation.navigate('CallbackSettings');
                }
              }}
            >
              <View style={styles.callbackOptionHeader}>
                <Text style={styles.callbackOptionTitle}>📞 콜백 옵션 설정</Text>
                {Platform.OS === 'android' && (
                  <View style={styles.androidBadge}>
                    <Text style={styles.androidBadgeText}>Android</Text>
                  </View>
                )}
              </View>
              <Text style={styles.callbackOptionDescription}>
                통화 종료 후 자동으로 문자 발송
              </Text>
            </TouchableOpacity>
            </ScrollView>

            {/* 이미지 선택 모달 */}
            {showImagePicker && (
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>이미지 선택</Text>
                    <TouchableOpacity onPress={() => setShowImagePicker(false)}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.modalScrollView}>
                    {/* 명함 사용 버튼 */}
                    {businessCardImageUrl && (
                      <TouchableOpacity 
                        style={[styles.newImageButton, { backgroundColor: '#10B981' }]}
                        onPress={handleSelectBusinessCard}
                      >
                        <Text style={styles.newImageButtonIcon}>📇</Text>
                        <Text style={[styles.newImageButtonText, { color: '#fff' }]}>명함 사용</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* 새 이미지 선택 버튼 */}
                    <TouchableOpacity 
                      style={styles.newImageButton}
                      onPress={handlePickNewImage}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <ActivityIndicator size="small" color="#2563EB" />
                      ) : (
                        <>
                          <Text style={styles.newImageButtonIcon}>📷</Text>
                          <Text style={styles.newImageButtonText}>새 이미지 선택</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* 저장된 이미지 목록 */}
                    <Text style={styles.savedImagesTitle}>저장된 이미지</Text>
                    {loadingSavedImages ? (
                      <View style={styles.loadingState}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text style={styles.loadingText}>로딩중...</Text>
                      </View>
                    ) : savedImages.length === 0 ? (
                      <Text style={styles.emptyText}>저장된 이미지가 없습니다.</Text>
                    ) : (
                      <View style={styles.savedImagesGrid}>
                        {savedImages.map((image) => (
                          <TouchableOpacity
                            key={image.id}
                            style={styles.savedImageItem}
                            onPress={() => handleSelectSavedImage(image)}
                          >
                            <Image 
                              source={{ uri: image.image_url }} 
                              style={styles.savedImageThumb} 
                              resizeMode="cover"
                            />
                            {image.name && (
                              <Text style={styles.savedImageName} numberOfLines={1}>
                                {image.name}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* 하단 고정 버튼 */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[styles.aiButton, aiGenerating && styles.aiButtonDisabled]}
                onPress={handleAIGenerate}
                disabled={aiGenerating || selectedCustomers.length !== 1}
              >
                {aiGenerating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.aiButtonText}>✨ AI</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={sending || selectedCustomers.length === 0}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>
                    전송 ({selectedCustomers.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120, // 하단 버튼 공간 확보
  },
  searchSection: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111827',
  },
  messageSection: {
    marginBottom: 16,
  },
  messageInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlignVertical: 'top',
    color: '#111827',
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  summaryPoints: {
    marginTop: 8,
  },
  summaryPointsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  summaryPoint: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
    marginBottom: 4,
  },
  recipientsSection: {
    marginBottom: 16,
  },
  recipientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recipientsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  selectAllButton: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customerItemSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  customerCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerCheckmark: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  templatesSection: {
    marginBottom: 16,
  },
  templatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  templatesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  templatesToggle: {
    fontSize: 12,
    color: '#6B7280',
  },
  templatesList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
  },
  templateItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  templateContent: {
    fontSize: 12,
    color: '#6B7280',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  aiButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    padding: 16,
    flex: 1,
    alignItems: 'center',
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 16,
    flex: 2,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageSection: {
    marginTop: 12,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addImageButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  addImageButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    alignItems: 'flex-start',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  removeImageButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // 새로운 컴팩트 UI 스타일
  selectedSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  selectedChipRemove: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
  },
  selectedChipMore: {
    backgroundColor: '#93C5FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedChipMoreText: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '500',
  },
  selectAllBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  selectAllBtnText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  customerListSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    minHeight: 60,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
  },
  customerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customerChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customerChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  customerChipText: {
    fontSize: 14,
    color: '#374151',
  },
  customerChipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 13,
    color: '#6B7280',
    alignSelf: 'center',
    marginLeft: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  callbackOptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  callbackOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  callbackOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  callbackOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
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
  businessCardRow: {
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  businessCardCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessCardLabel: {
    marginLeft: 8,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  businessCardHint: {
    marginTop: 6,
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  imageRow: {
    marginTop: 8,
  },
  imagePreviewSmall: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageThumb: {
    width: 80,
    height: 80,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  attachBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  attachBtnText: {
    fontSize: 14,
    color: '#6B7280',
  },
  imageAttachedLabel: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  callbackOptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  callbackOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  callbackOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  callbackOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalClose: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  modalScrollView: {
    maxHeight: 500,
  },
  newImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
  },
  newImageButtonIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  newImageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  savedImagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  savedImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  savedImageItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  savedImageThumb: {
    width: '100%',
    height: '80%',
  },
  savedImageName: {
    fontSize: 11,
    color: '#6B7280',
    padding: 4,
    textAlign: 'center',
  },
  changeImageBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  changeImageBtnText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});

