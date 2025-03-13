import { setting } from './setting.js';
import { getSelector } from '../utils/element.js';
import { API } from '../api/network.js';
import { CaptchaLocator } from './captcha/index.js';
import { Logger } from '../utils/logger.js';
import { CaptchaService } from './captcha/service.js';

class ContentScript {
  constructor() {
    this.api = new API();
    this.logger = new Logger('content');
    this.captchaService = new CaptchaService(this.api);
    this.settings = { ...setting };
    this.manualModeActive = false;
    this.manualModeOverlay = null;
    
    // 处理来自后台脚本的消息
    this.setupMessageListeners();
    
    // 加载设置
    this.loadSettings();
    
    // 初始化
    this.init();
  }
  
  async init() {
    this.logger.info('内容脚本初始化', { url: window.location.href });
    
    // 等待页面完全加载
    if (document.readyState !== 'complete') {
      this.logger.debug('等待页面加载完成');
      window.addEventListener('load', () => this.onPageLoaded());
    } else {
      this.onPageLoaded();
    }
  }
  
  async onPageLoaded() {
    this.logger.info('页面加载完成, 开始处理验证码');
    
    // 如果扩展被禁用，直接返回
    if (!this.settings.enabled) {
      this.logger.info('扩展已禁用');
      return;
    }
    
    try {
      // 获取当前域名
      const domain = window.location.hostname;
      
      // 从服务器获取验证码定位器
      const locator = await this.captchaService.getLocatorByDomain(domain);
      
      if (locator) {
        this.logger.info('找到验证码定位器', { type: locator.type });
        
        // 如果设置了自动解析已有定位器，则进行处理
        if (this.settings.autoResolveIfExistsLocator) {
          await this.processExistingLocator(locator);
        }
      } else if (this.settings.autoScanIfNotExistsLocator) {
        // 如果设置了无定位器时自动扫描，进行扫描
        this.logger.info('未找到验证码定位器，开始扫描页面');
        await this.scanForCaptcha();
      }
    } catch (error) {
      this.logger.error('验证码处理失败', error);
    }
  }
  
  /**
   * 处理现有的验证码定位器
   * @param {CaptchaLocator} locator 验证码定位器
   */
  async processExistingLocator(locator) {
    try {
      // 使用选择器找到验证码元素
      const captchaElement = document.querySelector(locator.captcha.selector);
      
      if (!captchaElement) {
        this.logger.warn('无法找到验证码元素', { selector: locator.captcha.selector });
        
        // 如果找不到验证码元素，记录错误并尝试重新扫描
        locator.errorCount++;
        await this.captchaService.saveLocator(locator);
        
        if (locator.errorCount > 5) {
          // 如果错误次数过多，尝试重新扫描
          this.logger.info('定位器错误次数过多，尝试重新扫描');
          await this.scanForCaptcha();
        }
        
        return;
      }
      
      // 如果元素是图片，获取新图片数据
      if (captchaElement instanceof HTMLImageElement) {
        locator.captcha.imgSrc = captchaElement.src;
        locator.captcha.imgBase64 = await this.captchaService.getImageBase64(captchaElement);
      }
      
      // 识别验证码
      this.logger.info('开始识别验证码');
      const captchaText = await this.sendResolveCaptchaRequest(locator);
      
      if (captchaText) {
        // 获取输入框元素
        const inputElement = locator.context.inputSelector ? 
          document.querySelector(locator.context.inputSelector) : null;
        
        // 如果找到输入框，填入验证码
        if (inputElement && inputElement instanceof HTMLInputElement) {
          inputElement.value = captchaText;
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          inputElement.dispatchEvent(new Event('change', { bubbles: true }));
          this.logger.info('已自动填入验证码', { text: captchaText });
        } else {
          this.logger.warn('找不到验证码输入框', { inputSelector: locator.context.inputSelector });
        }
      }
    } catch (error) {
      this.logger.error('处理验证码定位器失败', error);
    }
  }
  
  /**
   * 扫描页面查找验证码
   */
  async scanForCaptcha() {
    try {
      const locator = await this.captchaService.scanForCaptcha(document);
      
      if (locator) {
        this.logger.info('扫描发现验证码', { domain: locator.domain, type: locator.type });
        
        // 如果设置了自动解析，尝试识别并填充
        if (this.settings.autoResolveIfExistsLocator) {
          await this.processExistingLocator(locator);
        }
      } else {
        this.logger.info('未检测到验证码');
      }
    } catch (error) {
      this.logger.error('扫描验证码失败', error);
    }
  }
  
