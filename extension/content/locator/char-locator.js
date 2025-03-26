/**
 * 字符型验证码定位器，用于查找字符型验证码
 */
import { Logger } from '../utils/logger.js';
import { imageToBase64 } from '../utils/image-utils.js';

const logger = new Logger('CharLocator');

/**
 * 字符型验证码特征
 */
const CHAR_CAPTCHA_FEATURES = {
  // 图片尺寸通常较小
  dimensions: {
    minWidth: 40,
    maxWidth: 200,
    minHeight: 20,
    maxHeight: 80,
    // 宽高比范围
    minRatio: 1.0, // 宽/高
    maxRatio: 5.0
  },
  
  // 常见的验证码关键字
  keywords: [
    'captcha', 'validatecode', 'validation', 'security-code', 'verifycode',
    'valicode', 'authcode', 'verify-code', 'checkcode', 
    '验证码', '验证', '校验码', 'seccode'
  ],
  
  // 文件名中的关键字
  fileNameKeywords: [
    'captcha', 'validate', 'verify', 'vali', 'security', 'check',
    '验证码'
  ],
  
  // 可能的图片特征
  imageFeatures: {
    // 图片通常包含噪点、特殊字符等
    containsRandomContent: true,
    // 背景色通常是浅色或白色
    lightBackground: true
  }
};

/**
 * 字符型验证码定位器类
 */
export class CharLocator {
  /**
   * 构造函数
   * @param {Object} locatorData 定位器数据
   */
  constructor(locatorData = null) {
    this.locatorData = locatorData;
    this.maxRetries = 3; // 最大重试次数
  }

