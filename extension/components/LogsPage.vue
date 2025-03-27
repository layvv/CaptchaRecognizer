<script setup lang="ts">
import { ref } from 'vue';

// 日志类型定义
type LogType = 'success' | 'info' | 'warning' | 'error';

interface LogEntry {
  id: number;
  type: LogType;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

// 模拟日志数据
const logs = ref<LogEntry[]>([
  {
    id: 1,
    type: 'success',
    message: '成功识别验证码: 1A2B',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    details: { confidence: 0.95, processingTime: 120 }
  },
  {
    id: 2,
    type: 'info',
    message: '获取网站验证码信息',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    details: { websiteUrl: 'https://example.com/login' }
  },
  {
    id: 3,
    type: 'warning',
    message: '验证码识别置信度低',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    details: { confidence: 0.45, result: 'X7Y9' }
  },
  {
    id: 4,
    type: 'error',
    message: '无法连接到服务器',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    details: { apiUrl: 'http://localhost:8000/api/captcha/recognize' }
  }
]);

// 日志类型图标映射
const typeIconMap: Record<LogType, string> = {
  'success': 'check-circle',
  'info': 'info',
  'warning': 'warning',
  'error': 'circle-close'
};

// 日志类型颜色映射
const typeColorMap: Record<LogType, string> = {
  'success': 'var(--el-color-success)',
  'info': 'var(--el-color-primary)',
  'warning': 'var(--el-color-warning)',
  'error': 'var(--el-color-danger)'
};

// 格式化时间
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

// 清除日志
const clearLogs = () => {
  logs.value = [];
};

// 格式化详情显示
const formatDetailKey = (key: string): string => {
  // 转换键名为更友好的显示名称
  const keyMap: Record<string, string> = {
    'confidence': '置信度',
    'processingTime': '处理时间',
    'websiteUrl': '网站地址',
    'result': '识别结果',
    'apiUrl': 'API地址'
  };
  
  return keyMap[key] || key;
};

// 格式化详情值
const formatDetailValue = (key: string, value: any): string => {
  if (key === 'confidence') {
    return (value * 100).toFixed(1) + '%';
  }
  if (key === 'processingTime') {
    return value + 'ms';
  }
  return String(value);
};
</script>

<template>
  <div class="logs-page">
    <div class="logs-header">
      <h2 class="page-title">操作日志</h2>
      
      <div class="logs-actions">
        <el-button type="primary" size="small" plain>
          <el-icon><refresh /></el-icon>
          刷新
        </el-button>
        
        <el-button type="danger" size="small" plain @click="clearLogs">
          <el-icon><delete /></el-icon>
          清空
        </el-button>
      </div>
    </div>
    
    <div class="logs-content">
      <el-empty 
        v-if="logs.length === 0" 
        description="暂无日志记录"
        :image-size="80"
      />
      
      <div v-else class="logs-list">
        <div 
          v-for="log in logs" 
          :key="log.id" 
          class="log-item"
          :class="`log-${log.type}`"
        >
          <div class="log-icon" :style="{ color: typeColorMap[log.type] }">
            <el-icon>
              <component :is="typeIconMap[log.type]" />
            </el-icon>
          </div>
          
          <div class="log-content">
            <div class="log-message">{{ log.message }}</div>
            <div class="log-time">{{ formatTime(log.timestamp) }}</div>
            
            <div v-if="log.details" class="log-details">
              <div v-for="(value, key) in log.details" :key="key" class="detail-item">
                <span class="detail-label">{{ formatDetailKey(key) }}:</span>
                <span class="detail-value">{{ formatDetailValue(key, value) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logs-page {
  padding: 16px;
}

.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  font-size: 18px;
  margin: 0;
  color: #303133;
}

.logs-actions {
  display: flex;
  gap: 8px;
}

.logs-content {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  min-height: 200px;
  width: 100%;
  box-sizing: border-box;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.log-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  background-color: #ffffff;
  transition: all 0.3s;
  width: 100%;
  box-sizing: border-box;
}

.log-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.log-success {
  border-left: 3px solid var(--el-color-success);
}

.log-info {
  border-left: 3px solid var(--el-color-primary);
}

.log-warning {
  border-left: 3px solid var(--el-color-warning);
}

.log-error {
  border-left: 3px solid var(--el-color-danger);
}

.log-icon {
  font-size: 18px;
  padding-top: 2px;
  flex-shrink: 0;
}

.log-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.log-message {
  font-size: 14px;
  margin-bottom: 4px;
  color: #303133;
  word-break: break-word;
}

.log-time {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.log-details {
  margin-top: 8px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  overflow: auto;
  max-width: 100%;
}

.detail-item {
  display: flex;
  margin-bottom: 4px;
  font-size: 12px;
  align-items: center;
}

.detail-label {
  font-weight: 500;
  color: #606266;
  margin-right: 6px;
}

.detail-value {
  color: #606266;
}
</style> 