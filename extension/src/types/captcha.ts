/**
 * 验证码类型枚举
 */
export enum CaptchaType {
  CHARACTER = 'character',
  SLIDER = 'slider',
  CLICK = 'click',
  SELECT = 'select',
  CUSTOM = 'custom',
}

/**
 * 验证码定位匹配度信息
 */
export interface CaptchaMatchInfo {
  selector: string;
  score: number;
  captchaType: CaptchaType;
  relatedElements: RelatedElement[];
  metadata?: Record<string, any>;
}

/**
 * 关联元素类型
 */
export interface RelatedElement {
  selector: string;
  type: 'input' | 'button' | 'slider' | 'custom' | 'hover';
  action?: 'fill' | 'click' | 'drag' | 'hover' | 'custom';
  customAction?: string;
  delay?: number;
  metadata?: Record<string, any>;
}

/**
 * 验证码记录接口
 */
export interface CaptchaRecord {
  id?: string;
  url: string;
  domain: string;
  path?: string;
  selector: string;
  captchaType: CaptchaType;
  relatedElements: RelatedElement[];
  imageData?: string;
  result?: string;
  lastUpdated: string;
  createdAt: string;
  successCount: number;
  errorCount: number;
  extraData?: Record<string, any>;
}

/**
 * 验证码识别结果
 */
export interface CaptchaResult {
  text: string;
  confidence: number;
  error?: string;
  duration?: number;
  extraData?: Record<string, any>;
}

/**
 * 验证码识别请求
 */
export interface CaptchaRecognitionRequest {
  recordId?: string;
  url: string;
  captchaType: CaptchaType;
  imageData: string;
  extra?: Record<string, any>;
}

/**
 * 验证码匹配链接口
 */
export interface CaptchaMatcherChain {
  type: CaptchaType;
  match(element: Element): CaptchaMatchInfo;
} 