  /**
   * 发送验证码识别请求
   */
  async sendResolveCaptchaRequest(locator) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'RESOLVE_CAPTCHA',
        data: locator
      });
      
      if (response && response.success) {
        return response.data;
      } else {
        this.logger.error('验证码识别失败', response ? response.error : '未知错误');
        return null;
      }
    } catch (error) {
      this.logger.error('发送验证码识别请求失败', error);
      return null;
    }
  }
  
  /**
   * 设置消息监听器
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'TAB_UPDATED') {
        // 页面URL更新时的处理
        this.onPageLoaded();
      } else if (request.type === 'ACTIVATE_MANUAL_MODE') {
        this.activateManualMode();
        sendResponse({ success: true });
      }
    });
  }
  
  /**
   * 加载设置
   */
  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTING' });
      if (response && response.success) {
        this.settings = response.data;
        this.logger.debug('已加载设置', this.settings);
      }
    } catch (error) {
      this.logger.error('加载设置失败', error);
    }
  }
  
  /**
   * 激活手动模式，让用户选择验证码图片
   */
  activateManualMode() {
    if (this.manualModeActive) {
      return;
    }
    
    this.manualModeActive = true;
    this.logger.info('已激活手动模式');
    
    // 创建覆盖层
    this.manualModeOverlay = document.createElement('div');
    this.manualModeOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      z-index: 999999;
      cursor: crosshair;
      display: flex;
      justify-content: center;
      align-items: center;
    `;
    
    // 提示文字
    const hint = document.createElement('div');
    hint.style.cssText = `
      background: white;
      padding: 15px;
      border-radius: 5px;
      font-size: 16px;
      color: #333;
      max-width: 80%;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    hint.innerText = '请点击验证码图片 (ESC键取消)';
    
    this.manualModeOverlay.appendChild(hint);
    document.body.appendChild(this.manualModeOverlay);
    
    // 添加点击事件
    this.manualModeOverlay.addEventListener('click', this.handleManualSelection.bind(this));
    
    // 添加ESC键取消
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  /**
   * 处理手动选择验证码
   * @param {MouseEvent} event 点击事件
   */
  handleManualSelection(event) {
    // 阻止事件冒泡
    event.preventDefault();
    event.stopPropagation();
    
    // 获取点击位置
    const x = event.clientX;
    const y = event.clientY;
    
    // 从点击位置获取元素
    this.manualModeOverlay.style.pointerEvents = 'none';
    const element = document.elementFromPoint(x, y);
    this.manualModeOverlay.style.pointerEvents = 'auto';
    
    // 检查是否点击了提示框
    if (element === this.manualModeOverlay.firstChild) {
      return;
    }
    
    // 检查元素是否为图片
    if (element instanceof HTMLImageElement) {
      this.logger.info('手动选择了验证码图片', { selector: getSelector(element) });
      
      // 处理选择的图片
      this.processManualSelection(element);
    } else {
      this.logger.info('选择的元素不是图片', { tagName: element.tagName });
      
      // 尝试查找附近的图片
      const nearbyImg = this.findNearbyImage(element);
      if (nearbyImg) {
        this.logger.info('发现附近的图片元素', { selector: getSelector(nearbyImg) });
        this.processManualSelection(nearbyImg);
      } else {
        this.logger.warn('未在附近找到图片元素');
        alert('未发现验证码图片，请重新选择');
      }
    }
  }
  
  /**
   * 处理手动选择的验证码图片
   * @param {HTMLImageElement} imgElement 图片元素
   */
  async processManualSelection(imgElement) {
    try {
      // 关闭手动模式
      this.deactivateManualMode();
      
      // 获取图片信息
      const imgSrc = imgElement.src;
      const imgBase64 = await this.captchaService.getImageBase64(imgElement);
      
      // 查找相关的输入框
      const inputElement = this.captchaService.findRelatedInputElement(imgElement);
      
      // 创建上下文
      const context = {
        inputSelector: inputElement ? getSelector(inputElement) : null,
        parentFormSelector: this.captchaService.findParentForm(imgElement),
        refreshBtnSelector: this.captchaService.findRefreshButton(imgElement),
        submitBtnSelector: this.captchaService.findSubmitButton(imgElement)
      };
      
      // 创建验证码定位器
      const locator = new CaptchaLocator('character', {
        imgSrc,
        imgBase64,
        selector: getSelector(imgElement)
      }, context);
      
      // 保存定位器
      this.logger.info('保存手动选择的验证码定位器');
      locator.locateMode = 'manual'; // 标记为手动模式
      await this.captchaService.saveLocator(locator);
      
      // 识别验证码
      this.logger.info('开始识别手动选择的验证码');
      const captchaText = await this.sendResolveCaptchaRequest(locator);
      
      if (captchaText && inputElement) {
        // 填入验证码
        inputElement.value = captchaText;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        this.logger.info('已自动填入验证码', { text: captchaText });
      }
    } catch (error) {
      this.logger.error('处理手动选择的验证码失败', error);
    }
  }
  
  /**
   * 查找元素附近的图片
   */
  findNearbyImage(element) {
    // 先检查子元素
    const childImg = element.querySelector('img');
    if (childImg) return childImg;
    
    // 检查兄弟元素
    const parent = element.parentElement;
    if (parent) {
      const siblingImg = parent.querySelector('img');
      if (siblingImg) return siblingImg;
    }
    
    return null;
  }
  
  /**
   * 处理键盘事件
   */
  handleKeyDown(event) {
    if (event.key === 'Escape' && this.manualModeActive) {
      this.deactivateManualMode();
    }
  }
  
  /**
   * 关闭手动模式
   */
  deactivateManualMode() {
    if (!this.manualModeActive) return;
    
    this.manualModeActive = false;
    
    if (this.manualModeOverlay && this.manualModeOverlay.parentNode) {
      this.manualModeOverlay.parentNode.removeChild(this.manualModeOverlay);
    }
    
    document.removeEventListener('keydown', this.handleKeyDown);
    this.logger.info('已关闭手动模式');
  }
}

// 实例化内容脚本
new ContentScript();
