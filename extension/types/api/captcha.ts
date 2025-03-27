// 验证码相关API接口定义

// 验证码类型
export enum CaptchaType {
  TEXT = 'text',
  SLIDER = 'slider',
  CLICK = 'click',
  ROTATE = 'rotate'
}

// 相关元素类型
export enum RelatedElementType {
  INPUT_FIELD = 'input_field',
  REFRESH_BUTTON = 'refresh_button',
  SUBMIT_BUTTON = 'submit_button'
}

// 验证码信息集合状态
export enum CaptchaInfoSetStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived'
}

// 相关元素
export type RelatedElement = {
  type: RelatedElementType;
  selector: string;
  attributes: Record<string, string>;
  required: boolean;
};

// 验证码信息集合
export type CaptchaInfoSet = {
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
};

// 验证码识别请求
export type RecognizeRequest = {
  websiteUrl: string;
  captchaImage: string; // base64编码
  captchaType: CaptchaType;
};

// 验证码识别响应
export type RecognizeResponse = {
  result: string;
  confidence: number;
  processingTime: number;
};

// 获取验证码信息集合
export type GetInfoSetRequest = {
  websiteUrl: string;
};

export type GetInfoSetResponse = {
  infoSet: CaptchaInfoSet | null;
};

// 上传验证码信息集合
export type UploadInfoSetRequest = {
  infoSet: CaptchaInfoSet;
};

export type UploadInfoSetResponse = {
  id: string;
  status: CaptchaInfoSetStatus;
};

// 特征校验结果
export type FeatureVerificationResult = {
  score: number;
  details: {
    feature: string;
    score: number;
    description: string;
  }[];
  passed: boolean;
};

// 验证码API路径
export const CAPTCHA_API_PATHS = {
  RECOGNIZE: '/api/captcha/recognize',
  GET_INFO_SET: '/api/captcha/infoset',
  UPLOAD_INFO_SET: '/api/captcha/infoset/upload',
  VERIFY_INFO_SET: '/api/captcha/infoset/verify'
}; 