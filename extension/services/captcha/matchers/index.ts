/**
 * 匹配器模块索引
 */
export * from './base';
export * from './char-matcher';
export * from './matcher-registry';

import { MatcherRegistry } from './matcher-registry';

// 创建全局匹配器注册表实例
export const matcherRegistry = new MatcherRegistry(); 