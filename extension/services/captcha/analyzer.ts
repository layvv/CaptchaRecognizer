import { CaptchaType } from '@/types';
import { MatchResult } from './matchers/base';
import { matcherRegistry } from './matchers';
import { loggerService } from '@/services/logger';

// 类型到显示名称的映射
const captchaTypeNames: Record<string, string> = {
  'char': '字符型验证码',
  'slider': '滑块验证码',
  'click': '点选验证码',
  'rotate': '旋转验证码',
  'puzzle': '拼图验证码',
  'custom': '自定义验证码'
};

/**
 * 验证码分析器
 * 使用各种匹配器评估元素是否为验证码
 */
export class CaptchaAnalyzer {
  /**
   * 分析元素，检查是否匹配任何已知的验证码类型
   * 返回最佳匹配结果
   */
  analyzeElement(element: HTMLElement): MatchResult | null {
    try {
      loggerService.debug('开始分析元素', { 
        tagName: element.tagName.toLowerCase() 
      });
      
      // 获取所有匹配器
      const matchers = matcherRegistry.getAllMatchers();
      
      if (matchers.length === 0) {
        loggerService.warn('没有可用的验证码匹配器');
        return null;
      }
      
      // 使用所有匹配器评估元素
      let bestMatch: MatchResult | null = null;
      
      for (const matcher of matchers) {
        const result = matcher.match(element);
        
        loggerService.debug('匹配器评估结果', {
          type: result.type ? captchaTypeNames[result.type] : '未知',
          score: result.score,
          passed: result.passed
        });
        
        // 如果当前结果通过测试且分数更高，则更新最佳匹配
        if (result.passed && (!bestMatch || result.score > bestMatch.score)) {
          bestMatch = result;
        }
      }
      
      if (bestMatch) {
        loggerService.info('找到最佳匹配', {
          type: bestMatch.type ? captchaTypeNames[bestMatch.type] : '未知',
          score: bestMatch.score
        });
      } else {
        loggerService.info('未找到符合条件的验证码匹配');
      }
      
      return bestMatch;
    } catch (error) {
      loggerService.error('验证码分析过程出错', error);
      return null;
    }
  }
} 