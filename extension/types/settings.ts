export interface Settings {
  enabled: boolean;
  autoRecognize: boolean;
  maxRetry: number;
  highlightElement: boolean;
  theme: 'light' | 'dark' | 'system';
  enableLog: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

