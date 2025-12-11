import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { launchImageLibrary } from 'react-native-image-picker';
import { PermissionsAndroid, Platform as RNPlatform } from 'react-native';
import { requestMultiple, PERMISSIONS } from 'react-native-permissions';
import { downloadImage, getCachedImagePath } from '../lib/imageCache';
import { Buffer } from 'buffer';

interface CallbackSettings {
  auto_callback_enabled: boolean;
  // 3가지 콜백 옵션
  callback_on_end_enabled: boolean;
  callback_on_end_message: string;
  callback_on_missed_enabled: boolean;
  callback_on_missed_message: string;
  callback_on_busy_enabled: boolean;
  callback_on_busy_message: string;
  // 기본 명함
  business_card_enabled: boolean;
  business_card_image_url: string | null;
}

interface CategorySettings {
  [key: string]: {
    enabled: boolean;
    useAI: boolean;
  };
}

// 기본 메시지
const DEFAULT_MESSAGES = {
  ended: '안녕하세요, 방금 통화 감사합니다. 궁금하신 점 있으시면 편하게 연락주세요.',
  missed: '안녕하세요, 전화를 받지 못해 죄송합니다. 확인 후 다시 연락드리겠습니다.',
  busy: '안녕하세요, 통화중이라 받지 못했습니다. 잠시 후 연락드리겠습니다.',
};

