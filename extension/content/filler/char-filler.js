/**
 * 字符型验证码填充器，负责处理验证码识别结果的填充
 */
import { Logger } from '../utils/logger.js';
import { imageToBase64 } from '../utils/image-utils.js';

const logger = new Logger('CharFiller');

/**
 * 字符型验证码填充器类
 */
export class CharFiller {
  /**
   * 构造函数
   * @param {Object} settings 设置
   */
  constructor(settings = {}) {
    this.settings = settings;
    this.maxRetries = settings.maxRetries || 3;
    this.retryInterval = settings.retryInterval || 1000;
  }

  /**
   * 处理验证码
   * @param {HTMLElement} captchaElement 验证码元素
   * @param {Object} locator 验证码定位器数据
   * @returns {Promise<Object>} 处理结果
   */
  async process(captchaElement, locator) {
    try {
      logger.info('开始处理字符型验证码');
      
      // 1. 获取验证码图片
      const imageData = await this.getCaptchaImageData(captchaElement);
      if (!imageData) {
        throw new Error('获取验证码图片失败');
      }
      
      // 2. 发送到服务器识别
      const recognitionResult = await this.recognizeCaptcha(imageData);
      if (!recognitionResult.success) {
        throw new Error(`验证码识别失败: ${recognitionResult.error || '未知错误'}`);
      }
      
      logger.info(`验证码识别结果: ${recognitionResult.result.text}`);
      
      // 3. 查找并填充相关的输入框
      const fillResult = await this.fillCaptchaValue(
        locator.input_selectors, 
        recognitionResult.result.text
      );
      
      // 4. 上报识别结果
      await this.reportRecognitionResult(locator.id, fillResult.success, {
        recognizedText: recognitionResult.result.text,
        confidence: recognitionResult.result.confidence,
        ...fillResult
      });
      
      return {
        success: fillResult.success,
        text: recognitionResult.result.text,
        confidence: recognitionResult.result.confidence,
        ...fillResult
      };
    } catch (error) {
      logger.error('处理验证码失败:', error);
      
      // 上报失败
      await this.reportRecognitionResult(locator.id, false, {
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取验证码图片数据
   * @param {HTMLElement} captchaElement 验证码元素
   * @returns {Promise<string|null>} base64编码的图片数据
   */
  async getCaptchaImageData(captchaElement) {
    // 检查元素类型
    if (captchaElement.tagName.toLowerCase() === 'img') {
      return await imageToBase64(captchaElement);
    }
    
    // 如果不是图片元素，尝试查找内部的图片
    const imgElement = captchaElement.querySelector('img');
    if (imgElement) {
      return await imageToBase64(imgElement);
    }
    
    // 如果没有找到图片元素，检查是否有背景图片
    const computedStyle = window.getComputedStyle(captchaElement);
    const backgroundImage = computedStyle.getPropertyValue('background-image');
    
    if (backgroundImage && backgroundImage !== 'none') {
      // 提取URL
      const urlMatch = /url\(['"]?([^'"()]+)['"]?\)/g.exec(backgroundImage);
      if (urlMatch && urlMatch[1]) {
        // 创建一个临时图片元素加载背景图片
        const tempImg = document.createElement('img');
        tempImg.style.display = 'none';
        document.body.appendChild(tempImg);
        
        try {
          tempImg.src = urlMatch[1];
          
          // 等待图片加载
          await new Promise((resolve, reject) => {
            tempImg.onload = resolve;
            tempImg.onerror = reject;
            setTimeout(reject, 5000); // 5秒超时
          });
          
          const result = await imageToBase64(tempImg);
          return result;
        } catch (error) {
          logger.error('加载背景图片失败:', error);
          return null;
        } finally {
          // 清理临时元素
          document.body.removeChild(tempImg);
        }
      }
    }
    
    logger.error('未找到可用的验证码图片');
    return null;
  }

  /**
   * 识别验证码
   * @param {string} imageData base64编码的图片数据
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeCaptcha(imageData) {
    return await chrome.runtime.sendMessage({
      type: 'recognize_captcha',
      data: {
        imageData,
        captchaType: 'char'
      }
    });
  }

  /**
   * 填充验证码值到输入框
   * @param {Array<string>} inputSelectors 输入框选择器数组
   * @param {string} captchaText 验证码文本
   * @returns {Promise<Object>} 填充结果
   */
  async fillCaptchaValue(inputSelectors, captchaText) {
    if (!inputSelectors || !inputSelectors.length) {
      logger.warn('没有找到相关的输入框选择器');
      return {
        success: false,
        reason: 'no_input_found'
      };
    }
    
    // 尝试使用所有提供的选择器
    for (const selector of inputSelectors) {
      try {
        const inputElement = document.querySelector(selector);
        if (!inputElement) {
          logger.warn(`未找到匹配选择器的输入框: ${selector}`);
          continue;
        }
        
        // 检查元素是否为输入框
        if (inputElement.tagName.toLowerCase() !== 'input') {
          logger.warn(`选择器匹配的元素不是输入框: ${selector}`);
          continue;
        }
        
        // 判断输入框是否可见和可用
        if (!this.isElementVisible(inputElement) || inputElement.disabled) {
          logger.warn(`输入框不可见或已禁用: ${selector}`);
          continue;
        }
        
        // 填充验证码值
        this.fillInputWithValue(inputElement, captchaText);
        
        logger.info(`成功填充验证码到输入框: ${selector}`);
        return {
          success: true,
          filledSelector: selector
        };
      } catch (error) {
        logger.error(`填充输入框 ${selector} 失败:`, error);
      }
    }
    
    // 如果所有选择器都失败了，尝试查找页面中的验证码输入框
    try {
      const detectedInput = this.detectCaptchaInput();
      if (detectedInput) {
        this.fillInputWithValue(detectedInput, captchaText);
        
        logger.info('通过自动检测找到并填充了验证码输入框');
        return {
          success: true,
          filledSelector: 'auto_detected',
          detectedInput: {
            id: detectedInput.id,
            name: detectedInput.name,
            className: detectedInput.className
          }
        };
      }
    } catch (error) {
      logger.error('自动检测验证码输入框失败:', error);
    }
    
    return {
      success: false,
      reason: 'all_selectors_failed'
    };
  }

  /**
   * 向输入框填充值
   * @param {HTMLInputElement} input 输入框元素
   * @param {string} value 要填充的值
   */
  fillInputWithValue(input, value) {
    // 先聚焦输入框
    input.focus();
    
    // 清除现有值
    input.value = '';
    
    // 模拟用户输入
    const originalValue = input.value;
    input.value = value;
    
    // 触发相关事件
    const events = ['input', 'change', 'keyup'];
    
    for (const eventType of events) {
      const event = new Event(eventType, { bubbles: true });
      input.dispatchEvent(event);
    }
    
    // 检查值是否成功设置
    if (input.value !== value) {
      logger.warn('直接设置值失败，尝试模拟键盘输入');
      
      // 恢复原始值
      input.value = originalValue;
      
      // 模拟键盘输入
      for (const char of value) {
        // 模拟键盘按下事件
        const keydownEvent = new KeyboardEvent('keydown', {
          key: char,
          code: `Key${char.toUpperCase()}`,
          bubbles: true,
          cancelable: true
        });
        input.dispatchEvent(keydownEvent);
        
        // 模拟输入事件
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          data: char
        });
        input.dispatchEvent(inputEvent);
        
        // 附加字符到值
        input.value += char;
        
        // 模拟键盘松开事件
        const keyupEvent = new KeyboardEvent('keyup', {
          key: char,
          code: `Key${char.toUpperCase()}`,
          bubbles: true,
          cancelable: true
        });
        input.dispatchEvent(keyupEvent);
      }
      
      // 触发change事件
      const changeEvent = new Event('change', { bubbles: true });
      input.dispatchEvent(changeEvent);
    }
  }

  /**
   * 检测页面中可能的验证码输入框
   * @returns {HTMLInputElement|null} 验证码输入框元素
   */
  detectCaptchaInput() {
    // 常见的验证码输入框选择器
    const commonSelectors = [
      'input[name*=captcha]',
      'input[id*=captcha]',
      'input[name*=validate]',
      'input[id*=validate]',
      'input[name*=verify]',
      'input[id*=verify]',
      'input[placeholder*=验证码]',
      'input[placeholder*=captcha]',
      'input[placeholder*=validation]',
      'input[aria-label*=captcha]',
      'input[aria-label*=验证码]'
    ];
    
    // 尝试使用选择器查找
    for (const selector of commonSelectors) {
      const input = document.querySelector(selector);
      if (input && this.isElementVisible(input) && !input.disabled) {
        return input;
      }
    }
    
    // 检查表单中的所有文本输入框
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const textInputs = form.querySelectorAll('input[type="text"]');
      for (const input of textInputs) {
        if (this.isCaptchaInput(input)) {
          return input;
        }
      }
    }
    
    return null;
  }

  /**
   * 判断输入框是否是验证码输入框
   * @param {HTMLInputElement} input 输入框元素
   * @returns {boolean} 是否是验证码输入框
   */
  isCaptchaInput(input) {
    if (!this.isElementVisible(input) || input.disabled) {
      return false;
    }
    
    // 检查输入框的各种属性
    const attributes = [
      input.id,
      input.name,
      input.placeholder,
      input.className,
      input.getAttribute('aria-label')
    ];
    
    const keywords = [
      'captcha', 'validatecode', 'validation', 'verifycode',
      'valicode', 'authcode', 'securitycode', 'checkcode',
      '验证码', '验证', '校验码'
    ];
    
    for (const attr of attributes) {
      if (attr && typeof attr === 'string') {
        const lowerAttr = attr.toLowerCase();
        for (const keyword of keywords) {
          if (lowerAttr.includes(keyword)) {
            return true;
          }
        }
      }
    }
    
    // 检查输入框的限制
    if (input.maxLength > 0 && input.maxLength <= 8) {
      // 验证码通常有字符长度限制
      const nearbyImage = this.findNearbyImage(input);
      if (nearbyImage) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 查找输入框附近的图片
   * @param {HTMLElement} input 输入框元素
   * @param {number} maxDistance 最大距离（像素）
   * @returns {HTMLElement|null} 附近的图片元素
   */
  findNearbyImage(input, maxDistance = 200) {
    const inputRect = input.getBoundingClientRect();
    const inputCenter = {
      x: inputRect.left + inputRect.width / 2,
      y: inputRect.top + inputRect.height / 2
    };
    
    const images = document.querySelectorAll('img');
    let closestImage = null;
    let closestDistance = maxDistance;
    
    for (const img of images) {
      const imgRect = img.getBoundingClientRect();
      
      // 忽略不可见的图片
      if (imgRect.width === 0 || imgRect.height === 0 || !this.isElementVisible(img)) {
        continue;
      }
      
      const imgCenter = {
        x: imgRect.left + imgRect.width / 2,
        y: imgRect.top + imgRect.height / 2
      };
      
      const distance = Math.sqrt(
        Math.pow(imgCenter.x - inputCenter.x, 2) +
        Math.pow(imgCenter.y - inputCenter.y, 2)
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestImage = img;
      }
    }
    
    return closestImage;
  }

  /**
   * 判断元素是否可见
   * @param {HTMLElement} element HTML元素
   * @returns {boolean} 是否可见
   */
  isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    const rect = element.getBoundingClientRect();
    
    // 元素必须有尺寸
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    
    // 元素必须在视口内
    if (
      rect.top + rect.height < 0 ||
      rect.left + rect.width < 0 ||
      rect.bottom - rect.height > window.innerHeight ||
      rect.right - rect.width > window.innerWidth
    ) {
      return false;
    }
    
    return true;
  }

  /**
   * 报告验证码识别结果
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
} 