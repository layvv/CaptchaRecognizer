/**
 * UUID工具函数
 */

/**
 * 生成RFC4122版本4兼容的UUID
 * @returns {string} UUID字符串
 */
export function v4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 创建基于时间的UUID (v1-like)
 * 注意：这不是标准的UUID v1实现，但足够满足大多数需求
 * @returns {string} 基于时间的UUID字符串
 */
export function timeBasedUuid() {
  const now = new Date();
  const timestamp = now.getTime();
  const timePart = timestamp.toString(16).padStart(12, '0');
  
  return `${timePart.substr(0, 8)}-${timePart.substr(8, 4)}-1${Math.floor(Math.random() * 0x1000).toString(16).padStart(3, '0')}-${Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')}-${Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0')}`;
}

/**
 * 生成短UUID（16个字符）
 * @returns {string} 短UUID字符串
 */
export function shortId() {
  return Math.random().toString(36).substring(2, 10) + 
         Math.random().toString(36).substring(2, 10);
}

/**
 * 验证字符串是否为有效的UUID v4
 * @param {string} uuid 要验证的UUID字符串
 * @returns {boolean} 是否为有效的UUID v4
 */
export function isValidUuid(uuid) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
} 