import { defineExtensionMessaging } from '@webext-core/messaging';
import { MessagingProtocol } from '@/types/messaging';


/**
 * 扩展消息服务
 */
export const {onMessage, sendMessage} = defineExtensionMessaging<MessagingProtocol>();

