/**
 * 定位器管理器，负责管理验证码定位器
 */
import { CharLocator } from './char-locator.js';
import { v4 as uuidv4 } from '../../utils/uuid.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('LocatorManager');

/**
 * 定位器管理器类
 */
export class LocatorManager {
  /**
   * 构造函数
   * @param {string} domain 网站域名
   */
  constructor(domain) {
    this.domain = domain;
    this.locators = [];
    this.activeLocators = new Map(); // 活跃的定位器实例 Map<locatorId, locatorInstance>
    this.detectedElements = new Map(); // 已检测的元素 Map<elementId, {element, locator, status}>
    this.settings = {};
  }

  /**
   * 初始化定位器管理器
   * @param {Array} locatorsData 从服务器或本地获取的定位器数据
   * @param {Object} settings 扩展设置
   */
  init(locatorsData = [], settings = {}) {
    this.settings = settings;
    this.locators = locatorsData;
    logger.info(`初始化定位器管理器，加载了 ${locatorsData.length} 个定位器`);
  }

  /**
   * 更新设置
   * @param {Object} settings 新的设置
   */
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * 扫描页面寻找验证码
   * @returns {Array} 找到的验证码元素数组
   */
  async scanForCaptchas() {
    logger.debug('开始扫描验证码');
    
    // 清空以前的检测结果
    this.detectedElements.clear();
    
    // 合并所有定位器找到的结果
    const results = [];
    
    // 1. 首先尝试使用已知的定位器
    for (const locatorData of this.locators) {
      try {
        const locator = this.createLocatorInstance(locatorData);
        if (!locator) continue;
        
        const elements = await locator.findElements();
        logger.debug(`定位器 ${locatorData.id} 找到 ${elements.length} 个元素`);
        
        for (const element of elements) {
          const elementId = this.getElementId(element);
          
          // 避免重复
          if (!this.detectedElements.has(elementId)) {
            this.detectedElements.set(elementId, {
              element,
              locator: locatorData,
              status: 'detected'
            });
            
            results.push({
              element,
              locator: locatorData,
              source: 'known_locator'
            });
          }
        }
      } catch (error) {
        logger.error(`使用定位器 ${locatorData.id} 查找元素失败:`, error);
      }
    }
    
    // 2. 如果没有找到任何验证码，或者用户开启了自动扫描，尝试使用特征检测
    if (results.length === 0 || this.settings.autoScan) {
      try {
        // 使用特征检测查找字符验证码
        const charLocator = new CharLocator();
        const charElements = await charLocator.detectByFeatures();
        
        for (const element of charElements) {
          const elementId = this.getElementId(element);
          
          // 避免重复
          if (!this.detectedElements.has(elementId)) {
            // 为这个元素创建一个新的定位器
            const newLocator = this.createLocatorFromElement(element, 'char');
            
            this.detectedElements.set(elementId, {
              element,
              locator: newLocator,
              status: 'detected'
            });
            
            results.push({
              element,
              locator: newLocator,
              source: 'auto_detection'
            });
          }
        }
      } catch (error) {
        logger.error('自动检测验证码失败:', error);
      }
    }
    
    logger.info(`扫描完成，共找到 ${results.length} 个疑似验证码元素`);
    return results;
  }

  /**
   * 从HTML元素创建定位器对象
   * @param {HTMLElement} element HTML元素
   * @param {string} type 验证码类型
   * @returns {Object} 定位器对象
   */
  createLocatorFromElement(element, type = 'char') {
    try {
      const locator = {
        id: uuidv4(),
        domain: this.domain,
        type: type,
        created: new Date().toISOString(),
        creator: 'auto',
        confidence: 0.8,
        success_rate: 0,
        usage_count: 0,
        selector: this.generateSelector(element),
        features: this.extractElementFeatures(element),
        input_selectors: this.findRelatedInputs(element),
        submit_selectors: this.findRelatedSubmitButtons(element)
      };
      
      return locator;
    } catch (error) {
      logger.error('从元素创建定位器失败:', error);
      return null;
    }
  }

