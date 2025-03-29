import { defineStore } from 'pinia';
import { reactive, ref, computed, watch } from 'vue';
import { StorageKey } from '../types';
import { AppSettings } from '../types/settings';
import { StorageUtil } from '../utils/storage';

// 默认设置
const DEFAULT_SETTINGS: AppSettings = {
  enabled: true,
  autoSolve: true,
  highlightCaptcha: true,
  useLocalCache: true,
  apiUrl: 'http://localhost:8000/api',
  apiTimeout: 10000,
  debugMode: false,
  maxErrorCount: 3,
  theme: 'light'
};

/**
 * 设置状态管理
 */
export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const settings = reactive<AppSettings>({ ...DEFAULT_SETTINGS });
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  /**
   * 加载设置
   */
  async function loadSettings() {
    isLoading.value = true;
    error.value = null;
    
    try {
      // 从存储中获取设置
      const savedSettings = await StorageUtil.getItem<AppSettings>(StorageKey.SETTINGS, DEFAULT_SETTINGS);
      
      // 合并默认设置和保存的设置
      Object.assign(settings, { ...DEFAULT_SETTINGS, ...savedSettings });
      
      isLoading.value = false;
      return settings;
    } catch (err) {
      console.error('加载设置失败:', err);
      error.value = err instanceof Error ? err.message : String(err);
      isLoading.value = false;
      return { ...DEFAULT_SETTINGS };
    }
  }
  
  /**
   * 保存设置
   */
  async function saveSettings() {
    isLoading.value = true;
    error.value = null;
    
    try {
      // 保存设置到存储
      await StorageUtil.saveItem(StorageKey.SETTINGS, settings);
      
      isLoading.value = false;
      return true;
    } catch (err) {
      console.error('保存设置失败:', err);
      error.value = err instanceof Error ? err.message : String(err);
      isLoading.value = false;
      return false;
    }
  }
  
  /**
   * 更新设置
   * @param newSettings 要更新的设置
   */
  async function updateSettings(newSettings: Partial<AppSettings>) {
    // 更新设置
    Object.assign(settings, newSettings);
    
    // 保存到存储
    return await saveSettings();
  }
  
  /**
   * 重置设置为默认值
   */
  async function resetSettings() {
    // 恢复默认设置
    Object.assign(settings, DEFAULT_SETTINGS);
    
    // 保存到存储
    return await saveSettings();
  }
  
  // 计算属性：是否已启用
  const isEnabled = computed(() => settings.enabled);
  // 计算属性：是否自动填充
  const isAutoFill = computed(() => settings.autoSolve);
  // 计算属性：是否高亮验证码
  const isHighlightCaptcha = computed(() => settings.highlightCaptcha);
  // 计算属性：是否使用本地缓存
  const isUseLocalCache = computed(() => settings.useLocalCache);
  // 计算属性：是否开启调试模式
  const isDebugMode = computed(() => settings.debugMode);
  // 计算属性：主题
  const theme = computed(() => settings.theme);
  // 计算属性：API URL
  const apiUrl = computed(() => settings.apiUrl);
  // 计算属性：API 超时时间
  const apiTimeout = computed(() => settings.apiTimeout);
  // 计算属性：最大错误次数
  const maxErrorCount = computed(() => settings.maxErrorCount);
  
  // 初始化时加载设置
  loadSettings();
  
  // 监听设置变化，自动保存
  watch(settings, (newSettings) => {
    saveSettings();
  }, { deep: true });
  
  // 暴露状态和操作
  return {
    settings,
    isLoading,
    error,
    loadSettings,
    saveSettings,
    updateSettings,
    resetSettings,
    isEnabled,
    isAutoFill,
    isHighlightCaptcha,
    isUseLocalCache,
    isDebugMode,
    theme,
    apiUrl,
    apiTimeout,
    maxErrorCount
  };
}); 