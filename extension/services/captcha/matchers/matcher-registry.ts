import { CaptchaType } from '@/types';
import { CaptchaMatcher } from './base';
import { CharCaptchaMatcher } from './char-matcher';
import { loggerService } from '@/services/logger';

/**
 * 验证码匹配器注册表
 * 管理所有可用的匹配器
 */
export class MatcherRegistry {
  private matchers: Map<CaptchaType, CaptchaMatcher> = new Map();
  
  constructor() {
    this.registerDefaultMatchers();
  }
  
  /**
   * 注册默认的匹配器
   */
  private registerDefaultMatchers(): void {
    // 注册字符型验证码匹配器
    this.register(new CharCaptchaMatcher());
    
    // 未来可以在这里注册更多类型的匹配器
    // 例如: 滑块验证码、点选验证码等
  }
  
  /**
   * 注册匹配器
   */
  register(matcher: CaptchaMatcher): void {
    const type = matcher.getCaptchaType();
    
    if (this.matchers.has(type)) {
      loggerService.warn(`重复注册匹配器: ${CaptchaType[type]}`);
    }
    
    this.matchers.set(type, matcher);
    loggerService.debug(`注册匹配器: ${CaptchaType[type]}`);
  }
  
  /**
   * 获取特定类型的匹配器
   */
  getMatcher(type: CaptchaType): CaptchaMatcher | null {
    return this.matchers.get(type) || null;
  }
  
  /**
   * 获取所有匹配器
   */
  getAllMatchers(): CaptchaMatcher[] {
    return Array.from(this.matchers.values());
  }
} 