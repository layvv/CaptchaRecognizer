import { CaptchaRecord, CaptchaType, CaptchaRecognizeRequest, CaptchaRecognizeResponse, RelatedElement } from '@/types';
import { networkService } from '../network';
import { storageService } from '../storage';
import { loggerService } from '../logger';
import { CaptchaAnalyzer } from './analyzer';
import { MatchResult } from './matchers/base';

// 验证码匹配得分接口
interface CaptchaMatchScore {
  score: number;
  threshold: number;
  details: { 
    score: number; 
    reason: string; 
  }[];
  passed: boolean;
}

/**
 * 验证码服务 - 处理验证码识别相关功能
 */
class CaptchaService {
  private readonly API_ENDPOINTS = {
    RECOGNIZE: '/captcha/recognize',
    UPLOAD_RECORD: '/captcha/record',
    GET_RECORD: '/captcha/record'
  };
  
  private analyzer: CaptchaAnalyzer;
  
  constructor() {
    this.analyzer = new CaptchaAnalyzer();
  }
  
  /**
   * 分析元素，判断是否为验证码并返回匹配结果
   * @param element 待分析的元素
   * @returns 匹配结果，如果没有匹配则返回null
   */
  analyzeElementForCaptcha(element: HTMLElement): MatchResult | null {
    return this.analyzer.analyzeElement(element);
  }
  
