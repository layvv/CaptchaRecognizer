import { CaptchaType } from '@/types';
import { BaseCaptchaMatcher, MatchResult } from './base';
import { loggerService } from '@/services/logger';

/**
 * 字符型验证码匹配器
 */
export class CharCaptchaMatcher extends BaseCaptchaMatcher {
  /**
   * 获取验证码类型
   */
  getCaptchaType(): CaptchaType {
    return CaptchaType.CHAR;
  }
  
  /**
   * 匹配元素
   */
  match(element: HTMLElement): MatchResult {
    const result: MatchResult = {
      type: this.getCaptchaType(),
      score: 0,
      details: [],
      passed: false
    };
    const details = result.details;
    
    // 1. 必须是图片元素
    if (element.tagName.toLowerCase() !== 'img') {
      details.push({
        score: 0,
        reason: '元素不是图片'
      });
      return this.calculateFinalScore(result);
    }
    
    details.push({
      score: 20,
      reason: '元素是图片'
    });
    
    // 2. 检查尺寸是否合适
    const rect = element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    if (!width || !height) {
      details.push({
        score: 0,
        reason: '无法获取图片尺寸'
      });
    } else if (width > 300 || height > 150) {
      details.push({
        score: 5,
        reason: '图片尺寸较大，可能不是验证码'
      });
    } else if (width < 30 || height < 10) {
      details.push({
        score: 0,
        reason: '图片尺寸过小'
      });
    } else {
      // 验证码图片通常是矩形，宽度约为高度的3-4倍
      const aspectRatio = width / height;
      let sizeScore = 15;
      
      if (aspectRatio > 2 && aspectRatio < 5) {
        sizeScore += 15;
        details.push({
          score: sizeScore,
          reason: `图片尺寸和比例适合验证码 (${Math.round(width)}x${Math.round(height)}, 比例: ${aspectRatio.toFixed(2)})`
        });
      } else {
        details.push({
          score: sizeScore,
          reason: `图片尺寸适中 (${Math.round(width)}x${Math.round(height)})`
        });
      }
    }
    
    // 3. 检查属性中是否包含关键字
    const attributeKeywords = [
      'captcha', 'verify', 'code', 'validation', 'security', 
      '验证码', '验证', '安全码', 'vcode', 'checkcode'
    ];
    let attributeScore = 0;
    let foundKeywords: string[] = [];
    
    const attributes = this.getElementAttributes(element);
    for (const [attr, value] of Object.entries(attributes)) {
      if (!value) continue;
      
      const lowerValue = value.toLowerCase();
      for (const keyword of attributeKeywords) {
        if (lowerValue.includes(keyword)) {
          attributeScore += 10;
          foundKeywords.push(`${attr}=${keyword}`);
          break;
        }
      }
    }
    
    if (attributeScore > 0) {
      details.push({
        score: Math.min(attributeScore, 30),
        reason: `属性包含验证码关键字: ${foundKeywords.join(', ')}`
      });
    }
    
    // 4. 检查是否有邻近的输入框
    const nearbyInput = this.hasNearbyInputField(element);
    if (nearbyInput.found) {
      details.push({
        score: 20,
        reason: nearbyInput.reason
      });
    }
    
    // 5. 检查是否有刷新按钮
    const refreshButton = this.hasRefreshButton(element);
    if (refreshButton.found) {
      details.push({
        score: 5,
        reason: refreshButton.reason
      });
    }
    
    return this.calculateFinalScore(result);
  }
  
  /**
   * 检查是否有邻近的输入框
   */
  private hasNearbyInputField(element: HTMLElement): { found: boolean; reason: string } {
    try {
      const nearbyInputs = document.querySelectorAll('input[type="text"]');
      const elementRect = element.getBoundingClientRect();
      
      for (const input of nearbyInputs) {
        const inputRect = input.getBoundingClientRect();
        
        // 检查输入框是否在图片附近
        const horizontalDistance = Math.abs(
          (inputRect.left + inputRect.width / 2) - 
          (elementRect.left + elementRect.width / 2)
        );
        
        const verticalDistance = Math.abs(
          (inputRect.top + inputRect.height / 2) - 
          (elementRect.top + elementRect.height / 2)
        );
        
        // 如果输入框在图片附近
        if (horizontalDistance < 150 && verticalDistance < 100) {
          return { 
            found: true, 
            reason: `发现邻近的输入框 (水平距离: ${Math.round(horizontalDistance)}px, 垂直距离: ${Math.round(verticalDistance)}px)` 
          };
        }
      }
      
      return { found: false, reason: '未发现邻近的输入框' };
    } catch (error) {
      loggerService.error('检查邻近输入框时出错', error);
      return { found: false, reason: '检查邻近输入框时出错' };
    }
  }
  
  /**
   * 检查是否有刷新按钮
   */
  private hasRefreshButton(element: HTMLElement): { found: boolean; reason: string } {
    try {
      const parent = element.parentElement;
      if (!parent) return { found: false, reason: '元素没有父元素' };
      
      const siblings = Array.from(parent.children) as HTMLElement[];
      for (const sibling of siblings) {
        if (sibling === element) continue;
        
        // 判断是否为按钮类型元素
        if (
          sibling.tagName === 'A' || 
          sibling.tagName === 'BUTTON' || 
          sibling.tagName === 'IMG' || 
          sibling.tagName === 'I'
        ) {
          const text = sibling.textContent?.toLowerCase() || '';
          const title = sibling.getAttribute('title')?.toLowerCase() || '';
          const className = sibling.className.toLowerCase();
          
          // 判断是否包含刷新相关关键字
          if (
            text.includes('刷新') || text.includes('换一张') || 
            text.includes('refresh') || text.includes('change') ||
            title.includes('刷新') || title.includes('换一张') ||
            className.includes('refresh') || className.includes('reload')
          ) {
            return { 
              found: true, 
              reason: `发现刷新按钮 (${sibling.tagName.toLowerCase()})` 
            };
          }
        }
      }
      
      return { found: false, reason: '未发现刷新按钮' };
    } catch (error) {
      loggerService.error('检查刷新按钮时出错', error);
      return { found: false, reason: '检查刷新按钮时出错' };
    }
  }
} 