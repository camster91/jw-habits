export declare function summarizeDailyText(
  text: string,
  ai: { modelUrl: string; apiKey: string }
): Promise<string>;

export declare function summarizeDailyTextViaOllama(
  text: string,
  endpoint: string
): Promise<string>;

export declare function chatWithOllama(
  message: string,
  config: { modelUrl?: string; apiKey?: string }
): Promise<string>;
