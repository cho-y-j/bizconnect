# Android 프로젝트 설정 가이드

## 현재 상태
- React Native 프로젝트가 완전히 초기화되지 않았을 수 있습니다
- `android/` 폴더가 없으면 React Native CLI로 프로젝트를 초기화해야 합니다

## 해결 방법

### 옵션 1: 기존 프로젝트에 android 폴더 추가
```bash
cd mobile
npx react-native init BizConnectMobile --template react-native-template-typescript --skip-install
# 그 다음 기존 App.tsx와 package.json을 복사
```

### 옵션 2: 수동으로 android 폴더 생성
Android Studio에서 새 프로젝트를 만들거나, React Native CLI를 사용합니다.

## 필요한 Android 권한 (AndroidManifest.xml)

다음 권한들이 필요합니다:

```xml
<uses-permission android:name="android.permission.SEND_SMS" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.READ_CALL_LOG" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
```

## 다음 단계
1. Android 프로젝트 초기화 확인
2. AndroidManifest.xml에 권한 추가
3. 네이티브 모듈 링크 확인




