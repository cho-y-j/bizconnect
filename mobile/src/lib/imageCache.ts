import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { supabase } from '../../lib/supabaseClient';

/**
 * 이미지 캐시 관리 유틸리티
 * 웹에서 업로드한 이미지를 로컬에 다운로드하여 캐시
 */

const CACHE_DIR = Platform.OS === 'android' 
  ? `${RNFS.CachesDirectoryPath}/images`
  : `${RNFS.DocumentDirectoryPath}/images`;

/**
 * 캐시 디렉토리 초기화
 */
async function ensureCacheDir(): Promise<void> {
  const dirExists = await RNFS.exists(CACHE_DIR);
  if (!dirExists) {
    await RNFS.mkdir(CACHE_DIR);
  }
}

/**
 * URL에서 파일명 생성 (해시 기반)
 */
function getFileNameFromUrl(url: string): string {
  // URL에서 파일 확장자 추출
  const urlParts = url.split('/');
  const lastPart = urlParts[urlParts.length - 1];
  const extension = lastPart.includes('.') 
    ? lastPart.split('.').pop()?.split('?')[0] || 'jpg'
    : 'jpg';
  
  // URL 해시 생성 (간단한 해시)
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `img_${Math.abs(hash)}.${extension}`;
}

/**
 * 이미지 다운로드 및 캐시
 * @param url 이미지 URL (HTTP/HTTPS)
 * @returns 로컬 파일 경로
 */
export async function downloadImage(url: string): Promise<string> {
  try {
    console.log('📥 Downloading image from URL:', url);
    
    // 캐시 디렉토리 확인
    await ensureCacheDir();
    
    // 파일명 생성
    const fileName = getFileNameFromUrl(url);
    const localPath = `${CACHE_DIR}/${fileName}`;
    
    // 이미 캐시된 파일이 있으면 반환
    const fileExists = await RNFS.exists(localPath);
    if (fileExists) {
      console.log('✅ Image already cached:', localPath);
      return localPath;
    }
    
    // Supabase Storage URL인 경우 인증 토큰 추가
    let downloadUrl = url;
    if (url.includes('supabase.co')) {
      // Supabase Storage는 공개 URL이면 그대로 사용
      // 비공개인 경우 세션 토큰이 필요할 수 있음
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !url.includes('?')) {
        // URL에 토큰 추가 (필요한 경우)
        downloadUrl = `${url}?token=${session.access_token}`;
      }
    }
    
    // 이미지 다운로드
    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: localPath,
      background: false,
      discretionary: false,
      cacheable: true,
    }).promise;
    
    if (downloadResult.statusCode === 200) {
      console.log('✅ Image downloaded successfully:', localPath);
      return localPath;
    } else {
      throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
    }
  } catch (error: any) {
    console.error('❌ Error downloading image:', error);
    throw new Error(`이미지 다운로드 실패: ${error.message || '알 수 없는 오류'}`);
  }
}

/**
 * 캐시된 이미지 경로 확인
 * @param url 이미지 URL
 * @returns 로컬 파일 경로 또는 null
 */
export async function getCachedImagePath(url: string): Promise<string | null> {
  try {
    await ensureCacheDir();
    const fileName = getFileNameFromUrl(url);
    const localPath = `${CACHE_DIR}/${fileName}`;
    
    const fileExists = await RNFS.exists(localPath);
    return fileExists ? localPath : null;
  } catch (error) {
    console.error('Error checking cached image:', error);
    return null;
  }
}

/**
 * 캐시 정리 (오래된 파일 삭제)
 * @param maxAgeMs 최대 보관 시간 (밀리초), 기본 7일
 */
export async function clearCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    await ensureCacheDir();
    const files = await RNFS.readdir(CACHE_DIR);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = `${CACHE_DIR}/${file}`;
      const stat = await RNFS.stat(filePath);
      
      if (now - stat.mtime > maxAgeMs) {
        await RNFS.unlink(filePath);
        console.log('🗑️ Deleted old cached image:', file);
      }
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * 특정 URL의 캐시 삭제
 */
export async function removeCachedImage(url: string): Promise<void> {
  try {
    const cachedPath = await getCachedImagePath(url);
    if (cachedPath) {
      await RNFS.unlink(cachedPath);
      console.log('🗑️ Removed cached image:', cachedPath);
    }
  } catch (error) {
    console.error('Error removing cached image:', error);
  }
}










