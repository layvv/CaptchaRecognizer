import { browser } from 'wxt/browser';
import { Settings, CaptchaRecord } from '@/types';

/**
 * 存储服务 - 处理本地缓存和设置
 */
class StorageService {
  private readonly SETTINGS_KEY = 'settings';
  private readonly CAPTCHA_RECORDS_KEY = 'captchaRecords';
  
  // 默认设置
  private readonly defaultSettings: Settings = {
    enabled: true,
    autoRecognize: true,
    maxRetry: 3,
    highlightElement: true,
    theme: 'system',
    enableLog: true,
    logLevel: 'info'
  };

  /**
   * 获取设置
   */
  async getSettings(): Promise<Settings> {
    try {
      const result = await browser.storage.local.get(this.SETTINGS_KEY);
      return result[this.SETTINGS_KEY] as Settings || this.defaultSettings;
    } catch (error) {
      console.error('获取设置失败:', error);
      return this.defaultSettings;
    }
  }

  /**
   * 更新设置
   */
  async saveSettings(settings: Settings): Promise<void> {
    try {
      await browser.storage.local.set({ [this.SETTINGS_KEY]: settings });
    } catch (error) {
      console.error('保存设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取验证码记录
   * @param url 网站URL
   */
  async getCaptchaRecord(url: string): Promise<CaptchaRecord | null> {
    try {
      const result = await browser.storage.local.get(this.CAPTCHA_RECORDS_KEY);
      const records = result[this.CAPTCHA_RECORDS_KEY] as Record<string, CaptchaRecord> || {} as Record<string, CaptchaRecord>;
      
      // 先尝试精确匹配
      if (records[url]) {
        return records[url];
      }
      
      // 如果没有精确匹配，尝试域名匹配或正则匹配
      for (const recordUrl in records) {
        const record = records[recordUrl];
        
        if (record.urlPattern === 'domain') {
          const recordDomain = new URL(recordUrl).hostname;
          const currentDomain = new URL(url).hostname;
          
          if (recordDomain === currentDomain) {
            return record;
          }
        } else if (record.urlPattern === 'regex') {
          try {
            const regex = new RegExp(recordUrl);
            if (regex.test(url)) {
              return record;
            }
          } catch (e) {
            // 忽略无效的正则表达式
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('获取验证码记录失败:', error);
      return null;
    }
  }

  /**
   * 保存验证码记录
   */
  async saveCaptchaRecord(record: CaptchaRecord): Promise<void> {
    try {
      const result = await browser.storage.local.get(this.CAPTCHA_RECORDS_KEY);
      const records = result[this.CAPTCHA_RECORDS_KEY] as Record<string, CaptchaRecord> || {} as Record<string, CaptchaRecord>;
      
      records[record.url] = record;
      
      await browser.storage.local.set({ [this.CAPTCHA_RECORDS_KEY]: records });
    } catch (error) {
      console.error('保存验证码记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有验证码记录
   */
  async getAllCaptchaRecords(): Promise<Record<string, CaptchaRecord>> {
    try {
      const result = await browser.storage.local.get(this.CAPTCHA_RECORDS_KEY);
      return result[this.CAPTCHA_RECORDS_KEY] as Record<string, CaptchaRecord> || {} as Record<string, CaptchaRecord>;
    } catch (error) {
      console.error('获取所有验证码记录失败:', error);
      return {} as Record<string, CaptchaRecord>;
    }
  }

  /**
   * 删除验证码记录
   */
  async deleteCaptchaRecord(url: string): Promise<void> {
    try {
      const result = await browser.storage.local.get(this.CAPTCHA_RECORDS_KEY);
      const records = result[this.CAPTCHA_RECORDS_KEY] as Record<string, CaptchaRecord> || {} as Record<string, CaptchaRecord>;
      
      if (records[url]) {
        delete records[url];
        await browser.storage.local.set({ [this.CAPTCHA_RECORDS_KEY]: records });
      }
    } catch (error) {
      console.error('删除验证码记录失败:', error);
      throw error;
    }
  }

  /**
   * 清除所有验证码记录
   */
  async clearAllCaptchaRecords(): Promise<void> {
    try {
      await browser.storage.local.remove(this.CAPTCHA_RECORDS_KEY);
    } catch (error) {
      console.error('清除所有验证码记录失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const storageService = new StorageService(); 