  /**
   * 获取元素的CSS选择器
   * @param element 要为其生成选择器的元素
   * @returns 能够唯一识别该元素的CSS选择器
   */
  getCssSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }
    
    let selector = element.tagName.toLowerCase();
    
    // 添加类名
    if (element.className && typeof element.className === 'string') {
      const classes = element.className
        .split(' ')
        .filter(c => c.trim() !== '')
        .map(c => `.${CSS.escape(c)}`)
        .join('');
      
      if (classes) {
        selector += classes;
      }
    }
    
    // 添加属性选择器
    const attributes = ['name', 'src', 'alt', 'title', 'href', 'type', 'value'];
    for (const attr of attributes) {
      const value = element.getAttribute(attr);
      if (!value) continue;
      
      if ((attr === 'src' || attr === 'href') && value.includes('/')) {
        try {
          const url = new URL(value, window.location.href);
          const filename = url.pathname.split('/').pop() || '';
          if (filename) {
            selector += `[${attr}$="${CSS.escape(filename)}"]`;
            continue;
          }
        } catch (e) {
          // URL解析失败，使用完整值
        }
      }
      
      // 截断长属性值
      const truncatedValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
      selector += `[${attr}="${CSS.escape(truncatedValue)}"]`;
    }
    
    return selector;
  }
  
  /**
   * 查找与验证码相关联的元素
   * @param element 验证码元素
   * @param type 验证码类型
   * @returns 相关元素数组
   */
  findRelatedElements(element: HTMLElement, type: CaptchaType): RelatedElement[] {
    const relatedElements: RelatedElement[] = [];
    
    if (type === CaptchaType.CHAR) {
      // 查找输入框
      this.findNearbyInputFields(element, relatedElements);
      
      // 查找刷新按钮
      this.findRefreshButton(element, relatedElements);
    }
    
    return relatedElements;
  }
  
  /**
   * 找寻附近的输入框
   */
  private findNearbyInputFields(element: HTMLElement, relatedElements: RelatedElement[]): void {
    const nearbyInputs = document.querySelectorAll('input[type="text"]');
    const elementRect = element.getBoundingClientRect();
    
    for (const input of nearbyInputs) {
      const inputRect = input.getBoundingClientRect();
      
      // 计算距离
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
        const attributes: Record<string, string> = {};
        for (const attr of ['id', 'name', 'placeholder', 'class']) {
          const value = input.getAttribute(attr);
          if (value) attributes[attr] = value;
        }
        
        relatedElements.push({
          type: 'input',
          selector: this.getCssSelector(input as HTMLElement),
          attributes
        });
      }
    }
  }
  
  /**
   * 查找刷新按钮
   */
  private findRefreshButton(element: HTMLElement, relatedElements: RelatedElement[]): void {
    const parent = element.parentElement;
    if (!parent) return;
    
    const siblings = Array.from(parent.children) as HTMLElement[];
    for (const sibling of siblings) {
      if (sibling === element) continue;
      
      // 按钮类型元素
      if (
        sibling.tagName === 'A' || 
        sibling.tagName === 'BUTTON' || 
        sibling.tagName === 'IMG' || 
        sibling.tagName === 'I'
      ) {
        const text = sibling.textContent?.toLowerCase() || '';
        const title = sibling.getAttribute('title')?.toLowerCase() || '';
        const className = sibling.className.toLowerCase();
        
        // 包含刷新相关关键字
        if (
          text.includes('刷新') || text.includes('换一张') || 
          text.includes('refresh') || text.includes('change') ||
          title.includes('刷新') || title.includes('换一张') ||
          className.includes('refresh') || className.includes('reload')
        ) {
          const attributes: Record<string, string> = {};
          for (const attr of ['id', 'class', 'title']) {
            const value = sibling.getAttribute(attr);
            if (value) attributes[attr] = value;
          }
          
          relatedElements.push({
            type: 'button',
            selector: this.getCssSelector(sibling),
            attributes
          });
        }
      }
    }
  }
  
  /**
   * 识别验证码
   * @param imageData 验证码图片数据（Base64编码）
   * @param captchaRecord 验证码记录
   */
  async recognizeCaptcha(
    imageData: string, 
    captchaRecord: CaptchaRecord
  ): Promise<CaptchaRecognizeResponse> {
    try {
      loggerService.info('开始识别验证码', { type: captchaRecord.type });
      
      // 构建请求参数
      const requestData: CaptchaRecognizeRequest = {
        captchaId: captchaRecord.id,
        type: captchaRecord.type,
        image: imageData,
        extra: {
          url: captchaRecord.url,
          selector: captchaRecord.selector
        }
      };
      
      // 发送识别请求
      const response = await networkService.post<CaptchaRecognizeRequest, CaptchaRecognizeResponse>(
        this.API_ENDPOINTS.RECOGNIZE,
        requestData
      );
      
      if (response.code !== 200 || !response.data) {
        loggerService.error('验证码识别失败', { errorCode: response.code, message: response.message });
        return {
          success: false,
          error: response.message || '验证码识别失败'
        };
      }
      
      loggerService.info('验证码识别成功', { result: response.data.result });
      return response.data;
    } catch (error) {
      loggerService.error('验证码识别异常', error);
      return {
        success: false,
        error: (error as Error).message || '验证码识别过程出现异常'
      };
    }
  }
  
  /**
   * 上传验证码记录
   */
  async uploadCaptchaRecord(record: CaptchaRecord): Promise<boolean> {
    try {
      loggerService.info('上传验证码记录', record);
      
      // 发送上传请求
      const response = await networkService.post<CaptchaRecord, { id: string }>(
        this.API_ENDPOINTS.UPLOAD_RECORD,
        record
      );
      
      if (response.code !== 200 || !response.data) {
        loggerService.error('上传验证码记录失败', { errorCode: response.code, message: response.message });
        return false;
      }
      
      // 更新记录ID并保存到本地
      record.id = response.data.id;
      await storageService.saveCaptchaRecord(record);
      
      loggerService.info('上传验证码记录成功', { id: record.id });
      return true;
    } catch (error) {
      loggerService.error('上传验证码记录异常', error);
      return false;
    }
  }
  
  /**
   * 获取网站的验证码记录
   */
  async getCaptchaRecord(url: string): Promise<CaptchaRecord | null> {
    try {
      loggerService.info('获取验证码记录', { url });
      
      // 先从本地缓存中获取
      const localRecord = await storageService.getCaptchaRecord(url);
      if (localRecord) {
        loggerService.info('从本地缓存获取到验证码记录', { id: localRecord.id });
        return localRecord;
      }
      
      // 本地没有则从服务器获取
      const encodedUrl = encodeURIComponent(url);
      const response = await networkService.get<CaptchaRecord>(
        `${this.API_ENDPOINTS.GET_RECORD}?url=${encodedUrl}`
      );
      
      if (response.code !== 200 || !response.data) {
        loggerService.warn('服务器中没有该网站的验证码记录', { url });
        return null;
      }
      
      // 保存到本地缓存
      await storageService.saveCaptchaRecord(response.data);
      
      loggerService.info('从服务器获取到验证码记录', { id: response.data.id });
      return response.data;
    } catch (error) {
      loggerService.error('获取验证码记录异常', error);
      return null;
    }
  }
  
  /**
   * 评估元素是否为字符型验证码
   * @deprecated 请使用analyzeElementForCaptcha代替
   */
  evaluateCharCaptcha(element: HTMLElement): CaptchaMatchScore {
    loggerService.warn('使用了过时的evaluateCharCaptcha方法，请升级到analyzeElementForCaptcha');
    
    const result: CaptchaMatchScore = {
      score: 0,
      threshold: 70,
      details: [{
        score: 0,
        reason: '初始化'
      }],
      passed: false
    };
    
    // 使用新的分析器分析元素
    const matchResult = this.analyzeElementForCaptcha(element);
    
    if (matchResult && matchResult.type === CaptchaType.CHAR) {
      // 转换为旧格式
      result.score = matchResult.score * 100;
      result.details = matchResult.details.map(d => ({
        score: d.score,
        reason: d.reason
      }));
      result.passed = matchResult.passed;
    }
    
    return result;
  }
  
  /**
   * 从元素获取图片数据
   * @param element 图片元素
   * @returns 图片的Base64数据
   */
  async getImageDataFromElement(element: HTMLElement): Promise<string> {
    if (element.tagName !== 'IMG') {
      loggerService.warn('所选元素不是图片，无法获取图像数据');
      return '';
    }
    
    const img = element as HTMLImageElement;
    
    try {
      // 验证图片URL
      if (!img.src || img.src === '' || img.src === 'data:' || img.src.startsWith('javascript:')) {
        throw new Error('无效的图片URL');
      }
      
      const response = await fetch(img.src);
      if (!response.ok) {
        throw new Error(`获取图片失败: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('读取图片数据失败'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      loggerService.error('获取图片数据失败', error);
      return '';
    }
  }
}

// 导出服务实例
export const captchaService = new CaptchaService(); 