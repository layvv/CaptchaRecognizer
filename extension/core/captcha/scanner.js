import { Logger } from '../../utils/logger.js';

export class CaptchaScanner {
  constructor() {
    this.logger = new Logger('captcha-scanner');
    
    // 字符验证码的特征
    this.charCaptchaFeatures = {
      // 图片特征
      imgAttributes: [
        { key: 'id', patterns: ['captcha', 'validate', 'verifycode', 'verification'] },
        { key: 'class', patterns: ['captcha', 'validate', 'verifycode', 'verification'] },
        { key: 'name', patterns: ['captcha', 'validate', 'verifycode', 'verification'] },
        { key: 'alt', patterns: ['captcha', 'validate', 'verifycode', 'verification'] },
        { key: 'title', patterns: ['captcha', 'validate', 'verifycode', 'verification'] },
        { key: 'src', patterns: ['captcha', 'validate', 'verifycode', 'verification', 'code'] }
      ],
      
      // 尺寸特征 (字符验证码一般都比较小)
      sizeConstraints: {
        minWidth: 40,
        maxWidth: 200,
        minHeight: 20,
        maxHeight: 100,
        maxAspectRatio: 4,
        minAspectRatio: 1
      },
      
      // 父元素/相邻元素关键字
      contextKeywords: [
        'captcha', 'verify', 'verification', 'validate', 'security',
        '验证码', '验证', '安全验证', '图形验证', '图片验证', '请输入验证码',
        'code', 'securitycode', 'checkcode', 'kaptcha'
      ]
    };
  }

  /**
   * 扫描页面查找可能的验证码
   * @param {Document} document 文档对象
   * @returns {HTMLImageElement|null} 找到的验证码元素
   */
  async findCaptchaInPage(document) {
    this.logger.debug('开始扫描页面查找验证码');
    
    // 1. 先查找表单内的图片元素
    const formImages = Array.from(document.querySelectorAll('form img'));
    this.logger.debug(`找到表单内图片: ${formImages.length}个`);
    
    const captchaInForm = this.findCaptchaInElements(formImages);
    if (captchaInForm) {
      this.logger.info('在表单中发现验证码');
      return captchaInForm;
    }
    
    // 2. 查找所有可能与验证码输入框相邻的图片
    const captchaInputs = Array.from(document.querySelectorAll('input')).filter(input => {
      const id = input.id?.toLowerCase() || '';
      const name = input.name?.toLowerCase() || '';
      const placeholder = input.placeholder?.toLowerCase() || '';
      const label = input.labels?.[0]?.textContent.toLowerCase() || '';
      
      return this.charCaptchaFeatures.contextKeywords.some(keyword => 
        id.includes(keyword) || 
        name.includes(keyword) || 
        placeholder.includes(keyword) || 
        label.includes(keyword)
      );
    });
    
    this.logger.debug(`找到可能的验证码输入框: ${captchaInputs.length}个`);
    
    for (const input of captchaInputs) {
      // 检查输入框周围的图片
      const nearbyImages = this.findNearbyImages(input);
      const captcha = this.findCaptchaInElements(nearbyImages);
      if (captcha) {
        this.logger.info('在验证码输入框附近发现验证码图片');
        return captcha;
      }
    }
    
    // 3. 检查所有图片
    const allImages = Array.from(document.querySelectorAll('img'));
    this.logger.debug(`检查所有图片: ${allImages.length}个`);
    
    return this.findCaptchaInElements(allImages);
  }

  /**
   * 在元素集合中查找验证码
   * @param {Array<HTMLElement>} elements 元素集合
   * @returns {HTMLImageElement|null} 找到的验证码元素
   */
  findCaptchaInElements(elements) {
    // 按得分排序
    const scoredElements = elements
      .map(element => ({
        element,
        score: this.calculateCaptchaScore(element)
      }))
      .filter(item => item.score > 10) // 过滤掉得分太低的
      .sort((a, b) => b.score - a.score);
    
    return scoredElements.length > 0 ? scoredElements[0].element : null;
  }

  /**
   * 计算元素作为验证码的可能性得分
   * @param {HTMLElement} element DOM元素
   * @returns {number} 得分
   */
  calculateCaptchaScore(element) {
    if (!(element instanceof HTMLImageElement)) {
      return 0;
    }
    
    let score = 0;
    
    // 1. 检查元素属性是否包含验证码相关关键字
    this.charCaptchaFeatures.imgAttributes.forEach(attribute => {
      const attrValue = element.getAttribute(attribute.key)?.toLowerCase() || '';
      if (attrValue && attribute.patterns.some(pattern => attrValue.includes(pattern))) {
        score += 20;
      }
    });
    
    // 2. 检查尺寸
    const { width, height } = element;
    const aspectRatio = width / height;
    
    const {
      minWidth, maxWidth, minHeight, maxHeight,
      minAspectRatio, maxAspectRatio
    } = this.charCaptchaFeatures.sizeConstraints;
    
    if (width >= minWidth && width <= maxWidth && 
        height >= minHeight && height <= maxHeight &&
        aspectRatio >= minAspectRatio && aspectRatio <= maxAspectRatio) {
      score += 20;
    }
    
    // 3. 检查周围上下文
    const parent = element.parentElement;
    if (parent) {
      const parentText = parent.textContent.toLowerCase();
      if (this.charCaptchaFeatures.contextKeywords.some(keyword => parentText.includes(keyword))) {
        score += 15;
      }
      
      // 检查相邻的输入框
      const sibling = parent.querySelector('input');
      if (sibling) {
        score += 10;
        
        // 检查输入框属性
        const siblingId = sibling.id?.toLowerCase() || '';
        const siblingName = sibling.name?.toLowerCase() || '';
        const siblingPlaceholder = sibling.placeholder?.toLowerCase() || '';
        
        if (this.charCaptchaFeatures.contextKeywords.some(keyword => 
          siblingId.includes(keyword) || 
          siblingName.includes(keyword) || 
          siblingPlaceholder.includes(keyword))) {
          score += 15;
        }
      }
    }
    
    // 4. URL特征
    const src = element.src?.toLowerCase() || '';
    if (src && this.charCaptchaFeatures.imgAttributes.find(attr => attr.key === 'src')?.patterns.some(pattern => src.includes(pattern))) {
      score += 15;
    }
    
    // 5. 元素标签特征
    const nextElement = element.nextElementSibling;
    if (nextElement instanceof HTMLLabelElement || nextElement instanceof HTMLSpanElement) {
      const text = nextElement.textContent.toLowerCase();
      if (this.charCaptchaFeatures.contextKeywords.some(keyword => text.includes(keyword))) {
        score += 10;
      }
    }
    
    return score;
  }

  /**
   * 查找与输入框相邻的图片
   * @param {HTMLInputElement} input 输入框元素
   * @returns {Array<HTMLImageElement>} 相邻的图片元素
   */
  findNearbyImages(input) {
    const parent = input.parentElement;
    if (!parent) return [];
    
    // 查找父元素内的所有图片
    const siblingImages = Array.from(parent.querySelectorAll('img'));
    
    // 如果父元素内没有找到，向上一级继续查找
    if (siblingImages.length === 0 && parent.parentElement) {
      return Array.from(parent.parentElement.querySelectorAll('img'));
    }
    
    return siblingImages;
  }
} 