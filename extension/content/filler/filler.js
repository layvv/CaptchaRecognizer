/**
 * 填充器模块，负责创建不同类型的验证码填充器
 */
import { CharFiller } from './char-filler.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('FillerFactory');

/**
 * 填充器工厂类
 */
export class FillerFactory {
  /**
   * 创建填充器实例
   * @param {string} captchaType 验证码类型
   * @param {Object} settings 设置
   * @returns {Object|null} 填充器实例
   */
  static createFiller(captchaType, settings = {}) {
    try {
      switch (captchaType.toLowerCase()) {
        case 'char':
          return new CharFiller(settings);
          
        // 未来可以添加更多类型的填充器
        
        default:
          logger.warn(`不支持的验证码类型: ${captchaType}`);
          return null;
      }
    } catch (error) {
      logger.error(`创建填充器失败: ${error.message}`);
      return null;
    }
  }
  
  /**
   * 获取支持的验证码类型
   * @returns {Array<string>} 支持的验证码类型数组
   */
  static getSupportedTypes() {
    return ['char'];
  }
  
  /**
   * 处理验证码
   * @param {string} captchaType 验证码类型
   * @param {HTMLElement} captchaElement 验证码元素
   * @param {Object} locator 验证码定位器数据
   * @param {Object} settings 设置
   * @returns {Promise<Object>} 处理结果
   */
  static async processCaptcha(captchaType, captchaElement, locator, settings = {}) {
    const filler = FillerFactory.createFiller(captchaType, settings);
    
    if (!filler) {
      return {
        success: false,
        error: `不支持的验证码类型: ${captchaType}`
      };
    }
    
    return await filler.process(captchaElement, locator);
  }
} 