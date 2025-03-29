import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import App from './App.vue';
import 'element-plus/dist/index.css';
import './style.css';

// 创建Vue应用
const app = createApp(App);

// 使用插件
app.use(createPinia());
app.use(ElementPlus);

// 挂载应用
app.mount('#app'); 