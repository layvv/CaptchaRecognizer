import { FeatureType } from './enums';

/**
 * 特征评分系统
 */
export interface FeatureScore {
  total: number;                // 总分
  details: FeatureDetail[];     // 详细评分
  passed: boolean;              // 是否通过
}

/**
 * 特征评分详情
 */
export interface FeatureDetail {
  type: FeatureType;            // 特征类型
  name: string;                 // 特征名称
  score: number;                // 得分
  maxScore: number;             // 最高分
  description: string;          // 描述
  passed: boolean;              // 是否通过
}

/**
 * 特征规则
 */
export interface FeatureRule {
  type: FeatureType;            // 特征类型
  name: string;                 // 规则名称
  description: string;          // 描述
  maxScore: number;             // 最高分
  minScore: number;             // 通过阈值
  test: (element: Element, context?: any) => number; // 测试函数
}

/**
 * 特征规则集
 */
export interface FeatureRuleSet {
  name: string;                 // 规则集名称
  description: string;          // 描述
  rules: FeatureRule[];         // 规则列表
  requiredScore: number;        // 通过所需总分
  maxScore: number;             // 最高总分
}

/**
 * 属性关键词匹配配置
 */
export interface AttributeKeywordConfig {
  attribute: string;           // 属性名
  keywords: string[];          // 关键词列表
  weight: number;              // 权重
  caseSensitive?: boolean;     // 是否区分大小写
  exactMatch?: boolean;        // 是否精确匹配
}

/**
 * 验证码尺寸规则配置
 */
export interface DimensionRuleConfig {
  minWidth: number;            // 最小宽度
  maxWidth: number;            // 最大宽度
  minHeight: number;           // 最小高度
  maxHeight: number;           // 最大高度
  idealRatio?: number;         // 理想宽高比
  ratioTolerance?: number;     // 宽高比容差
} 