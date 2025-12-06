import NetInfo from '@react-native-community/netinfo';

type NetworkChangeCallback = (isOnline: boolean) => void;

/**
 * 네트워크 상태 모니터
 */
class NetworkMonitor {
  private isOnline = true;
  private unsubscribe: (() => void) | null = null;
  private listeners: NetworkChangeCallback[] = [];

  /**
   * 네트워크 모니터링 시작
   */
  start(): void {
    // 초기 상태 확인
    NetInfo.fetch().then((state) => {
      this.isOnline = state.isConnected ?? false;
      this.notifyListeners();
    });

    // 상태 변경 구독
    this.unsubscribe = NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOnline !== this.isOnline) {
        this.notifyListeners();
        console.log('Network status changed:', this.isOnline ? 'online' : 'offline');
      }
    });
  }

  /**
   * 네트워크 모니터링 중지
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * 현재 온라인 상태 확인
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * 네트워크 상태 확인 (비동기)
   */
  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  /**
   * 리스너 추가
   */
  on(event: 'change', callback: NetworkChangeCallback): void {
    if (event === 'change') {
      this.listeners.push(callback);
    }
  }

  /**
   * 리스너 제거
   */
  removeListener(event: 'change', callback: NetworkChangeCallback): void {
    if (event === 'change') {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    }
  }

  /**
   * 모든 리스너에 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.isOnline));
  }
}

export const networkMonitor = new NetworkMonitor();

