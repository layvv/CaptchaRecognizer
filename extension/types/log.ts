// 日志相关类型定义

// 日志级别
export enum LogLevel {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  DEBUG = 'debug'
}

// 日志上下文类型
export enum LogContextType {
  API = 'api',
  CAPTCHA = 'captcha',
  RECOGNITION = 'recognition',
  USER = 'user',
  SYSTEM = 'system'
}

// 日志条目
export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
}

// 日志上下文
export interface LogContext {
  type: LogContextType;
  data: Record<string, any>;
  // 对日志进行分组和筛选的标识符
  tags?: string[];
  // 请求链路ID，用于关联相关请求
  traceId?: string;
}

// API请求日志上下文
export interface ApiLogContext extends LogContext {
  type: LogContextType.API;
  data: {
    url: string;
    method: string;
    requestData?: any;
    responseData?: any;
    statusCode?: number;
    error?: any;
    duration?: number;
  };
}

// 验证码识别日志上下文
export interface RecognitionLogContext extends LogContext {
  type: LogContextType.RECOGNITION;
  data: {
    websiteUrl: string;
    result?: string;
    confidence?: number;
    processingTime?: number;
    error?: any;
    imageHash?: string;
  };
}

// 验证码操作日志上下文
export interface CaptchaLogContext extends LogContext {
  type: LogContextType.CAPTCHA;
  data: {
    websiteUrl: string;
    captchaSelector?: string;
    captchaType?: string;
    action: 'locate' | 'verify' | 'refresh' | 'autofill';
    success: boolean;
    details?: any;
  };
}

// 用户操作日志上下文
export interface UserLogContext extends LogContext {
  type: LogContextType.USER;
  data: {
    userId?: string;
    username?: string;
    action: 'login' | 'register' | 'logout' | 'settings';
    success: boolean;
    details?: any;
  };
}

// 系统日志上下文
export interface SystemLogContext extends LogContext {
  type: LogContextType.SYSTEM;
  data: {
    component: string;
    action: string;
    details?: any;
  };
} 