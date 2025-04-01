import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: '验证码识别器',
    description: '基于深度学习的验证码识别浏览器插件',
    permissions: [
      'storage',
      'tabs',
      'activeTab',
      'clipboardRead',
      'scripting'
    ],
    host_permissions: ['<all_urls>'],
  },
  modules: ['@wxt-dev/module-vue'],
  alias: {
    '@': '.',
  },
});
