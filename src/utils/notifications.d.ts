export declare function isNotificationSupported(): boolean;
export declare function getNotificationPermission(): NotificationPermission;
export declare function requestNotificationPermission(): Promise<NotificationPermission>;
export declare function initializeReminders(settings: object): Promise<unknown[]>;
