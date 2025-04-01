import { createApp } from 'vue';
import { onMessage } from '@/services/messaging';
import { loggerService } from '@/services/logger';
import App from './App.vue';
import { setupContentScriptState } from './state';

/**
 * 内容脚本主体
 * 使用Vue组件和Shadow DOM实现UI
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  // 设置CSS注入模式为ui，避免样式泄漏
  cssInjectionMode: 'ui',

  async main(ctx) {
    loggerService.info('内容脚本启动');
    
    // 初始化状态管理
    const state = setupContentScriptState();
    
    // 创建基于Shadow DOM的UI
    const ui = await createShadowRootUi(ctx, {
      name: 'captcha-recognizer-ui',
      position: 'overlay',
      anchor: 'body',
      onMount: (container) => {
        // 将Vue应用挂载到Shadow DOM容器中
        const app = createApp(App);
        // 提供状态对象给组件使用
        app.provide('appState', state);
        app.mount(container);
        return app;
      },
      onRemove: (app) => {
        // 当UI被移除时卸载应用
        app?.unmount?.();
      },
    });
    
    // 挂载UI
    ui.mount();
    
    // 设置消息监听
    setupMessageListeners(state);
    
    // 返回清理函数
    return () => {
      ui.remove();
    };
  }
});

/**
 * 设置消息监听
 */
function setupMessageListeners(state: ReturnType<typeof setupContentScriptState>) {
  // 监听来自后台脚本的消息
  onMessage('startSelectCaptcha', () => {
    loggerService.info('接收到开始选择验证码的消息');
    state.startSelecting();
  });
  
  onMessage('stopSelectCaptcha', () => {
    loggerService.info('接收到停止选择验证码的消息');
    state.stopSelecting();
  });
}
