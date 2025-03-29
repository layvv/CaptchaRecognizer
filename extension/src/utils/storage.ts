import { StorageKey } from '../types';
import browser from 'webextension-polyfill';

/**
 * 存储工具类
 * 提供纯粹的底层存储接口
 */
export class StorageUtil {
  /**
   * 保存值到存储
   */
  static async saveItem<T>(key: string, value: T): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }

  /**
   * 获取存储值
   */
  static async getItem<T>(key: string, defaultValue: T): Promise<T> {
    const result = await browser.storage.local.get(key);
    return result[key] !== undefined ? (result[key] as T) : defaultValue;
  }

  /**
   * 移除存储项
   */
  static async removeItem(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }

  /**
   * 清空所有存储
   */
  static async clearAll(): Promise<void> {
    await browser.storage.local.clear();
  }

  /**
   * 获取所有存储的键值对
   */
  static async getAllItems(): Promise<Record<string, any>> {
    return await browser.storage.local.get(null);
  }

  /**
   * 获取所有存储的键
   */
  static async getAllKeys(): Promise<string[]> {
    const items = await this.getAllItems();
    return Object.keys(items);
  }

  /**
   * 根据前缀获取所有匹配的键值对
   */
  static async getItemsByPrefix(prefix: string): Promise<Record<string, any>> {
    const allItems = await this.getAllItems();
    const result: Record<string, any> = {};
    
    for (const key in allItems) {
      if (key.startsWith(prefix)) {
        result[key] = allItems[key];
      }
    }
    
    return result;
  }
  
  /**
   * 存储时间戳，用于生成唯一ID等
   */
  static getTimestamp(): number {
    return Date.now();
  }
  
  /**
   * 生成唯一ID
   * @param prefix 前缀
   * @returns 唯一ID
   */
  static generateUniqueId(prefix: string = ''): string {
    return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * 哈希字符串
   * 用于将URL转换为存储键
   * @param str 要哈希的字符串
   * @returns 哈希后的字符串
   */
  static async hashString(str: string): Promise<string> {
    // 创建简单哈希，不需要加密级别的强度
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    // 返回前缀加上16进制的哈希值
    return `url_${Math.abs(hash).toString(16)}`;
  }
  
  /**
   * 尝试解析存储值，如果失败则返回默认值
   */
  static tryParse<T>(data: string, defaultValue: T): T {
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      return defaultValue;
    }
  }
  
  /**
   * 检查键是否存在
   */
  static async hasKey(key: string): Promise<boolean> {
    const result = await browser.storage.local.get(key);
    return result[key] !== undefined;
  }
} 