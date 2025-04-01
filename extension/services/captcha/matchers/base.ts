import { CaptchaType } from '@/types';

/**
 * 匹配结果接口
 */
export interface MatchResult {
  type: CaptchaType | null;
  score: number;
  details: MatchDetail[];
  passed: boolean;
}

/**
 * 匹配细节
 */
export interface MatchDetail {
  score: number;
  reason: string;
}

/**
 * 验证码匹配器接口
 */
export interface CaptchaMatcher {
  /**
   * 获取匹配器处理的验证码类型
   */
  getCaptchaType(): CaptchaType;
  
  /**
   * 匹配元素并返回匹配结果
   */
  match(element: HTMLElement): MatchResult;
  
  /**
   * 设置匹配阈值
   */
  setThreshold(threshold: number): void;
}

/**
 * 抽象验证码匹配器基类
 */
export abstract class BaseCaptchaMatcher implements CaptchaMatcher {
  protected threshold: number = 0.7;
  
  /**
   * 获取匹配器处理的验证码类型
   */
  abstract getCaptchaType(): CaptchaType;
  
  /**
   * 匹配元素并返回匹配结果
   */
  abstract match(element: HTMLElement): MatchResult;
  
  /**
   * 设置匹配阈值
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }
  
  /**
   * 根据详情计算最终得分
   */
  protected calculateFinalScore(result: MatchResult): MatchResult {
    // 计算总分
    let totalScore = 0;
    for (const detail of result.details) {
      totalScore += detail.score;
    }
    
    // 归一化到0-1范围
    result.score = Math.min(1, Math.max(0, totalScore / 100));
    
    // 判断是否通过阈值
    result.passed = result.score >= this.threshold;
    
    return result;
  }
  
  /**
   * 提取元素属性，辅助匹配器使用
   */
  protected getElementAttributes(element: HTMLElement): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }
    
    return attributes;
  }
} 