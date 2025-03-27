// API接口类型定义

// 用户相关接口
export interface UserLoginRequest {
  username: string;
  password: string;
}

export interface UserRegisterRequest {
  username: string;
  password: string;
  email: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  token: string;
  usageCount: number;
  isAdmin: boolean;
}

// 验证码信息集合
export interface CaptchaInfoSet {
  id?: string;
  websiteUrl: string;
  websiteDomain: string;
  captchaType: CaptchaType;
  captchaSelector: string;
  captchaAttributes: Record<string, string>;
  captchaDimensions: {
    width: number;
    height: number;
  };
  relatedElements: RelatedElement[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  status: CaptchaInfoSetStatus;
  verificationScore?: number;
}

export enum CaptchaType {
  TEXT = 'text',
  SLIDER = 'slider',
  CLICK = 'click',
  ROTATE = 'rotate'
}

export interface RelatedElement {
  type: RelatedElementType;
  selector: string;
  attributes: Record<string, string>;
  required: boolean;
}

export enum RelatedElementType {
  INPUT_FIELD = 'input_field',
  REFRESH_BUTTON = 'refresh_button',
  SUBMIT_BUTTON = 'submit_button'
}

export enum CaptchaInfoSetStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived'
}

// 验证码识别相关接口
export interface CaptchaRecognizeRequest {
  websiteUrl: string;
  captchaImage: string; // base64编码
  captchaType: CaptchaType;
}

export interface CaptchaRecognizeResponse {
  result: string;
  confidence: number;
  processingTime: number;
}

// 验证码信息集合相关接口
export interface GetCaptchaInfoSetRequest {
  websiteUrl: string;
}

export interface GetCaptchaInfoSetResponse {
  infoSet: CaptchaInfoSet | null;
}

export interface UploadCaptchaInfoSetRequest {
  infoSet: CaptchaInfoSet;
}

export interface UploadCaptchaInfoSetResponse {
  id: string;
  status: CaptchaInfoSetStatus;
}

// 特征校验相关
export interface FeatureVerificationResult {
  score: number;
  details: {
    feature: string;
    score: number;
    description: string;
  }[];
  passed: boolean;
}

// 错误响应
export interface ErrorResponse {
  code: number;
  message: string;
  details?: Record<string, any>;
}

// API路径
export const API_PATHS = {
  // 用户相关
  LOGIN: '/api/user/login',
  REGISTER: '/api/user/register',
  USER_INFO: '/api/user/info',
  
  // 验证码识别相关
  RECOGNIZE: '/api/captcha/recognize',
  
  // 验证码信息集合相关
  GET_INFO_SET: '/api/captcha/infoset',
  UPLOAD_INFO_SET: '/api/captcha/infoset/upload',
  VERIFY_INFO_SET: '/api/captcha/infoset/verify',
  
  // 统计与反馈
  FEEDBACK: '/api/feedback',
  STATS: '/api/stats'
} 