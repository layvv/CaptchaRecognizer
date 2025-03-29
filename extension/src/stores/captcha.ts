import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { StorageKey } from '../types';
import { CaptchaRecord } from '../types/captcha';
import { StorageUtil } from '../utils/storage';

/**
 * 验证码记录管理
 */
export const useCaptchaStore = defineStore('captcha', () => {
  // 验证码记录
  const records = reactive<CaptchaRecord[]>([]);
  const currentRecord = ref<CaptchaRecord | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  /**
   * 加载所有验证码记录
   */
  async function loadRecords() {
    isLoading.value = true;
    error.value = null;
    
    try {
      const savedRecords = await StorageUtil.getItem<CaptchaRecord[]>(StorageKey.CAPTCHA_RECORDS, []);
      // 确保savedRecords是数组
      const recordsArray = Array.isArray(savedRecords) ? savedRecords : [];
      
      // 清空并重新填充记录
      records.splice(0, records.length);
      recordsArray.forEach(record => records.push(record));
      
      isLoading.value = false;
      return records;
    } catch (err) {
      console.error('加载验证码记录失败:', err);
      error.value = err instanceof Error ? err.message : String(err);
      isLoading.value = false;
      return [];
    }
  }
  
  /**
   * 保存验证码记录
   */
  async function saveRecords() {
    isLoading.value = true;
    error.value = null;
    
    try {
      await StorageUtil.saveItem(StorageKey.CAPTCHA_RECORDS, records);
      await StorageUtil.saveItem(StorageKey.LAST_UPDATED, new Date().toISOString());
      
      isLoading.value = false;
      return true;
    } catch (err) {
      console.error('保存验证码记录失败:', err);
      error.value = err instanceof Error ? err.message : String(err);
      isLoading.value = false;
      return false;
    }
  }
  
  /**
   * 根据URL获取验证码记录
   * @param url 页面URL
   */
  function getRecordByUrl(url: string): CaptchaRecord | null {
    return records.find(record => record.url === url) || null;
  }
  
  /**
   * 根据URL获取验证码记录，用于API调用
   * 该方法主要供后台脚本调用
   * @param url 页面URL
   */
  async function getCaptchaRecordByUrl(url: string): Promise<CaptchaRecord | null> {
    // 如果记录为空，先加载记录
    if(records.length === 0) {
      await loadRecords();
    }
    return getRecordByUrl(url);
  }
  
  /**
   * 加载当前页面的验证码记录
   * @param url 当前页面URL
   */
  async function loadRecordForCurrentPage(url: string): Promise<CaptchaRecord | null> {
    try {
      // 先尝试加载所有记录
      await loadRecords();
      
      // 根据URL查找记录
      const record = getRecordByUrl(url);
      
      // 设置当前记录
      if (record) {
        currentRecord.value = record;
      } else {
        currentRecord.value = null;
      }
      
      return currentRecord.value;
    } catch (error) {
      console.error('加载当前页面记录失败:', error);
      return null;
    }
  }
  
  /**
   * 保存或更新单个验证码记录
   * @param record 验证码记录
   */
  async function saveRecord(record: CaptchaRecord) {
    // 查找是否已有该记录
    const index = records.findIndex(r => r.url === record.url);
    
    if (index !== -1) {
      // 更新现有记录
      records[index] = record;
    } else {
      // 添加新记录
      records.push(record);
    }
    
    // 更新当前记录
    currentRecord.value = record;
    
    // 保存到存储
    return await saveRecords();
  }
  
  /**
   * 删除验证码记录
   * @param url 页面URL
   */
  async function deleteRecord(url: string) {
    const index = records.findIndex(record => record.url === url);
    
    if (index !== -1) {
      records.splice(index, 1);
      
      // 清空当前记录（如果被删除的是当前记录）
      if (currentRecord.value?.url === url) {
        currentRecord.value = null;
      }
      
      // 保存到存储
      return await saveRecords();
    }
    
    return true;
  }
  
  /**
   * 清空所有验证码记录
   */
  async function clearAllRecords() {
    records.splice(0, records.length);
    currentRecord.value = null;
    
    // 保存到存储
    return await saveRecords();
  }
  
  /**
   * 设置当前验证码记录
   * @param record 验证码记录
   */
  function setCurrentRecord(record: CaptchaRecord | null) {
    currentRecord.value = record;
  }
  
  /**
   * 重置验证码记录的成功次数
   * @param url 页面URL
   */
  async function resetSuccessCount(url: string) {
    const record = records.find(r => r.url === url);
    
    if (record) {
      record.successCount = 0;
      return await saveRecords();
    }
    
    return false;
  }
  
  /**
   * 更新验证码记录的成功次数
   * @param url 页面URL
   * @param success 是否成功
   */
  async function updateSuccessCount(url: string, success: boolean) {
    const record = records.find(r => r.url === url);
    
    if (record) {
      if (success) {
        record.successCount = (record.successCount || 0) + 1;
        record.errorCount = 0;
      } else {
        record.errorCount = (record.errorCount || 0) + 1;
      }
      
      return await saveRecords();
    }
    
    return false;
  }
  
  // 初始化时加载记录
  loadRecords();
  
  // 暴露状态和操作
  return {
    records,
    currentRecord,
    isLoading,
    error,
    loadRecords,
    saveRecords,
    getRecordByUrl,
    getCaptchaRecordByUrl,
    saveRecord,
    deleteRecord,
    clearAllRecords,
    setCurrentRecord,
    resetSuccessCount,
    updateSuccessCount,
    loadRecordForCurrentPage
  };
}); 