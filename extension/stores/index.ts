// 状态管理统一导出
import { createPinia } from 'pinia';
import { createPersistedState } from 'pinia-plugin-persistedstate';

// 导出各个store
export * from './user';
export * from './captcha';
export * from './logs';
export * from './settings';

// 创建pinia实例并配置持久化插件
export function setupStore() {
  const pinia = createPinia();
  pinia.use(createPersistedState({
    storage: localStorage,
    key: (id) => `captcha_recognizer_${id}`
  }));
  
  return pinia;
} 