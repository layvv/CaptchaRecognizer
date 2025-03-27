// API类型统一导出

export * from './user';
export * from './captcha';
export * from './common';

// 统一API路径
import { USER_API_PATHS } from './user';
import { CAPTCHA_API_PATHS } from './captcha';
import { COMMON_API_PATHS } from './common';

export const API_PATHS = {
  ...USER_API_PATHS,
  ...CAPTCHA_API_PATHS,
  ...COMMON_API_PATHS
}; 