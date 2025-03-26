/**
 * 定位器工厂，用于创建不同类型的定位器
 */
import { CharLocator } from './char-locator.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('LocatorFactory');

/**
 * 定位器工厂类
 */
export class LocatorFactory {
  /**
   * 根据定位器数据创建定位器实例
   * @param {Object} locatorData 定位器数据
   * @returns {Object|null} 定位器实例
   */
  static createLocator(locatorData) {
    if (!locatorData || !locatorData.type) {
      logger.error('创建定位器失败: 无效的定位器数据');
      return null;
    }
    
    try {
      switch (locatorData.type.toLowerCase()) {
        case 'char':
          return new CharLocator(locatorData);
          
        // 未来可以添加更多类型的定位器
        
        default:
          logger.warn(`不支持的定位器类型: ${locatorData.type}`);
          return null;
      }
    } catch (error) {
      logger.error(`创建定位器失败: ${error.message}`);
      return null;
    }
  }
  
  /**
   * 获取支持的定位器类型列表
   * @returns {Array<string>} 支持的定位器类型
   */
  static getSupportedTypes() {
    return ['char'];
  }
} 