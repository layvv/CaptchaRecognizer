/**
 * 验证码类型枚举
 */
export enum CaptchaType {
  CHAR = 'char', // 字符型验证码
  SLIDER = 'slider', // 滑块验证码
  CLICK = 'click', // 点选验证码
  ROTATE = 'rotate', // 旋转验证码
  PUZZLE = 'puzzle', // 拼图验证码
  CUSTOM = 'custom', // 自定义验证码
}


/**
 * 关联元素接口
 */
export interface RelatedElement {
  type: 'input' | 'button' | 'slider' | 'div' | 'span' | 'other'; // 元素类型
  selector: string; // CSS选择器
  attributes?: Record<string, string>; // 元素属性
}

/**
 * 基础验证码记录接口
 */
export interface BaseCaptchaRecord {
  id?: string; // 记录ID，由服务器生成
  url: string; // 网站URL，可以是精确匹配或模式匹配
  urlPattern: 'exact' | 'domain' | 'regex'; // URL匹配模式
  selector: string; // 验证码元素CSS选择器
  type: CaptchaType; // 验证码类型
  relatedElements: RelatedElement[]; // 关联元素
  active: boolean; // 是否启用
  creatorId?: number | string; // 创建者
  createTime?: number; // 创建时间
  updateTime?: number; // 更新时间
  successRate?: number; // 成功率
  usedCount?: number; // 使用次数
  extra?: Record<string, any>; // 额外信息
}

/**
 * 字符型验证码记录接口
 */
export interface CharacterCaptchaRecord extends BaseCaptchaRecord {
  type: CaptchaType.CHAR;
  length?: number; // 验证码长度，可能为固定值或范围
  charset?: 'numeric' | 'alpha' | 'alphanumeric' | 'custom'; // 字符集
  case?: 'upper' | 'lower' | 'mixed'; // 大小写
}

/**
 * 滑块验证码记录接口
 */
export interface SliderCaptchaRecord extends BaseCaptchaRecord {
  type: CaptchaType.SLIDER;
}


/**
 * 验证码记录类型
 */
export type CaptchaRecord = CharacterCaptchaRecord | SliderCaptchaRecord;


export interface CaptchaRecognizeRequest {
  captchaId?: string; // 验证码记录ID
  type: CaptchaType; // 验证码类型
  image: string; // Base64编码的图片
  extra?: Record<string, any>; // 额外信息
}

export interface CaptchaRecognizeResponse {
  success: boolean; // 是否成功
  result?: string; // 识别结果
  confidence?: number; // 置信度
  error?: string; // 错误信息
}