import { getSelector } from '../../utils/element.js';
import { getItem, setItem, setLocator, getLocator } from '../../utils/storage.js';
import { Logger } from '../../utils/logger.js';
import { CaptchaLocator } from './index.js';
import { CaptchaScanner } from './scanner.js';

export class CaptchaService {
  constructor(api) {
    this.api = api;
    this.logger = new Logger('captcha-service');
    this.scanner = new CaptchaScanner();
    this.captchaCache = new Map(); // 缓存最近处理的验证码，避免重复请求
  }

  /**
   * 解析验证码
   * @param {CaptchaLocator} locator 验证码定位器
   * @returns {Promise<string>} 识别结果
   */
  async resolveCaptcha(locator) {
    try {
      // 检查缓存，如果最近处理过相同的验证码且在有效期内，直接返回结果
      const cacheKey = `${locator.domain}:${locator.url}:${locator.captcha.imgBase64 || locator.captcha.imgSrc}`;
      const cachedResult = this.captchaCache.get(cacheKey);
      
      if (cachedResult && Date.now() - cachedResult.timestamp < 60000) { // 1分钟内有效
        this.logger.info('使用缓存的验证码结果', { domain: locator.domain });
        return cachedResult.result;
      }

      // 更新尝试次数
      locator.tryCount++;
      
      // 发送到服务器进行识别
      const result = await this.api.resolveCaptcha(locator);
      
      // 更新识别结果统计
      if (result.success) {
        locator.successCount++;
        locator.lastResolveTime = Date.now();
      } else {
        locator.errorCount++;
      }
      
      // 保存更新后的定位器
      await this.saveLocator(locator);
      
      // 缓存结果
      this.captchaCache.set(cacheKey, {
        result: result.text,
        timestamp: Date.now()
      });
      
      this.logger.info('验证码识别完成', { domain: locator.domain, success: result.success });
      return result.text;
    } catch (error) {
      this.logger.error('验证码识别异常', error);
      locator.errorCount++;
      await this.saveLocator(locator);
      throw new Error(`验证码识别失败: ${error.message}`);
    }
  }

  /**
   * 保存验证码定位器
   * @param {CaptchaLocator} locator 验证码定位器
   */
  async saveLocator(locator) {
    // 更新最后更新时间
    locator.lastUpdateTime = Date.now();
    
    // 本地存储
    await setLocator(locator);
    
    try {
      // 上传到服务端
      await this.api.saveCaptchaLocator(locator);
      this.logger.info('定位器已上传到服务器', { domain: locator.domain, type: locator.type });
    } catch (error) {
      this.logger.warn('定位器上传失败，将在下次尝试', { domain: locator.domain, error: error.message });
    }
  }

  /**
   * 获取当前域名的验证码定位器
   * @param {string} domain 域名
   * @returns {Promise<CaptchaLocator>} 验证码定位器
   */
  async getLocatorByDomain(domain) {
    try {
      // 先从本地获取
      let locator = await getLocator(domain);
      
      // 如果本地没有，尝试从服务端获取
      if (!locator) {
        const response = await this.api.getLocatorByDomain(domain);
        if (response.success && response.data) {
          locator = response.data;
          // 保存到本地
          await setLocator(locator);
          this.logger.info('已从服务器获取验证码定位器', { domain });
        }
      }
      
      return locator;
    } catch (error) {
      this.logger.error('获取验证码定位器失败', { domain, error: error.message });
      return null;
    }
  }

