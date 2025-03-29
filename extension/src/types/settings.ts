/**
 * 应用设置类型定义
 */

/**
 * 主题类型
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * 应用设置接口
 */
export interface AppSettings {
  /**
   * 是否启用扩展功能
   */
  enabled: boolean;
  
  /**
   * 是否自动解决验证码
   */
  autoSolve: boolean;
  
  /**
   * 是否高亮显示验证码
   */
  highlightCaptcha: boolean;
  
  /**
   * 是否使用本地缓存
   */
  useLocalCache: boolean;
  
  /**
   * API服务器地址
   */
  apiUrl: string;
  
  /**
   * API请求超时时间（毫秒）
   */
  apiTimeout: number;
  
  /**
   * 是否开启调试模式
   */
  debugMode: boolean;
  
  /**
   * 最大错误次数
   */
  maxErrorCount: number;
  
  /**
   * 界面主题
   */
  theme: Theme;
}

// 默认设置值
export const DEFAULT_SETTINGS: AppSettings = {
  enabled: true,
  autoSolve: true,
  highlightCaptcha: true,
  useLocalCache: true,
  apiUrl: 'http://localhost:8000/api',
  apiTimeout: 10000,
  debugMode: false,
  maxErrorCount: 3,
  theme: 'light'
}; 