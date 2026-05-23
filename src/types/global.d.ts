/* eslint-disable */
// Global declarations for JavaScript modules imported into TypeScript files
// These are thin `.d.ts` wrappers so TS stops complaining about missing declarations
// for `.js` files we haven't migrated to .ts yet.

declare module '../utils/native.js' {
  export const haptics: { light: () => void; success: () => void; error: () => void };
}

declare module '../../utils/native.js' {
  export const haptics: { light: () => void; success: () => void; error: () => void };
}

declare module '../utils/jwLibraryLinks.js' {
  export function getDailyTextUrl(dateStr: string): string;
  export function getJWBibliothekUrl(dateStr: string): string;
}

declare module '../utils/ollama.js' {
  export function summarizeDailyText(text: string, ai: { modelUrl: string; apiKey: string }): Promise<string>;
  export function summarizeDailyTextViaOllama(text: string, endpoint: string): Promise<string>;
}

declare module '../utils/storageErrorHandler.js' {
  export function withStorageErrorHandler<T>(fn: () => T, fallback: T): T;
}

declare module '../utils/notifications.js' {
  export function isNotificationSupported(): boolean;
  export function getNotificationPermission(): NotificationPermission;
  export function requestNotificationPermission(): Promise<NotificationPermission>;
  export function initializeReminders(): void;
}

declare module '../components/Toast.jsx' {
  export function useToast(): {
    addToast: (message: string, type?: string, duration?: number) => void;
    success: (msg: string, duration?: number) => void;
    error: (msg: string, duration?: number) => void;
    info: (msg: string, duration?: number) => void;
  };
  export function ToastProvider(props: { children: React.ReactNode }): JSX.Element;
}

declare module '../../components/Toast.jsx' {
  export function useToast(): {
    addToast: (message: string, type?: string, duration?: number) => void;
    success: (msg: string, duration?: number) => void;
    error: (msg: string, duration?: number) => void;
    info: (msg: string, duration?: number) => void;
  };
}

declare module '../components/PageHeader.jsx' {
  const PageHeader: React.FC<{ title: string; subtitle?: string; gradient?: string; shadow?: boolean; noBlurs?: boolean; icon?: any }>;
  export default PageHeader;
}

declare module '../hooks/useDrawer.js' {
  export function useDrawer(): { toggle: () => void; close: () => void };
}

declare module '../components/settings/NotificationItems.js' {
  export interface NotificationItemProps {
    icon: any;
    label: string;
    enabled: boolean;
    time?: string;
    description?: string;
    onToggle: () => void;
    onTimeChange: (time: string) => void;
    color?: string;
  }
  export function NotificationItem(props: NotificationItemProps): JSX.Element;
  export function WeeklyNotificationItem(props: NotificationItemProps & { day?: string }): JSX.Element;
}

declare module '../stores/settingsStore.js' {
  export { type Notifications } from '../stores/settingsStore';
}

declare module './MeetingCard.jsx' {
  const MeetingCard: React.FC<any>;
  export default MeetingCard;
}
declare module './PrayerTrackingCard.jsx' {
  const PrayerTrackingCard: React.FC<any>;
  export default PrayerTrackingCard;
}
