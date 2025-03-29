/**
 * 集中导出所有类型定义
 */

// 导出验证码类型
export * from './captcha';

// 导出API类型
export * from './api';

// 导出设置类型
export * from './settings';

/**
 * 消息类型枚举
 */
export enum MessageType {
  // 初始化和基本消息
  INITIALIZE = 'initialize',
  
  // 验证码相关
  GET_CAPTCHA_RECORD = 'get_captcha_record',
  SAVE_CAPTCHA_RECORD = 'save_captcha_record',
  RECOGNIZE_CAPTCHA = 'recognize_captcha',
  REPORT_RESULT = 'report_result',
  SELECT_CAPTCHA = 'select_captcha',
  PROCESS_CAPTCHA = 'process_captcha',
  
  // 设置相关
  GET_SETTINGS = 'get_settings',
  SAVE_SETTINGS = 'save_settings',
  UPDATE_SETTINGS = 'update_settings',
  
  // UI相关
  SET_HIGHLIGHTING = 'set_highlighting',
  OPEN_CAPTCHA_SELECTOR = 'open_captcha_selector',
  CAPTCHA_SELECTED = 'captcha_selected',
  
  // 调试相关
  LOG_DEBUG = 'log_debug',
  LOG_ERROR = 'log_error'
}

/**
 * 消息接口
 */
export interface Message<T = any> {
  type: MessageType;
  data?: T;
  tabId?: number;
  frameId?: number;
  error?: string;
}

/**
 * 存储键枚举
 */
export enum StorageKey {
  SETTINGS = 'settings',
  CAPTCHA_RECORDS = 'captcha_records',
  LAST_UPDATED = 'last_updated',
  ERROR_LOGS = 'error_logs',
  DEBUG_LOGS = 'debug_logs'
} 