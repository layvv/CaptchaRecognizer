import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import 'element-plus/dist/index.css';
import App from './App.vue';

// 创建应用实例
const app = createApp(App);

// 注册ElementPlus
app.use(ElementPlus);

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 状态管理
const pinia = createPinia();
app.use(pinia);

// 挂载应用
app.mount('#app'); 