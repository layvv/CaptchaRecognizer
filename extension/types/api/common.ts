// 通用API接口定义

// 错误响应
export type ErrorResponse = {
  code: number;
  message: string;
  details?: Record<string, any>;
};

// 统计与反馈API路径
export const COMMON_API_PATHS = {
  FEEDBACK: '/api/feedback',
  STATS: '/api/stats'
}; 