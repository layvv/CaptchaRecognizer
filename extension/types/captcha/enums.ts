/**
 * 验证码类型枚举
 */
export enum CaptchaType {
  TEXT = 'text',           // 文本验证码
  SLIDER = 'slider',       // 滑块验证码
  CLICK = 'click',         // 点击验证码
  ROTATE = 'rotate',       // 旋转验证码
  PUZZLE = 'puzzle',       // 拼图验证码
  MATH = 'math'            // 计算验证码
}

/**
 * 相关元素类型枚举
 */
export enum RelatedElementType {
  INPUT_FIELD = 'input_field',     // 输入框
  REFRESH_BUTTON = 'refresh_button', // 刷新按钮
  SUBMIT_BUTTON = 'submit_button',   // 提交按钮
  CLOSE_BUTTON = 'close_button',     // 关闭按钮
  CONTAINER = 'container',           // 容器
  INSTRUCTION = 'instruction'        // 指令文本
}

/**
 * 验证码信息集合状态枚举
 */
export enum CaptchaInfoSetStatus {
  PENDING = 'pending',     // 待审核
  APPROVED = 'approved',   // 已批准
  REJECTED = 'rejected',   // 已拒绝
  ARCHIVED = 'archived',   // 已归档
  OUTDATED = 'outdated'    // 已过时
}

/**
 * 特征类型枚举
 */
export enum FeatureType {
  ATTRIBUTE = 'attribute', // 属性特征
  DIMENSION = 'dimension', // 尺寸特征
  CONTEXT = 'context',     // 上下文特征
  KEYWORD = 'keyword'      // 关键词特征
} 