export default function CallbackSettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CallbackSettings>({
    auto_callback_enabled: true,
    callback_on_end_enabled: true,
    callback_on_end_message: DEFAULT_MESSAGES.ended,
    callback_on_missed_enabled: true,
    callback_on_missed_message: DEFAULT_MESSAGES.missed,
    callback_on_busy_enabled: true,
    callback_on_busy_message: DEFAULT_MESSAGES.busy,
    business_card_enabled: false,
    business_card_image_url: null,
  });
  const [categorySettings, setCategorySettings] = useState<CategorySettings>({});
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadGroups();
    }
  }, [user]);

  // 키보드가 올라올 때 스크롤 조정
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        if (focusedInput && scrollViewRef.current) {
          // 약간의 딜레이 후 스크롤
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, [focusedInput]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 사용자 설정 로드
      const { data: userSettings, error } = await supabase
        .from('user_settings')
        .select(`
          auto_callback_enabled,
          callback_on_end_enabled,
          callback_on_end_message,
          callback_on_missed_enabled,
          callback_on_missed_message,
          callback_on_busy_enabled,
          callback_on_busy_message,
          business_card_enabled,
          business_card_image_url
        `)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        Alert.alert('오류', '설정을 불러올 수 없습니다.');
        return;
      }

      if (userSettings) {
        setSettings({
          auto_callback_enabled: userSettings.auto_callback_enabled ?? true,
          callback_on_end_enabled: userSettings.callback_on_end_enabled ?? true,
          callback_on_end_message: userSettings.callback_on_end_message || DEFAULT_MESSAGES.ended,
          callback_on_missed_enabled: userSettings.callback_on_missed_enabled ?? true,
          callback_on_missed_message: userSettings.callback_on_missed_message || DEFAULT_MESSAGES.missed,
          callback_on_busy_enabled: userSettings.callback_on_busy_enabled ?? true,
          callback_on_busy_message: userSettings.callback_on_busy_message || DEFAULT_MESSAGES.busy,
          business_card_enabled: userSettings.business_card_enabled ?? false,
          business_card_image_url: userSettings.business_card_image_url || null,
        });

        // 명함 이미지가 HTTP URL이면 미리 다운로드 (백그라운드)
        if (userSettings.business_card_image_url && 
            (userSettings.business_card_image_url.startsWith('http://') || 
             userSettings.business_card_image_url.startsWith('https://'))) {
          console.log('📥 Pre-downloading business card image...');
          getCachedImagePath(userSettings.business_card_image_url)
            .then((cachedPath) => {
              if (!cachedPath) {
                // 캐시에 없으면 다운로드
                downloadImage(userSettings.business_card_image_url!)
                  .then((localPath) => {
                    console.log('✅ Business card image pre-downloaded:', localPath);
                  })
                  .catch((error) => {
                    console.error('⚠️ Failed to pre-download business card image:', error);
                    // 다운로드 실패해도 계속 진행 (발송 시 다시 시도)
                  });
              } else {
                console.log('✅ Business card image already cached:', cachedPath);
              }
            })
            .catch((error) => {
              console.error('⚠️ Error checking cached image:', error);
            });
        }
      }
    } catch (error) {
      console.error('Error in loadSettings:', error);
      Alert.alert('오류', '설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    if (!user) return;

    try {
      const { data: groupsData, error } = await supabase
        .from('customer_groups')
        .select('id, name')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error loading groups:', error);
        return;
      }

      if (groupsData) {
        setGroups(groupsData);

        // 카테고리별 설정 초기화
        const defaultCategorySettings: CategorySettings = {};
        groupsData.forEach((group) => {
          const groupName = group.name.toLowerCase();

          // 가족/친구는 기본적으로 발송 안 함
          if (groupName.includes('가족') || groupName.includes('친구') || groupName.includes('family') || groupName.includes('friend')) {
            defaultCategorySettings[group.id] = {
              enabled: false,
              useAI: false,
            };
          }
          // 거래처/VIP는 AI 사용
          else if (groupName.includes('거래처') || groupName.includes('vip') || groupName.includes('비즈니스') || groupName.includes('business')) {
            defaultCategorySettings[group.id] = {
              enabled: true,
              useAI: true,
            };
          }
          // 나머지는 기본 템플릿
          else {
            defaultCategorySettings[group.id] = {
              enabled: true,
              useAI: false,
            };
          }
        });

        setCategorySettings(defaultCategorySettings);
      }
    } catch (error) {
      console.error('Error in loadGroups:', error);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // user_settings 업데이트 또는 생성
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          auto_callback_enabled: settings.auto_callback_enabled,
          callback_on_end_enabled: settings.callback_on_end_enabled,
          callback_on_end_message: settings.callback_on_end_message,
          callback_on_missed_enabled: settings.callback_on_missed_enabled,
          callback_on_missed_message: settings.callback_on_missed_message,
          callback_on_busy_enabled: settings.callback_on_busy_enabled,
          callback_on_busy_message: settings.callback_on_busy_message,
          business_card_enabled: settings.business_card_enabled,
          business_card_image_url: settings.business_card_image_url,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (settingsError) {
        console.error('Error saving settings:', settingsError);
        Alert.alert('오류', '설정 저장에 실패했습니다.');
        return;
      }

      // 저장 성공 후 Alert 확인 버튼 클릭 시 자동으로 메인으로 이동
      Alert.alert('성공', '설정이 저장되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Error in saveSettings:', error);
      Alert.alert('오류', '설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 이미지 선택 및 업로드
  const requestImagePermission = async (): Promise<boolean> => {
    if (RNPlatform.OS !== 'android') return true;
    try {
      // Android 13+ (API 33+)에서는 READ_MEDIA_IMAGES 사용
      // Android 12 이하는 READ_EXTERNAL_STORAGE 사용
      const result = await requestMultiple([
        PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
        PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
      ]);
      
      const hasMediaImages = result[PERMISSIONS.ANDROID.READ_MEDIA_IMAGES] === 'granted';
      const hasStorage = result[PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE] === 'granted';
      
      return hasMediaImages || hasStorage;
    } catch (error) {
      console.error('Error requesting image permission:', error);
      // 폴백: 기존 방식 사용
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (fallbackError) {
        console.error('Error in fallback permission request:', fallbackError);
        return false;
      }
    }
  };

  const pickAndUploadImage = async () => {
    if (!user) return;

    try {
      setUploadingImage(true);
      
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

      if (result.didCancel) {
        console.log('User cancelled image picker');
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        console.log('No image selected');
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        console.error('Image URI is missing');
        Alert.alert('오류', '이미지를 선택할 수 없습니다.');
        return;
      }

      console.log('📷 Selected image URI:', asset.uri);
      console.log('📷 Image type:', asset.type);
      console.log('📷 Image file size:', asset.fileSize);

      // 파일 이름 생성
      const fileName = `business_card_${user.id}_${Date.now()}.jpg`;
      const filePath = `business-cards/${fileName}`;

      // 파일을 blob으로 변환
      // Android에서는 file:// URI를 직접 fetch할 수 없으므로 react-native-fs + Buffer 사용
      let blob: Blob;

      const makeBlobFromBase64 = (base64: string, mime: string) => {
        const buffer = Buffer.from(base64, 'base64');
        return new Blob([buffer], { type: mime });
      };

      if (asset.uri.startsWith('file://') || asset.uri.startsWith('/')) {
        // 로컬 파일 경로인 경우 react-native-fs로 읽기
        console.log('📥 Reading local file using react-native-fs...');
        const RNFS = require('react-native-fs').default;

        // file:// 제거
        const filePathLocal = asset.uri.replace('file://', '');
        console.log('📥 File path:', filePathLocal);

        // 파일 존재 확인
        const fileExists = await RNFS.exists(filePathLocal);
        if (!fileExists) {
          throw new Error('선택한 이미지 파일을 찾을 수 없습니다.');
        }

        // base64로 읽기
        const base64 = await RNFS.readFile(filePathLocal, 'base64');
        console.log('✅ File read successfully, size:', base64.length);

        // base64를 blob으로 변환
        blob = makeBlobFromBase64(base64, asset.type || 'image/jpeg');
        console.log('✅ Blob created, size:', blob.size);
      } else if (asset.uri.startsWith('http://') || asset.uri.startsWith('https://')) {
        // HTTP URL인 경우 fetch 사용
        console.log('📥 Fetching image from URL...');
        const response = await fetch(asset.uri);
        if (!response.ok) {
          throw new Error('이미지를 다운로드할 수 없습니다.');
        }
        blob = await response.blob();
        console.log('✅ Image fetched, size:', blob.size);
      } else {
        // content:// URI인 경우도 react-native-fs로 처리 시도
        console.log('📥 Reading content URI using react-native-fs...');
        const RNFS = require('react-native-fs').default;
        const base64 = await RNFS.readFile(asset.uri, 'base64');
        blob = makeBlobFromBase64(base64, asset.type || 'image/jpeg');
        console.log('✅ Content URI read successfully');
      }

      // Supabase Storage에 업로드 (웹과 동일한 bucket 사용)
      const { data, error } = await supabase.storage
        .from('user-images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Upload error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        Alert.alert('오류', '이미지 업로드에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
        return;
      }

      // Public URL 가져오기
      const { data: urlData } = supabase.storage
        .from('user-images')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        const imageUrl = urlData.publicUrl;
        
        // user_settings에 저장
        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            business_card_image_url: imageUrl,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (settingsError) {
          console.error('Error saving image URL to settings:', settingsError);
          Alert.alert('경고', '이미지는 업로드되었지만 설정 저장에 실패했습니다.');
        }

        setSettings((prev) => ({
          ...prev,
          business_card_image_url: imageUrl,
        }));
        
        // 설정 다시 로드하여 최신 상태 확인
        await loadSettings();
        
        Alert.alert('성공', '명함 이미지가 업로드되었습니다.');
      } else {
        throw new Error('Failed to get public URL');
      }
    } catch (error: any) {
      console.error('Error picking/uploading image:', error);
      Alert.alert('오류', '이미지 선택/업로드 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setUploadingImage(false);
    }
  };

  // 이미지 삭제
  const removeImage = () => {
    Alert.alert(
      '이미지 삭제',
      '명함 이미지를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            setSettings((prev) => ({
              ...prev,
              business_card_image_url: null,
            }));
          },
        },
      ]
    );
  };

  const toggleCategoryEnabled = (groupId: string) => {
    setCategorySettings((prev) => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        enabled: !prev[groupId]?.enabled,
      },
    }));
  };

  const toggleCategoryAI = (groupId: string) => {
    setCategorySettings((prev) => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        useAI: !prev[groupId]?.useAI,
      },
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>설정을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.header}>
            <Text style={styles.title}>콜백 설정</Text>
            <Text style={styles.subtitle}>
              통화 종료 후 자동으로 고객에게 문자를 발송합니다
            </Text>
          </View>

          <View style={styles.content}>
            {/* 콜백 활성화 */}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text style={styles.sectionTitle}>콜백 서비스 활성화</Text>
                  <Text style={styles.sectionDescription}>
                    활성화하면 통화 종료 후 자동으로 설정된 템플릿으로 문자를 발송합니다.
                  </Text>
                </View>
                <Switch
                  value={settings.auto_callback_enabled}
                  onValueChange={(value) =>
                    setSettings((prev) => ({ ...prev, auto_callback_enabled: value }))
                  }
                  trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* 3가지 콜백 옵션 */}
            {settings.auto_callback_enabled && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>콜백 옵션 설정</Text>
                <Text style={styles.sectionDescription}>
                  상황별로 다른 메시지를 설정할 수 있습니다.
                </Text>

                {/* 통화 종료 옵션 */}
                <View style={styles.optionCard}>
                  <View style={styles.optionHeader}>
                    <View style={styles.optionTitleRow}>
                      <View style={[styles.optionBadge, { backgroundColor: '#10B981' }]}>
                        <Text style={styles.optionBadgeText}>통화종료</Text>
                      </View>
                      <Switch
                        value={settings.callback_on_end_enabled}
                        onValueChange={(value) =>
                          setSettings((prev) => ({ ...prev, callback_on_end_enabled: value }))
                        }
                        trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                        thumbColor="#fff"
                      />
                    </View>
                    <Text style={styles.optionDescription}>
                      정상적으로 통화가 끝났을 때 발송
                    </Text>
                  </View>
                  {settings.callback_on_end_enabled && (
                    <TextInput
                      style={styles.optionInput}
                      multiline
                      numberOfLines={3}
                      value={settings.callback_on_end_message}
                      onChangeText={(text) =>
                        setSettings((prev) => ({ ...prev, callback_on_end_message: text }))
                      }
                      placeholder={DEFAULT_MESSAGES.ended}
                      onFocus={() => setFocusedInput('ended')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  )}
                </View>

                {/* 부재중 옵션 */}
                <View style={styles.optionCard}>
                  <View style={styles.optionHeader}>
                    <View style={styles.optionTitleRow}>
                      <View style={[styles.optionBadge, { backgroundColor: '#F59E0B' }]}>
                        <Text style={styles.optionBadgeText}>부재중</Text>
                      </View>
                      <Switch
                        value={settings.callback_on_missed_enabled}
                        onValueChange={(value) =>
                          setSettings((prev) => ({ ...prev, callback_on_missed_enabled: value }))
                        }
                        trackColor={{ false: '#D1D5DB', true: '#F59E0B' }}
                        thumbColor="#fff"
                      />
                    </View>
                    <Text style={styles.optionDescription}>
                      전화를 받지 못했을 때 발송
                    </Text>
                  </View>
                  {settings.callback_on_missed_enabled && (
                    <TextInput
                      style={styles.optionInput}
                      multiline
                      numberOfLines={3}
                      value={settings.callback_on_missed_message}
                      onChangeText={(text) =>
                        setSettings((prev) => ({ ...prev, callback_on_missed_message: text }))
                      }
                      placeholder={DEFAULT_MESSAGES.missed}
                      onFocus={() => setFocusedInput('missed')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  )}
                </View>

                {/* 통화중 옵션 */}
                <View style={styles.optionCard}>
                  <View style={styles.optionHeader}>
                    <View style={styles.optionTitleRow}>
                      <View style={[styles.optionBadge, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.optionBadgeText}>통화중</Text>
                      </View>
                      <Switch
                        value={settings.callback_on_busy_enabled}
                        onValueChange={(value) =>
                          setSettings((prev) => ({ ...prev, callback_on_busy_enabled: value }))
                        }
                        trackColor={{ false: '#D1D5DB', true: '#EF4444' }}
                        thumbColor="#fff"
                      />
                    </View>
                    <Text style={styles.optionDescription}>
                      다른 통화 중이라 받지 못했을 때 발송
                    </Text>
                  </View>
                  {settings.callback_on_busy_enabled && (
                    <TextInput
                      style={styles.optionInput}
                      multiline
                      numberOfLines={3}
                      value={settings.callback_on_busy_message}
                      onChangeText={(text) =>
                        setSettings((prev) => ({ ...prev, callback_on_busy_message: text }))
                      }
                      placeholder={DEFAULT_MESSAGES.busy}
                      onFocus={() => setFocusedInput('busy')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  )}
                </View>
              </View>
            )}

            {/* 명함 이미지 설정 */}
            {settings.auto_callback_enabled && (
              <View style={styles.section}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.sectionTitle}>명함 이미지 첨부</Text>
                    <Text style={styles.sectionDescription}>
                      문자에 명함 이미지를 첨부하여 MMS로 발송합니다.
                    </Text>
                  </View>
                  <Switch
                    value={settings.business_card_enabled}
                    onValueChange={(value) =>
                      setSettings((prev) => ({ ...prev, business_card_enabled: value }))
                    }
                    trackColor={{ false: '#D1D5DB', true: '#8B5CF6' }}
                    thumbColor="#fff"
                  />
                </View>
                {settings.business_card_enabled && (
                  <View style={styles.imageUploadSection}>
                    {settings.business_card_image_url ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image
                          source={{ uri: settings.business_card_image_url }}
                          style={styles.imagePreview}
                          resizeMode="contain"
                        />
                        <View style={styles.imageButtons}>
                          <TouchableOpacity
                            style={styles.changeImageButton}
                            onPress={pickAndUploadImage}
                            disabled={uploadingImage}
                          >
                            <Text style={styles.changeImageButtonText}>변경</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={removeImage}
                            disabled={uploadingImage}
                          >
                            <Text style={styles.removeImageButtonText}>삭제</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={pickAndUploadImage}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? (
                          <ActivityIndicator color="#8B5CF6" />
                        ) : (
                          <>
                            <Text style={styles.uploadButtonIcon}>+</Text>
                            <Text style={styles.uploadButtonText}>명함 이미지 업로드</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* 카테고리별 발송 설정 */}
            {settings.auto_callback_enabled && groups.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>카테고리별 발송 설정</Text>
                <Text style={styles.sectionDescription}>
                  각 그룹별로 콜백 발송 여부를 설정할 수 있습니다.
                </Text>

                {groups.map((group) => {
                  const groupName = group.name.toLowerCase();
                  const isFamilyOrFriend =
                    groupName.includes('가족') ||
                    groupName.includes('친구') ||
                    groupName.includes('family') ||
                    groupName.includes('friend');

                  return (
                    <View key={group.id} style={styles.categoryCard}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryName}>{group.name}</Text>
                        {isFamilyOrFriend && (
                          <Text style={styles.categoryHint}>
                            (가족/친구는 기본적으로 발송하지 않습니다)
                          </Text>
                        )}
                      </View>

                      <View style={styles.categoryControls}>
                        <View style={styles.switchRow}>
                          <Text style={styles.switchLabelText}>발송</Text>
                          <Switch
                            value={categorySettings[group.id]?.enabled ?? !isFamilyOrFriend}
                            onValueChange={() => toggleCategoryEnabled(group.id)}
                            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                            thumbColor="#fff"
                          />
                        </View>

                        {categorySettings[group.id]?.enabled && !isFamilyOrFriend && (
                          <View style={styles.switchRow}>
                            <Text style={styles.switchLabelText}>AI 맞춤 발송</Text>
                            <Switch
                              value={categorySettings[group.id]?.useAI ?? false}
                              onValueChange={() => toggleCategoryAI(group.id)}
                              trackColor={{ false: '#D1D5DB', true: '#8B5CF6' }}
                              thumbColor="#fff"
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* 저장 버튼 */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={saveSettings}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>저장</Text>
              )}
            </TouchableOpacity>

            {/* 취소 버튼 */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>

            {/* 키보드를 위한 여백 */}
            <View style={styles.keyboardSpacer} />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  section: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchLabelText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  optionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionHeader: {
    marginBottom: 12,
  },
  optionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  optionBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  optionInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imageUploadHint: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  hintText: {
    fontSize: 13,
    color: '#4F46E5',
  },
  imageUploadSection: {
    marginTop: 12,
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  imageButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  changeImageButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  changeImageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  removeImageButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  removeImageButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  uploadButtonIcon: {
    fontSize: 32,
    color: '#8B5CF6',
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryHeader: {
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  categoryHint: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  categoryControls: {
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardSpacer: {
    height: 100,
  },
});