  /**
   * 扫描当前页面查找验证码
   * @param {Document} document 当前页面文档
   * @returns {Promise<CaptchaLocator>} 验证码定位器
   */
  async scanForCaptcha(document) {
    try {
      this.logger.info('开始扫描验证码');
      const captchaElement = await this.scanner.findCaptchaInPage(document);
      
      if (!captchaElement) {
        this.logger.info('未发现验证码');
        return null;
      }
      
      // 提取验证码图片信息
      const imgSrc = captchaElement.src;
      const imgBase64 = await this.getImageBase64(captchaElement);
      
      // 获取输入框元素
      const inputElement = this.findRelatedInputElement(captchaElement);
      
      // 创建验证码上下文
      const context = {
        inputSelector: inputElement ? getSelector(inputElement) : null,
        parentFormSelector: this.findParentForm(captchaElement),
        refreshBtnSelector: this.findRefreshButton(captchaElement),
        submitBtnSelector: this.findSubmitButton(captchaElement)
      };
      
      // 创建验证码定位器
      const domain = window.location.hostname;
      const locator = new CaptchaLocator('character', {
        imgSrc,
        imgBase64,
        selector: getSelector(captchaElement)
      }, context);
      
      this.logger.info('发现验证码', { domain, selector: locator.captcha.selector });
      
      // 保存定位器
      await this.saveLocator(locator);
      
      return locator;
    } catch (error) {
      this.logger.error('扫描验证码异常', error);
      return null;
    }
  }

  /**
   * 获取图片的Base64编码
   * @param {HTMLImageElement} imgElement 图片元素
   * @returns {Promise<string>} Base64编码的图片
   */
  getImageBase64(imgElement) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = imgElement.naturalWidth || imgElement.width;
        canvas.height = imgElement.naturalHeight || imgElement.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgElement, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 查找与验证码相关的输入框
   */
  findRelatedInputElement(captchaElement) {
    // 找附近的输入框
    const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
    
    // 按照与验证码图片的距离排序
    const captchaRect = captchaElement.getBoundingClientRect();
    
    return inputs.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      
      const distA = Math.sqrt(
        Math.pow(rectA.left - captchaRect.left, 2) + 
        Math.pow(rectA.top - captchaRect.top, 2)
      );
      
      const distB = Math.sqrt(
        Math.pow(rectB.left - captchaRect.left, 2) + 
        Math.pow(rectB.top - captchaRect.top, 2)
      );
      
      return distA - distB;
    })[0];
  }

  /**
   * 查找父表单
   */
  findParentForm(element) {
    let current = element;
    while (current && current !== document.body) {
      if (current.tagName === 'FORM') {
        return getSelector(current);
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * 查找刷新按钮
   */
  findRefreshButton(captchaElement) {
    // 查找刷新按钮的典型特征
    const buttons = Array.from(document.querySelectorAll('button, a, div, span'));
    const refreshButton = buttons.find(btn => {
      const text = btn.innerText.toLowerCase();
      const classes = btn.className.toLowerCase();
      
      // 检查常见的刷新按钮特征
      return (
        (text.includes('刷新') || text.includes('换一张') || text.includes('refresh') || text.includes('change')) ||
        classes.includes('refresh') || classes.includes('reload') || 
        btn.querySelector('i.fa-refresh, i.fa-sync, i.fa-redo')
      ) && this.isNear(captchaElement, btn);
    });
    
    return refreshButton ? getSelector(refreshButton) : null;
  }

  /**
   * 查找提交按钮
   */
  findSubmitButton(captchaElement) {
    // 获取表单内提交按钮
    const form = captchaElement.closest('form');
    if (form) {
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        return getSelector(submitBtn);
      }
    }
    
    // 如果没有在表单中找到，查找页面中可能的提交按钮
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], a.btn'));
    const submitButton = buttons.find(btn => {
      const text = btn.innerText.toLowerCase();
      return (text.includes('登录') || text.includes('提交') || text.includes('确定') || 
              text.includes('login') || text.includes('submit') || text.includes('确认')) &&
              this.isInSameContainer(captchaElement, btn);
    });
    
    return submitButton ? getSelector(submitButton) : null;
  }

  /**
   * 检查两个元素是否接近
   */
  isNear(element1, element2, threshold = 200) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();
    
    const xDist = Math.abs(rect1.left - rect2.left);
    const yDist = Math.abs(rect1.top - rect2.top);
    
    return xDist < threshold && yDist < threshold;
  }

  /**
   * 检查两个元素是否在同一容器内
   */
  isInSameContainer(element1, element2) {
    const commonContainers = ['form', '.form', '.login-form', '.container', '.login-container'];
    
    for (const selector of commonContainers) {
      const container1 = element1.closest(selector);
      const container2 = element2.closest(selector);
      
      if (container1 && container1 === container2) {
        return true;
      }
    }
    
    return false;
  }
} 