import { Platform, PermissionsAndroid, Alert } from 'react-native';

/**
 * 필요한 모든 권한 목록
 */
export const REQUIRED_PERMISSIONS = [
  PermissionsAndroid.PERMISSIONS.SEND_SMS,
  PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
  PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
  PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
];

/**
 * 권한 확인
 */
export async function checkPermission(permission: string): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const granted = await PermissionsAndroid.check(permission);
    return granted;
  } catch (error) {
    console.error(`Error checking permission ${permission}:`, error);
    return false;
  }
}

/**
 * 단일 권한 요청
 */
export async function requestPermission(
  permission: string,
  title: string,
  message: string
): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const granted = await PermissionsAndroid.request(permission, {
      title,
      message,
      buttonNeutral: '나중에',
      buttonNegative: '취소',
      buttonPositive: '허용',
    });

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error(`Error requesting permission ${permission}:`, error);
    return false;
  }
}

/**
 * 모든 필수 권한 요청
 */
export async function requestAllPermissions(): Promise<{
  granted: string[];
  denied: string[];
}> {
  if (Platform.OS !== 'android') {
    return { granted: [], denied: [] };
  }

  const granted: string[] = [];
  const denied: string[] = [];

  // 권한별 메시지
  const permissionMessages: { [key: string]: { title: string; message: string } } = {
    [PermissionsAndroid.PERMISSIONS.SEND_SMS]: {
      title: 'SMS 발송 권한',
      message: '문자 메시지를 발송하기 위해 권한이 필요합니다.',
    },
    [PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE]: {
      title: '전화 상태 권한',
      message: '통화 종료 후 자동으로 콜백 문자를 보내기 위해 전화 상태 접근 권한이 필요합니다.',
    },
    [PermissionsAndroid.PERMISSIONS.READ_CALL_LOG]: {
      title: '통화 기록 권한',
      message: '통화 기록을 확인하기 위해 권한이 필요합니다.',
    },
    [PermissionsAndroid.PERMISSIONS.READ_CONTACTS]: {
      title: '연락처 권한',
      message: '주소록을 업로드하고 고객 정보를 관리하기 위해 연락처 접근 권한이 필요합니다.',
    },
    [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]: {
      title: '알림 권한',
      message: '앱 알림을 받기 위해 권한이 필요합니다.',
    },
  };

  for (const permission of REQUIRED_PERMISSIONS) {
    try {
      // 이미 권한이 있는지 확인
      const hasPermission = await checkPermission(permission);
      if (hasPermission) {
        granted.push(permission);
        continue;
      }

      // 권한 요청
      const message = permissionMessages[permission];
      if (message) {
        const result = await requestPermission(permission, message.title, message.message);
        if (result) {
          granted.push(permission);
        } else {
          denied.push(permission);
        }
      }
    } catch (error) {
      console.error(`Error processing permission ${permission}:`, error);
      denied.push(permission);
    }
  }

  return { granted, denied };
}

/**
 * 권한 상태 확인 및 요청 (앱 시작 시)
 */
export async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    // 모든 권한 확인
    const allGranted = await Promise.all(
      REQUIRED_PERMISSIONS.map((permission) => checkPermission(permission))
    );

    // 모든 권한이 있으면 true 반환
    if (allGranted.every((granted) => granted)) {
      return true;
    }

    // 권한이 없으면 요청
    const { granted, denied } = await requestAllPermissions();

    if (denied.length > 0) {
      console.warn('Some permissions were denied:', denied);
      // 권한이 거부되었어도 앱은 계속 실행 (기능 제한)
      return false;
    }

    return granted.length > 0;
  } catch (error) {
    console.error('Error ensuring permissions:', error);
    // 에러가 발생해도 앱은 계속 실행
    return false;
  }
}














