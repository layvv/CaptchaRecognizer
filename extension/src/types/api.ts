import { CaptchaRecord, CaptchaRecognitionRequest } from './captcha';

/**
 * API 通用类型定义
 */

// 反馈类型枚举
export enum FeedbackType {
  BUG = 'bug',
  FEATURE = 'feature',
  SUGGESTION = 'suggestion',
  OTHER = 'other'
}

// API 响应基础接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
}

// API 请求配置接口
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers?: Record<string, string>;
}

// API 错误接口
export interface ApiError {
  code: string | number;
  message: string;
  details?: any;
}

// API 分页请求参数
export interface PaginationParams {
  page: number;
  pageSize: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// API 分页响应数据
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// HTTP 请求方法
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * API路径常量
 */
export const API_PATHS = {
  // 验证码API
  CAPTCHA: {
    // 获取验证码记录
    GET_RECORD: '/captcha/record',
    // 保存验证码记录
    SAVE_RECORD: '/captcha/record',
    // 识别验证码
    RECOGNIZE: '/captcha/recognize',
    // 报告识别结果
    REPORT_RESULT: '/captcha/report',
  },
  // 反馈API
  FEEDBACK: {
    // 提交反馈
    SUBMIT: '/feedback/submit',
  },
  // 状态API
  STATUS: {
    // 获取服务状态
    CHECK: '/status',
  }
};

/**
 * 验证码识别结果
 */
export interface CaptchaRecognitionResult {
  // 识别出的文本
  text: string;
  // 识别的置信度, 0-1
  confidence: number;
  // 识别结果详情
  details?: any;
}

/**
 * 验证码API接口
 */
export interface CaptchaApi {
  /**
   * 获取指定URL的验证码记录
   */
  getRecordByUrl(url: string): Promise<ApiResponse<CaptchaRecord | null>>;
  
  /**
   * 创建或更新验证码记录
   */
  saveRecord(record: CaptchaRecord): Promise<ApiResponse<CaptchaRecord>>;
  
  /**
   * 识别验证码
   */
  recognizeCaptcha(request: CaptchaRecognitionRequest): Promise<ApiResponse<CaptchaRecognitionResult>>;
  
  /**
   * 报告验证码识别结果（成功/失败）
   */
  reportResult(recordId: string, success: boolean, details?: any): Promise<ApiResponse<void>>;
}

/**
 * 用户反馈API接口
 */
export interface FeedbackApi {
  /**
   * 提交用户反馈
   */
  submitFeedback(type: string, content: string, metadata: Record<string, any>): Promise<ApiResponse<void>>;
} 