import browser from 'webextension-polyfill';
import { Logger } from './logger';
import { Message } from '../types';

// 创建日志记录器
const logger = new Logger('MessagingUtil');

/**
 * 消息工具类
 * 提供浏览器扩展内部通信功能，与业务逻辑无关
 */
export class MessagingUtil {
  /**
   * 发送消息到后台脚本
   * @param message 消息对象
   * @returns 响应数据的Promise
   */
  static async sendToBackground<T = any, R = any>(message: Message<T>): Promise<R> {
    try {
      logger.debug('发送消息到后台脚本', message);
      return await browser.runtime.sendMessage(message);
    } catch (error) {
      logger.error('发送消息到后台脚本失败', error);
      throw error;
    }
  }
  
  /**
   * 发送消息到内容脚本
   * @param tabId 标签页ID
   * @param message 消息对象
   * @param frameId 可选的框架ID
   * @returns 响应数据的Promise
   */
  static async sendToContent<T = any, R = any>(
    tabId: number,
    message: Message<T>,
    frameId?: number
  ): Promise<R> {
    try {
      logger.debug(`发送消息到内容脚本 (tabId: ${tabId})`, message);
      
      if (frameId !== undefined) {
        return await browser.tabs.sendMessage(tabId, message, { frameId });
      } else {
        return await browser.tabs.sendMessage(tabId, message);
      }
    } catch (error) {
      logger.error(`发送消息到内容脚本失败 (tabId: ${tabId})`, error);
      throw error;
    }
  }
  
  /**
   * 广播消息到所有标签页
   * @param message 消息对象
   * @returns 是否成功发送的Promise
   */
  static async broadcastToAllTabs<T = any>(message: Message<T>): Promise<void> {
    try {
      logger.debug('广播消息到所有标签页', message);
      
      const tabs = await browser.tabs.query({});
      const promises = tabs.map(tab => {
        if (tab.id) {
          return browser.tabs.sendMessage(tab.id, message).catch(err => {
            // 忽略无法接收消息的标签页错误
            if (!err.toString().includes('Could not establish connection')) {
              logger.warn(`向标签页 ${tab.id} 发送消息失败`, err);
            }
            return undefined;
          });
        }
        return undefined;
      }).filter(p => p !== undefined);
      
      await Promise.all(promises);
    } catch (error) {
      logger.error('广播消息到所有标签页失败', error);
      throw error;
    }
  }
  
  /**
   * 在内容脚本中注册消息处理器
   * @param handler 处理函数
   */
  static registerContentHandler<T = any, R = any>(
    handler: (message: any, sender: browser.Runtime.MessageSender) => Promise<R> | R
  ): void {

  }
  
  /**
   * 在后台脚本中注册消息处理器
   * @param handler 处理函数
   */
  static registerBackgroundHandler<T = any, R = any>(
    handler: (message: any, sender: browser.Runtime.MessageSender) => Promise<R> | R
  ): void {
    
    
  }
  
  /**
   * 创建消息对象
   * @param type 消息类型
   * @param data 消息数据
   * @returns 消息对象
   */
  static createMessage<T = any>(type: string, data?: T): Message<T> {
    return {
      type: type as any,
      data
    };
  }
} 