/**
 * 获取或生成用户UUID
 * @returns {string} 用户唯一标识
 */
export function getUUID() {
  // 生成随机UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 获取当前用户ID
 * @returns {Promise<string>} 用户ID
 */
export async function getUserID() {
  return new Promise((resolve) => {
    chrome.storage.local.get('userId', (result) => {
      let id = result.userId;
      if (!id) {
        id = getUUID();
        chrome.storage.local.set({ userId: id });
      }
      resolve(id);
    });
  });
}

/**
 * 检查用户权限
 * @param {string} permission 权限名称
 * @returns {Promise<boolean>} 是否有权限
 */
export async function checkPermission(permission) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userRole', 'permissions'], (result) => {
      const { userRole, permissions } = result;
      
      // 如果未登录，没有任何权限
      if (!userRole) {
        resolve(false);
        return;
      }
      
      // 管理员拥有全部权限
      if (userRole === 'admin') {
        resolve(true);
        return;
      }
      
      // 检查特定权限
      const userPermissions = permissions || [];
      resolve(userPermissions.includes(permission));
    });
  });
}

/**
 * 记录用户操作
 * @param {string} action 操作名称
 * @param {object} details 操作详情
 */
export async function logUserAction(action, details = {}) {
  const userId = await getUserID();
  const timestamp = new Date().toISOString();
  
  const actionLog = {
    userId,
    action,
    details,
    timestamp,
    url: window.location.href,
    userAgent: navigator.userAgent
  };
  
  // 保存到本地
  chrome.storage.local.get('userActions', (result) => {
    const actions = result.userActions || [];
    actions.push(actionLog);
    
    // 限制本地保存的操作日志数量
    const maxActions = 100;
    if (actions.length > maxActions) {
      actions.splice(0, actions.length - maxActions);
    }
    
    chrome.storage.local.set({ userActions: actions });
  });
  
  // 可选：发送到服务器进行记录
  try {
    await fetch('http://localhost:8000/v1/log/user-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(actionLog)
    });
  } catch (error) {
    console.warn('无法将用户操作发送到服务器', error);
  }
}