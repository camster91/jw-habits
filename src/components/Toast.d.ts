export declare function useToast(): {
  success: (msg: string, duration?: number) => void;
  error: (msg: string, duration?: number) => void;
  info: (msg: string, duration?: number) => void;
  warning: (msg: string, duration?: number) => void;
};

export declare function ToastProvider(props: { children: any }): any;
