export declare const haptics: {
  light: () => void;
  success: () => void;
  error: () => void;
};

export declare const statusBar: {
  setBackground: (color: string) => void;
};

export declare const keyboard: {
  show: () => void;
  hide: () => void;
};

export declare const splash: {
  hide: () => void;
};

export declare const isNative: () => boolean;
export declare const isAndroid: () => boolean;
export declare const isIOS: () => boolean;

export declare function showAlert(title: string, message?: string): void;
export declare function showConfirm(title: string, message?: string): Promise<boolean>;
