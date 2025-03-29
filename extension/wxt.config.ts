import { defineConfig } from 'wxt';
import { resolve } from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-vue'],
  srcDir: "src",
  manifest: {
    name: "验证码识别助手",
    description: "基于深度学习的验证码识别浏览器扩展",
    permissions: [
      "storage",
      "tabs",
      "activeTab"
    ],
    host_permissions: [
      "<all_urls>"
    ]
  },
  vite: () => ({
    resolve: {
      alias: {
        '@': resolve(__dirname, './src')
      }
    }
  })
});
