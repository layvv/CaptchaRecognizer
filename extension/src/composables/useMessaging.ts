import { ref, reactive, computed } from 'vue';
import { MessagingUtil, Logger } from '@/utils';
import { Message, MessageType } from '@/types';
import { useLogger } from '@/composables/useLogger';

// 日志记录器
const logger = new Logger('MessagingService');

/**
 * 消息服务组合函数
 * 处理消息发送和接收的业务逻辑
 */
export function useMessaging() {
  const { debug, error } = useLogger('MessagingService');
  
  // 消息处理状态
  const messaging = reactive({
    isSending: false,
    lastError: null as string | null,
    lastMessage: null as Message | null,
    lastResponse: null as any
  });
  
  /**
   * 发送获取验证码记录消息
   * @param url 页面URL
   */
  const getCaptchaRecord = async (url: string) => {
    try {
      messaging.isSending = true;
      messaging.lastError = null;
      
      const message = MessagingUtil.createMessage(MessageType.GET_CAPTCHA_RECORD, { url });
      messaging.lastMessage = message;
      
      debug('发送获取验证码记录消息', { url });
      const response = await MessagingUtil.sendToBackground<{ url: string }, any>(message);
      messaging.lastResponse = response;
      
      return response;
    } catch (err) {
      messaging.lastError = (err as Error).message;
      error('发送获取验证码记录消息失败', err);
      throw err;
    } finally {
      messaging.isSending = false;
    }
  };
  
  /**
   * 发送保存验证码记录消息
   * @param record 验证码记录
   */
  const saveCaptchaRecord = async (record: any) => {
    try {
      messaging.isSending = true;
      messaging.lastError = null;
      
      const message = MessagingUtil.createMessage(MessageType.SAVE_CAPTCHA_RECORD, record);
      messaging.lastMessage = message;
      
      debug('发送保存验证码记录消息', { record });
      const response = await MessagingUtil.sendToBackground<any, any>(message);
      messaging.lastResponse = response;
      
      return response;
    } catch (err) {
      messaging.lastError = (err as Error).message;
      error('发送保存验证码记录消息失败', err);
      throw err;
    } finally {
      messaging.isSending = false;
    }
  };
  
  /**
   * 发送识别验证码消息
   * @param imageData 图像数据
   * @param options 识别选项
   */
  const recognizeCaptcha = async (imageData: string, options?: any) => {
    try {
      messaging.isSending = true;
      messaging.lastError = null;
      
      const message = MessagingUtil.createMessage(MessageType.RECOGNIZE_CAPTCHA, { imageData, options });
      messaging.lastMessage = message;
      
      debug('发送识别验证码消息', { imageDataLength: imageData.length, options });
      const response = await MessagingUtil.sendToBackground<{ imageData: string, options?: any }, any>(message);
      messaging.lastResponse = response;
      
      return response;
    } catch (err) {
      messaging.lastError = (err as Error).message;
      error('发送识别验证码消息失败', err);
      throw err;
    } finally {
      messaging.isSending = false;
    }
  };
  
  /**
   * 发送上报结果消息
   * @param url 页面URL
   * @param success 是否成功
   * @param details 详细信息
   */
  const reportResult = async (url: string, success: boolean, details?: any) => {
    try {
      messaging.isSending = true;
      messaging.lastError = null;
      
      const message = MessagingUtil.createMessage(MessageType.REPORT_RESULT, { url, success, details });
      messaging.lastMessage = message;
      
      debug('发送上报结果消息', { url, success, details });
      const response = await MessagingUtil.sendToBackground<{ url: string, success: boolean, details?: any }, boolean>(message);
      messaging.lastResponse = response;
      
      return response;
    } catch (err) {
      messaging.lastError = (err as Error).message;
      error('发送上报结果消息失败', err);
      throw err;
    } finally {
      messaging.isSending = false;
    }
  };
  
  /**
   * 发送获取设置消息
   */
  const getSettings = async () => {
    try {
      messaging.isSending = true;
      messaging.lastError = null;
      
      const message = MessagingUtil.createMessage(MessageType.GET_SETTINGS);
      messaging.lastMessage = message;
      
      debug('发送获取设置消息');
      const response = await MessagingUtil.sendToBackground<void, any>(message);
      messaging.lastResponse = response;
      
      return response;
    } catch (err) {
      messaging.lastError = (err as Error).message;
      error('发送获取设置消息失败', err);
      throw err;
    } finally {
      messaging.isSending = false;
    }
  };
  
  /**
   * 发送保存设置消息
   * @param settings 设置对象
   */
  const saveSettings = async (settings: any) => {
    try {
      messaging.isSending = true;
      messaging.lastError = null;
      
      const message = MessagingUtil.createMessage(MessageType.SAVE_SETTINGS, settings);
      messaging.lastMessage = message;
      
      debug('发送保存设置消息', { settings });
      const response = await MessagingUtil.sendToBackground<any, boolean>(message);
      messaging.lastResponse = response;
      
      return response;
    } catch (err) {
      messaging.lastError = (err as Error).message;
      error('发送保存设置消息失败', err);
      throw err;
    } finally {
      messaging.isSending = false;
    }
  };
  
  /**
   * 发送设置高亮消息
   * @param tabId 标签页ID
   * @param enabled 是否启用高亮
   */
  const setHighlighting = async (tabId: number, enabled: boolean) => {
    try {
      messaging.isSending = true;
      messaging.lastError = null;
      
      const message = MessagingUtil.createMessage(MessageType.SET_HIGHLIGHTING, { enabled });
      messaging.lastMessage = message;
      
      debug('发送设置高亮消息', { tabId, enabled });
      const response = await MessagingUtil.sendToContent<{ enabled: boolean }, boolean>(tabId, message);
      messaging.lastResponse = response;
      
      return response;
    } catch (err) {
      messaging.lastError = (err as Error).message;
      error('发送设置高亮消息失败', err);
      throw err;
    } finally {
      messaging.isSending = false;
    }
  };
  
  /**
   * 发送开启验证码选择器消息
   * @param tabId 标签页ID
   */
  const openCaptchaSelector = async (tabId: number) => {
    try {
      messaging.isSending = true;
      messaging.lastError = null;
      
      const message = MessagingUtil.createMessage(MessageType.OPEN_CAPTCHA_SELECTOR);
      messaging.lastMessage = message;
      
      debug('发送开启验证码选择器消息', { tabId });
      const response = await MessagingUtil.sendToContent<void, boolean>(tabId, message);
      messaging.lastResponse = response;
      
      return response;
    } catch (err) {
      messaging.lastError = (err as Error).message;
      error('发送开启验证码选择器消息失败', err);
      throw err;
    } finally {
      messaging.isSending = false;
    }
  };
  
  /**
   * 发送处理验证码消息
   * @param tabId 标签页ID
   * @param elementId 元素ID或选择器
   */
  const processCaptcha = async (tabId: number, elementId: string) => {
    try {
      messaging.isSending = true;
      messaging.lastError = null;
      
      const message = MessagingUtil.createMessage(MessageType.PROCESS_CAPTCHA, { elementId });
      messaging.lastMessage = message;
      
      debug('发送处理验证码消息', { tabId, elementId });
      const response = await MessagingUtil.sendToContent<{ elementId: string }, any>(tabId, message);
      messaging.lastResponse = response;
      
      return response;
    } catch (err) {
      messaging.lastError = (err as Error).message;
      error('发送处理验证码消息失败', err);
      throw err;
    } finally {
      messaging.isSending = false;
    }
  };
  
  /**
   * 发送初始化消息
   * @param tabId 标签页ID
   * @param settings 设置对象
   */
  const initializeContent = async (tabId: number, settings: any) => {
    try {
      messaging.isSending = true;
      messaging.lastError = null;
      
      const message = MessagingUtil.createMessage(MessageType.INITIALIZE, settings);
      messaging.lastMessage = message;
      
      debug('发送初始化消息', { tabId, settings });
      const response = await MessagingUtil.sendToContent<any, boolean>(tabId, message);
      messaging.lastResponse = response;
      
      return response;
    } catch (err) {
      messaging.lastError = (err as Error).message;
      error('发送初始化消息失败', err);
      throw err;
    } finally {
      messaging.isSending = false;
    }
  };
  
  /**
   * 发送消息到所有标签页
   * @param message 消息对象
   */
  const broadcastToAllTabs = async <T = any>(messageType: MessageType, data?: T) => {
    try {
      messaging.isSending = true;
      messaging.lastError = null;
      
      const message = MessagingUtil.createMessage(messageType, data);
      messaging.lastMessage = message;
      
      debug('广播消息到所有标签页', { messageType, data });
      await MessagingUtil.broadcastToAllTabs(message);
      
      return true;
    } catch (err) {
      messaging.lastError = (err as Error).message;
      error('广播消息失败', err);
      throw err;
    } finally {
      messaging.isSending = false;
    }
  };
  
  /**
   * 在内容脚本注册消息处理器
   * @param handler 消息处理函数
   */
  const registerContentHandler = <T = any, R = any>(
    handler: (message: Message<T>, sender: browser.Runtime.MessageSender) => Promise<R> | R
  ) => {
    return MessagingUtil.registerContentHandler(handler);
  };
  
  /**
   * 在后台脚本注册消息处理器
   * @param handler 消息处理函数
   */
  const registerBackgroundHandler = <T = any, R = any>(
    handler: (message: Message<T>, sender: browser.Runtime.MessageSender) => Promise<R> | R
  ) => {
    return MessagingUtil.registerBackgroundHandler(handler);
  };
  
  return {
    // 状态
    messaging: computed(() => messaging),
    isSending: computed(() => messaging.isSending),
    lastError: computed(() => messaging.lastError),
    
    // 通用消息方法
    sendToBackground: MessagingUtil.sendToBackground,
    sendToContent: MessagingUtil.sendToContent,
    broadcastToAllTabs,
    registerContentHandler,
    registerBackgroundHandler,
    
    // 业务消息方法
    getCaptchaRecord,
    saveCaptchaRecord,
    recognizeCaptcha,
    reportResult,
    getSettings,
    saveSettings,
    setHighlighting,
    openCaptchaSelector,
    processCaptcha,
    initializeContent
  };
} 