  /**
   * 生成元素的CSS选择器
   * @param {HTMLElement} element HTML元素
   * @returns {string} CSS选择器
   */
  generateSelector(element) {
    // 1. 尝试使用ID
    if (element.id) {
      return `#${element.id}`;
    }
    
    // 2. 尝试使用类名组合
    if (element.className && typeof element.className === 'string' && element.className.trim()) {
      const classes = element.className.trim().split(/\s+/).map(c => `.${c}`).join('');
      // 检查这个选择器是否唯一
      if (document.querySelectorAll(classes).length === 1) {
        return classes;
      }
    }
    
    // 3. 尝试使用标签名和属性
    const tag = element.tagName.toLowerCase();
    if (tag === 'img' && element.getAttribute('src')) {
      const srcPattern = element.getAttribute('src').split('?')[0]; // 去掉查询参数
      return `img[src^="${srcPattern}"]`;
    }
    
    // 4. 尝试使用标签名和类名
    if (element.className && typeof element.className === 'string' && element.className.trim()) {
      const mainClass = element.className.trim().split(/\s+/)[0];
      return `${tag}.${mainClass}`;
    }
    
    // 5. 如果以上方法都不可行，生成一个路径选择器
    let current = element;
    const path = [];
    
    while (current && current !== document.body && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      } else {
        const parent = current.parentElement;
        
        if (parent) {
          const siblings = Array.from(parent.children).filter(e => e.tagName === current.tagName);
          
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-child(${index})`;
          }
        }
        
        path.unshift(selector);
        current = parent;
      }
    }
    
    return path.join(' > ');
  }

  /**
   * 提取元素的特征
   * @param {HTMLElement} element HTML元素
   * @returns {Object} 元素特征
   */
  extractElementFeatures(element) {
    const features = {
      tag: element.tagName.toLowerCase(),
      dimensions: {
        width: element.offsetWidth,
        height: element.offsetHeight
      },
      attributes: {},
      styles: {},
      location: {
        x: 0,
        y: 0
      },
      innerText: element.innerText?.substring(0, 100) || '',
      hasCaptchaKeywords: false
    };
    
    // 获取位置
    const rect = element.getBoundingClientRect();
    features.location = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY
    };
    
    // 获取属性
    for (const attr of element.attributes) {
      features.attributes[attr.name] = attr.value;
      
      // 检查属性是否包含验证码关键字
      if (['id', 'class', 'name', 'alt', 'title'].includes(attr.name.toLowerCase())) {
        const keywords = ['captcha', 'verify', 'verification', '验证码', '验证', 'valicode', 'validatecode'];
        if (keywords.some(keyword => attr.value.toLowerCase().includes(keyword))) {
          features.hasCaptchaKeywords = true;
        }
      }
    }
    
    // 获取重要的样式属性
    const computedStyle = window.getComputedStyle(element);
    const importantStyles = [
      'display', 'position', 'width', 'height', 'margin', 'padding',
      'border', 'background-color', 'background-image', 'color'
    ];
    
    for (const style of importantStyles) {
      features.styles[style] = computedStyle.getPropertyValue(style);
    }
    
    // 如果是图片，获取图片的自然尺寸
    if (element.tagName.toLowerCase() === 'img') {
      features.naturalDimensions = {
        width: element.naturalWidth,
        height: element.naturalHeight
      };
      
      // 图片加载状态
      features.complete = element.complete;
    }
    
    return features;
  }

  /**
   * 查找与验证码相关的输入框
   * @param {HTMLElement} captchaElement 验证码元素
   * @returns {Array<string>} 输入框选择器数组
   */
  findRelatedInputs(captchaElement) {
    const inputSelectors = [];
    
    // 1. 查找表单内的输入框
    const form = captchaElement.closest('form');
    if (form) {
      const inputs = form.querySelectorAll('input[type="text"]');
      for (const input of inputs) {
        // 检查输入框是否与验证码相关
        const isCaptchaInput = this.isInputRelatedToCaptcha(input);
        if (isCaptchaInput) {
          const selector = this.generateSelector(input);
          inputSelectors.push(selector);
        }
      }
    }
    
    // 2. 查找验证码附近的输入框
    if (inputSelectors.length === 0) {
      const nearbyInputs = this.findNearbyElements(captchaElement, 'input[type="text"]');
      for (const input of nearbyInputs) {
        const isCaptchaInput = this.isInputRelatedToCaptcha(input);
        if (isCaptchaInput) {
          const selector = this.generateSelector(input);
          inputSelectors.push(selector);
        }
      }
    }
    
    return inputSelectors;
  }

  /**
   * 判断输入框是否与验证码相关
   * @param {HTMLElement} input 输入框元素
   * @returns {boolean} 是否相关
   */
  isInputRelatedToCaptcha(input) {
    // 检查输入框的属性
    const attributes = ['id', 'name', 'class', 'placeholder', 'aria-label'];
    const keywords = ['captcha', 'verify', 'verification', '验证码', '验证', 'valicode', 'validatecode'];
    
    for (const attr of attributes) {
      const value = input.getAttribute(attr);
      if (value && typeof value === 'string') {
        if (keywords.some(keyword => value.toLowerCase().includes(keyword))) {
          return true;
        }
      }
    }
    
    // 检查输入框附近的文本
    const parent = input.parentElement;
    if (parent) {
      const text = parent.textContent || '';
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        return true;
      }
      
      // 检查输入框前面的标签
      const previousSibling = input.previousElementSibling;
      if (previousSibling && previousSibling.tagName.toLowerCase() === 'label') {
        const labelText = previousSibling.textContent || '';
        if (keywords.some(keyword => labelText.toLowerCase().includes(keyword))) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 查找与验证码相关的提交按钮
   * @param {HTMLElement} captchaElement 验证码元素
   * @returns {Array<string>} 提交按钮选择器数组
   */
  findRelatedSubmitButtons(captchaElement) {
    const submitSelectors = [];
    
    // 1. 查找表单内的提交按钮
    const form = captchaElement.closest('form');
    if (form) {
      const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type]), input[type="button"]');
      for (const button of submitButtons) {
        const selector = this.generateSelector(button);
        submitSelectors.push(selector);
      }
    }
    
    // 2. 查找验证码附近的按钮
    if (submitSelectors.length === 0) {
      const nearbyButtons = this.findNearbyElements(captchaElement, 'button, input[type="submit"], input[type="button"]');
      for (const button of nearbyButtons) {
        const selector = this.generateSelector(button);
        submitSelectors.push(selector);
      }
    }
    
    return submitSelectors;
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
    
    // 按距离排序
    nearbyElements.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const centerA = {
        x: rectA.left + rectA.width / 2,
        y: rectA.top + rectA.height / 2
      };
      
      const rectB = b.getBoundingClientRect();
      const centerB = {
        x: rectB.left + rectB.width / 2,
        y: rectB.top + rectB.height / 2
      };
      
      const distanceA = Math.sqrt(
        Math.pow(centerA.x - center.x, 2) +
        Math.pow(centerA.y - center.y, 2)
      );
      
      const distanceB = Math.sqrt(
        Math.pow(centerB.x - center.x, 2) +
        Math.pow(centerB.y - center.y, 2)
      );
      
      return distanceA - distanceB;
    });
    
    return nearbyElements;
  }

  /**
   * 创建定位器实例
   * @param {Object} locatorData 定位器数据
   * @returns {CharLocator|null} 定位器实例
   */
  createLocatorInstance(locatorData) {
    // 检查是否已经有这个定位器的实例
    if (this.activeLocators.has(locatorData.id)) {
      return this.activeLocators.get(locatorData.id);
    }
    
    let locator = null;
    
    // 根据类型创建不同的定位器
    switch (locatorData.type) {
      case 'char':
        locator = new CharLocator(locatorData);
        break;
      // 未来可以添加更多类型的定位器
      default:
        logger.warn(`不支持的定位器类型: ${locatorData.type}`);
        return null;
    }
    
    // 保存实例以便重用
    this.activeLocators.set(locatorData.id, locator);
    return locator;
  }

  /**
   * 获取元素的唯一ID
   * @param {HTMLElement} element HTML元素
   * @returns {string} 元素ID
   */
  getElementId(element) {
    if (element.dataset.captchaId) {
      return element.dataset.captchaId;
    }
    
    const id = uuidv4();
    element.dataset.captchaId = id;
    return id;
  }

  /**
   * 向服务器上传定位器
   * @param {Object} locator 定位器数据
   * @returns {Promise<Object>} 上传结果
   */
  async uploadLocator(locator) {
    return await chrome.runtime.sendMessage({
      type: 'upload_locator',
      data: { locator }
    });
  }

  /**
   * 报告定位器的识别结果
   * @param {string} locatorId 定位器ID
   * @param {boolean} success 是否成功
   * @param {Object} details 详细信息
   * @returns {Promise<Object>} 报告结果
   */
  async reportRecognitionResult(locatorId, success, details = {}) {
    return await chrome.runtime.sendMessage({
      type: 'report_result',
      data: { locatorId, success, details }
    });
  }

  /**
   * 从已知的定位器中移除失效的定位器
   * @param {string} locatorId 要移除的定位器ID
   */
  removeLocator(locatorId) {
    this.locators = this.locators.filter(l => l.id !== locatorId);
    this.activeLocators.delete(locatorId);
  }
} 