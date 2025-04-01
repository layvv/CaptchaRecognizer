import { reactive, ref } from 'vue';
import { captchaService } from '@/services/captcha';
import { sendMessage } from '@/services/messaging';
import { loggerService } from '@/services/logger';
import { CaptchaType, CaptchaRecord } from '@/types';

/**
 * 设置内容脚本状态管理
 * 将状态与UI分离，提高代码可维护性
 */
export function setupContentScriptState() {
  // 状态管理
  const state = reactive({
    isSelecting: false,
    isElementSelected: false,
    hoveredElement: null as HTMLElement | null,
    selectedElement: null as HTMLElement | null
  });

  // 元素分析结果
  const elementInfo = reactive({
    selector: '',
    tagName: '',
    id: '',
    classes: [] as string[],
    rect: null as DOMRect | null
  });

  // 匹配结果
  const matchResult = ref<{ type: CaptchaType | null; score: number } | null>(null);

  // 事件处理相关
  let eventHandlersActive = false;

  // 开始选择验证码
  const startSelecting = () => {
    if (state.isSelecting) return;
    
    resetState();
    state.isSelecting = true;
    
    // 绑定事件监听
    addEventListeners();
    
    loggerService.info('开始选择验证码');
  };

  // 停止选择验证码
  const stopSelecting = () => {
    if (!state.isSelecting) return;
    
    state.isSelecting = false;
    resetState();
    
    // 移除事件监听
    removeEventListeners();
    
    loggerService.info('停止选择验证码');
  };

  // 重置状态
  const resetState = () => {
    state.isElementSelected = false;
    state.selectedElement = null;
    state.hoveredElement = null;
    
    // 重置分析结果
    Object.assign(elementInfo, {
      selector: '',
      tagName: '',
      id: '',
      classes: [],
      rect: null
    });
    
    matchResult.value = null;
  };

  // 重新选择元素
  const reselectElement = () => {
    resetState();
    
    // 重新绑定鼠标移动监听
    document.addEventListener('mousemove', handleMouseMove);
    
    loggerService.info('用户重新选择验证码元素');
  };

  // 处理元素选择
  const handleSelect = async (type: CaptchaType) => {
    if (!state.selectedElement || !type) {
      loggerService.error('未能确定验证码类型');
      return;
    }
    
    await uploadCaptchaElement(state.selectedElement, type);
  };

  // 绑定事件监听
  const addEventListeners = () => {
    if (eventHandlersActive) return;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);
    
    eventHandlersActive = true;
  };

  // 移除事件监听
  const removeEventListeners = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown);
    
    eventHandlersActive = false;
  };

  // 处理鼠标移动事件
  const handleMouseMove = (e: MouseEvent) => {
    if (!state.isSelecting || state.isElementSelected) return;
    
    const target = e.target as HTMLElement | null;
    
    // 忽略自身UI元素或无效目标
    if (!target || isOwnElement(target)) return;
    
    // 检查是否为有效元素后再赋值
    if (target !== state.hoveredElement) {
      state.hoveredElement = target;
    }
  };

  // 处理点击事件
  const handleClick = (e: MouseEvent) => {
    if (!state.isSelecting || !state.hoveredElement) return;
    
    // 忽略自身UI元素的点击
    const target = e.target as HTMLElement;
    if (isOwnElement(target)) return;
    
    // 阻止事件传播，防止点击刷新验证码
    e.stopPropagation();
    e.preventDefault();
    
    // 如果已经选中元素，则不重复处理
    if (state.isElementSelected) return;
    
    // 选中当前悬停的元素
    selectElement(state.hoveredElement);
  };

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!state.isSelecting) return;
    
    // ESC键取消选择
    if (e.key === 'Escape') {
      stopSelecting();
    }
  };

  // 检查元素是否为选择器自身的UI元素
  const isOwnElement = (element: HTMLElement | null): boolean => {
    if (!element) return false;
    
    return !!(
      element.closest('.captcha-recognizer-panel') || 
      element.closest('.captcha-recognizer-highlight')
    );
  };

  // 选中元素
  const selectElement = (element: HTMLElement) => {
    // 更新状态
    state.isElementSelected = true;
    state.selectedElement = element;
    state.hoveredElement = null;
    
    // 分析元素
    analyzeElement(element);
    
    // 停止跟踪鼠标移动
    document.removeEventListener('mousemove', handleMouseMove);
    
    loggerService.debug('选中元素', { selector: elementInfo.selector });
  };

  // 分析元素
  const analyzeElement = (element: HTMLElement) => {
    const selector = captchaService.getCssSelector(element);
    
    // 更新元素信息
    elementInfo.selector = selector;
    elementInfo.tagName = element.tagName.toLowerCase();
    elementInfo.id = element.id || '';
    elementInfo.classes = Array.from(element.classList);
    elementInfo.rect = element.getBoundingClientRect();
    
    // 分析元素是否为验证码
    matchResult.value = captchaService.analyzeElementForCaptcha(element);
    
    loggerService.debug('分析元素', { selector, matchResult: matchResult.value });
  };

  // 上传验证码元素
  const uploadCaptchaElement = async (element: HTMLElement, type: CaptchaType): Promise<void> => {
    try {
      // 获取图片数据
      const imageData = await captchaService.getImageDataFromElement(element);
      if (!imageData) {
        loggerService.error('无法获取图片数据');
        return;
      }
      
      // 查找相关元素
      const relatedElements = captchaService.findRelatedElements(element, type);
      
      // 创建验证码记录
      const record: CaptchaRecord = {
        url: window.location.href,
        urlPattern: new URL(window.location.href).hostname,
        selector: elementInfo.selector,
        type: type,
        imageData: imageData,
        timestamp: Date.now(),
        relatedElements: relatedElements
      };
      
      // 上传记录
      const success = await sendMessage('uploadCaptchaRecord', record);
      
      if (success) {
        loggerService.info('验证码记录上传成功');
      } else {
        loggerService.error('验证码记录上传失败');
      }
      
      // 结束选择过程
      stopSelecting();
    } catch (error) {
      loggerService.error('上传验证码元素失败', error);
    }
  };

  // 返回公共API
  return {
    state,
    elementInfo,
    matchResult,
    startSelecting,
    stopSelecting,
    reselectElement,
    handleSelect
  };
} 