  /**
   * 使用定位器数据查找验证码元素
   * @returns {Promise<Array<HTMLElement>>} 验证码元素数组
   */
  async findElements() {
    if (!this.locatorData) {
      return [];
    }
    
    const { selector } = this.locatorData;
    if (!selector) {
      return [];
    }
    
    try {
      // 使用选择器查找元素
      const elements = Array.from(document.querySelectorAll(selector));
      
      // 如果没有找到元素，可能是因为页面结构变化
      if (elements.length === 0) {
        logger.warn(`使用选择器 "${selector}" 没有找到元素`);
        return [];
      }
      
      // 过滤掉不符合验证码特征的元素
      const captchaElements = elements.filter(element => {
        return this.matchesFeatures(element, this.locatorData.features);
      });
      
      if (captchaElements.length === 0 && elements.length > 0) {
        logger.warn(`使用选择器 "${selector}" 找到了元素，但不符合验证码特征`);
      }
      
      return captchaElements;
    } catch (error) {
      logger.error(`查找验证码元素失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 使用特征检测查找字符型验证码
   * @returns {Promise<Array<HTMLElement>>} 验证码元素数组
   */
  async detectByFeatures() {
    try {
      // 1. 基于常见模式的检测策略
      
      // 1.1 查找所有图片元素
      const allImages = Array.from(document.querySelectorAll('img'));
      const candidates = [];
      
      // 1.2 过滤掉不符合基本尺寸要求的图片
      const sizeFilteredImages = allImages.filter(img => {
        const { width, height } = img.getBoundingClientRect();
        
        // 过滤掉尺寸为0的图片或尺寸过大的图片
        if (width === 0 || height === 0) {
          return false;
        }
        
        const { dimensions } = CHAR_CAPTCHA_FEATURES;
        const ratio = width / height;
        
        return (
          width >= dimensions.minWidth &&
          width <= dimensions.maxWidth &&
          height >= dimensions.minHeight &&
          height <= dimensions.maxHeight &&
          ratio >= dimensions.minRatio &&
          ratio <= dimensions.maxRatio
        );
      });
      
      logger.debug(`找到 ${allImages.length} 张图片，尺寸筛选后剩余 ${sizeFilteredImages.length} 张`);
      
      // 1.3 评估每个图片的可能性分数
      for (const img of sizeFilteredImages) {
        const score = this.evaluateCaptchaScore(img);
        
        if (score > 0.5) {
          candidates.push({
            element: img,
            score
          });
        }
      }
      
      // 按分数排序
      candidates.sort((a, b) => b.score - a.score);
      
      logger.info(`找到 ${candidates.length} 个疑似验证码图片`);
      
      // 2. 基于上下文的检测
      
      // 2.1 查找可能的验证码容器
      const possibleContainers = document.querySelectorAll(
        'form, div.captcha, div.validate, div.verification, .login-form, .register-form'
      );
      
      for (const container of possibleContainers) {
        // 在容器中查找图片
        const containerImages = Array.from(container.querySelectorAll('img'));
        
        for (const img of containerImages) {
          // 避免重复
          if (candidates.some(c => c.element === img)) {
            continue;
          }
          
          const { width, height } = img.getBoundingClientRect();
          
          // 过滤掉尺寸为0的图片或尺寸过大的图片
          if (width === 0 || height === 0) {
            continue;
          }
          
          const score = this.evaluateCaptchaScore(img, true);
          
          if (score > 0.3) { // 在容器内的图片使用较低的阈值
            candidates.push({
              element: img,
              score
            });
          }
        }
      }
      
      // 3. 获取最终结果
      return candidates.map(c => c.element);
    } catch (error) {
      logger.error('特征检测失败:', error);
      return [];
    }
  }

  /**
   * 评估图片是否为验证码的可能性分数
   * @param {HTMLImageElement} img 图片元素
   * @param {boolean} inContainer 是否在可能的验证码容器内
   * @returns {number} 可能性分数 (0-1)
   */
  evaluateCaptchaScore(img, inContainer = false) {
    let score = 0;
    const { keywords, fileNameKeywords } = CHAR_CAPTCHA_FEATURES;
    
    // 检查图片的id、类名、alt等属性是否包含关键字
    const attributes = {
      id: img.id,
      class: img.className,
      alt: img.alt,
      title: img.title,
      name: img.getAttribute('name')
    };
    
    for (const [attr, value] of Object.entries(attributes)) {
      if (value && typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        for (const keyword of keywords) {
          if (lowerValue.includes(keyword)) {
            score += 0.3;
            break;
          }
        }
      }
    }
    
    // 检查图片URL是否包含关键字
    const src = img.src || '';
    if (src) {
      const fileName = src.split('/').pop().split('?')[0].toLowerCase();
      
      for (const keyword of fileNameKeywords) {
        if (fileName.includes(keyword)) {
          score += 0.3;
          break;
        }
      }
      
      // 检查URL是否包含随机参数（通常验证码URL会有随机数防止缓存）
      if (src.includes('?') && src.includes('=')) {
        const params = src.split('?')[1].split('&');
        for (const param of params) {
          const [name, value] = param.split('=');
          
          // 随机参数通常包含时间戳或随机数
          if (
            name && (
              name.includes('rand') ||
              name.includes('time') ||
              name.includes('stamp') ||
              name.includes('t=') ||
              name.includes('r=')
            )
          ) {
            score += 0.2;
          }
          
          // 值是纯数字的可能是时间戳
          if (value && /^\d+$/.test(value)) {
            score += 0.1;
          }
        }
      }
    }
    
    // 检查图片附近的文本是否包含关键字
    const parentText = img.parentElement ? img.parentElement.innerText : '';
    if (parentText) {
      const lowerText = parentText.toLowerCase();
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          score += 0.2;
          break;
        }
      }
    }
    
    // 检查图片尺寸
    const { width, height } = img.getBoundingClientRect();
    const idealWidth = 100; // 理想的验证码宽度
    const idealHeight = 40; // 理想的验证码高度
    
    // 尺寸接近理想值的图片得分更高
    const widthDiff = Math.abs(width - idealWidth) / idealWidth;
    const heightDiff = Math.abs(height - idealHeight) / idealHeight;
    
    if (widthDiff < 0.3 && heightDiff < 0.3) {
      score += 0.2;
    }
    
    // 如果在可能的验证码容器内，加分
    if (inContainer) {
      score += 0.15;
    }
    
    // 查找图片附近是否有输入框
    const nearbyInputs = this.findNearbyElements(img, 'input[type="text"]', 200);
    if (nearbyInputs.length > 0) {
      score += 0.25;
      
      // 检查输入框是否与验证码相关
      for (const input of nearbyInputs) {
        const inputAttrs = {
          id: input.id,
          name: input.getAttribute('name'),
          placeholder: input.getAttribute('placeholder'),
          class: input.className
        };
        
        for (const [attr, value] of Object.entries(inputAttrs)) {
          if (value && typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            for (const keyword of keywords) {
              if (lowerValue.includes(keyword)) {
                score += 0.2;
                break;
              }
            }
          }
        }
      }
    }
    
    return Math.min(1, score); // 确保分数不超过1
  }

  /**
   * 检查元素是否符合指定的特征
   * @param {HTMLElement} element HTML元素
   * @param {Object} features 特征对象
   * @returns {boolean} 是否符合
   */
  matchesFeatures(element, features) {
    // 如果没有特征要求，认为元素符合
    if (!features) {
      return true;
    }
    
    // 检查标签名
    if (features.tag && element.tagName.toLowerCase() !== features.tag) {
      return false;
    }
    
    // 检查尺寸
    if (features.dimensions) {
      const { width, height } = element.getBoundingClientRect();
      const { minWidth, maxWidth, minHeight, maxHeight } = features.dimensions;
      
      if (
        (minWidth !== undefined && width < minWidth) ||
        (maxWidth !== undefined && width > maxWidth) ||
        (minHeight !== undefined && height < minHeight) ||
        (maxHeight !== undefined && height > maxHeight)
      ) {
        return false;
      }
    }
    
    // 检查属性
    if (features.attributes) {
      for (const [name, value] of Object.entries(features.attributes)) {
        const attrValue = element.getAttribute(name);
        
        // 如果属性不存在或值不匹配
        if (attrValue === null || attrValue !== value) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * 查找元素附近的其它元素
   * @param {HTMLElement} element 中心元素
   * @param {string} selector 要查找的元素选择器
   * @param {number} maxDistance 最大距离（像素）
   * @returns {Array<HTMLElement>} 查找到的元素数组
   */
  findNearbyElements(element, selector, maxDistance = 200) {
    const nearbyElements = [];
    const rect = element.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    const candidates = Array.from(document.querySelectorAll(selector));
    
    for (const candidate of candidates) {
      const candidateRect = candidate.getBoundingClientRect();
      const candidateCenter = {
        x: candidateRect.left + candidateRect.width / 2,
        y: candidateRect.top + candidateRect.height / 2
      };
      
      const distance = Math.sqrt(
        Math.pow(candidateCenter.x - center.x, 2) +
        Math.pow(candidateCenter.y - center.y, 2)
      );
      
      if (distance <= maxDistance) {
        nearbyElements.push(candidate);
      }
    }
    
    return nearbyElements;
  }

  /**
   * 获取验证码图片的Base64编码
   * @param {HTMLImageElement} imgElement 图片元素
   * @param {boolean} retryOnError 出错时是否重试
   * @returns {Promise<string|null>} Base64编码的图片数据
   */
  async getCaptchaImage(imgElement, retryOnError = true) {
    try {
      // 确保图片已加载
      if (!imgElement.complete) {
        await new Promise((resolve, reject) => {
          imgElement.onload = resolve;
          imgElement.onerror = reject;
          
          // 设置超时
          setTimeout(() => reject(new Error('加载图片超时')), 5000);
        });
      }
      
      // 将图片转换为Base64
      return await imageToBase64(imgElement);
    } catch (error) {
      logger.error('获取验证码图片失败:', error);
      
      if (retryOnError && this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`重试获取验证码图片 (${this.retryCount}/${this.maxRetries})`);
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.getCaptchaImage(imgElement, retryOnError);
      }
      
      return null;
    }
  }

  /**
   * 刷新验证码
   * @param {HTMLImageElement} imgElement 验证码图片元素
   * @returns {Promise<boolean>} 是否成功刷新
   */
  async refreshCaptcha(imgElement) {
    try {
      // 通用的刷新策略：给src添加随机参数
      const originalSrc = imgElement.src;
      const randomParam = `t=${Date.now()}`;
      
      if (originalSrc.includes('?')) {
        imgElement.src = `${originalSrc}&${randomParam}`;
      } else {
        imgElement.src = `${originalSrc}?${randomParam}`;
      }
      
      // 等待图片加载完成
      await new Promise((resolve, reject) => {
        imgElement.onload = resolve;
        imgElement.onerror = reject;
        
        // 设置超时
        setTimeout(() => reject(new Error('刷新验证码超时')), 5000);
      });
      
      return true;
    } catch (error) {
      logger.error('刷新验证码失败:', error);
      return false;
    }
  }
} 