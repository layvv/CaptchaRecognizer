import { defineConfig } from 'wxt';
import { resolve } from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    resolve: {
      alias: {
        '@': resolve(__dirname, './'),
        '@components': resolve(__dirname, './components'),
        '@stores': resolve(__dirname, './stores'),
        '@composables': resolve(__dirname, './composables'),
        '@types': resolve(__dirname, './types'),
        '@pages': resolve(__dirname, './entrypoints/popup/pages')
      }
    }
  })
});
