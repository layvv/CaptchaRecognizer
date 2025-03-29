import { defineBackground } from 'wxt/sandbox';
import { StorageUtil } from '@/utils/storage';
import { StorageKey } from '@/types';
import { Logger } from '@/utils/logger';
import { MessagingUtil } from '@/utils/messaging';
import { MessageType } from '@/types';
import { createPinia, setActivePinia } from 'pinia';
import {
  handleGetCaptchaRecord, handleGetSettings,
  handleRecognizeCaptcha, handleReportResult,
  handleSaveCaptchaRecord, handleSaveSettings, handleSetHighlighting
} from "@/entrypoints/background/handlers";

// 创建并激活Pinia实例
const pinia = createPinia();
setActivePinia(pinia);

// 创建日志记录器
const logger = new Logger('Background');

function handleMessage(message: any, tabId?: number){
  switch (message.type) {
  }
}

export default defineBackground({
  main() {
    logger.info('后台服务正在初始化...');
    // 配置消息监听器
    browser.runtime.onMessage.addListener(async (message: any, sender: any) => {
      // 检查消息类型以确保是我们期望的消息
      if (message && typeof message === 'object' && 'type' in message) {
          logger.info(`后台脚本收到消息: ${message.type}`, message.data)
          try {
            await handleMessage(message, sender.tab?.id)
          } catch (error) {
            console.error(`处理消息 ${message.type} 失败:`, error);
          }
      }
    });
  }
}); 