import { defineStore } from 'pinia';
import { ref } from 'vue';

// 设置状态存储
export const useSettingsStore = defineStore('settings', () => {
  // 设置选项
  const theme = ref<'light' | 'dark' | 'auto'>('light');
  const apiEndpoint = ref<string>('http://localhost:8000');
  const autoRecognize = ref<boolean>(true);
  const autoFill = ref<boolean>(true);
  const showNotifications = ref<boolean>(true);
  const maxRetries = ref<number>(3);
  const logLevel = ref<'debug' | 'info' | 'warn' | 'error'>('info');

  // 重置设置为默认值
  function resetSettings() {
    theme.value = 'light';
    apiEndpoint.value = 'http://localhost:8000';
    autoRecognize.value = true;
    autoFill.value = true;
    showNotifications.value = true;
    maxRetries.value = 3;
    logLevel.value = 'info';
  }

  return {
    theme,
    apiEndpoint,
    autoRecognize,
    autoFill,
    showNotifications,
    maxRetries,
    logLevel,
    resetSettings
  };
}, {
  // 启用状态持久化
  persist: true
}); 