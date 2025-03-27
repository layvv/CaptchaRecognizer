import { CaptchaType, RelatedElementType, CaptchaInfoSetStatus } from './enums';

/**
 * 验证码信息集合
 * 包含验证码的所有相关信息，用于定位和操作验证码
 */
export interface CaptchaInfoSet {
  // 基本信息
  id?: string;                     // 信息集ID，由服务器生成
  websiteUrl: string;              // 网站URL
  websiteDomain: string;           // 网站域名
  captchaType: CaptchaType;        // 验证码类型
  
  // 验证码元素信息
  captchaSelector: string;         // 验证码元素CSS选择器
  captchaAttributes: Record<string, string>; // 验证码元素属性(如id, name, class等)
  captchaDimensions: {             // 验证码尺寸
    width: number;
    height: number;
  };
  
  // 验证码元素特征得分
  featureScore?: {                 // 特征评分
    total: number;                 // 总分
    details: {                     // 详情
      attributeScore: number;      // 属性得分
      dimensionScore: number;      // 尺寸得分
      contextScore: number;        // 上下文得分
      keywordScore: number;        // 关键词得分
    }
  };
  
  // 相关元素
  relatedElements: RelatedElement[]; // 相关联的元素列表
  
  // 元数据
  createdBy?: string;              // 创建者
  createdAt?: string;              // 创建时间
  updatedAt?: string;              // 更新时间
  lastSuccessRate?: number;        // 最近识别成功率
  useCount?: number;               // 使用次数
  
  // 状态管理
  status: CaptchaInfoSetStatus;    // 信息集状态
  verificationScore?: number;      // 验证分数
  auditComment?: string;           // 审核评论
  
  // 截图数据
  screenshot?: string;             // 验证码区域截图(Base64)
}

/**
 * 相关元素
 * 例如输入框、刷新按钮、提交按钮等
 */
export interface RelatedElement {
  type: RelatedElementType;        // 元素类型
  selector: string;                // 元素选择器
  attributes: Record<string, string>; // 元素属性
  required: boolean;               // 是否必需
  value?: string;                  // 元素值(用于输入框)
  action?: 'click' | 'input' | 'focus'; // 操作类型
  description?: string;            // 描述
} 