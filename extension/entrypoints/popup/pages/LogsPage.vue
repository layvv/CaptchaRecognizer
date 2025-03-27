<script setup lang="ts">
import { ref, computed } from 'vue';
import { useLogsStore } from '../../../stores';
import { LogLevel, LogContextType, type LogEntry } from '../../../types';

// 获取日志存储
const logsStore = useLogsStore();

// 日志筛选条件
const filterLevel = ref<LogLevel | null>(null);
const filterContextType = ref<LogContextType | null>(null);
const filterTag = ref<string>('');
const searchText = ref<string>('');

// 选择显示的日志详情
const selectedLog = ref<LogEntry | null>(null);
const dialogVisible = ref<boolean>(false);

// 根据筛选条件过滤日志
const filteredLogs = computed(() => {
  let result = logsStore.logs;
  
  // 按级别筛选
  if (filterLevel.value) {
    result = result.filter(log => log.level === filterLevel.value);
  }
  
  // 按上下文类型筛选
  if (filterContextType.value) {
    result = result.filter(log => log.context.type === filterContextType.value);
  }
  
  // 按标签筛选
  if (filterTag.value) {
    result = result.filter(log => log.context.tags?.includes(filterTag.value));
  }
  
  // 文本搜索
  if (searchText.value) {
    const searchLower = searchText.value.toLowerCase();
    result = result.filter(log => 
      log.message.toLowerCase().includes(searchLower) || 
      JSON.stringify(log.context.data).toLowerCase().includes(searchLower)
    );
  }
  
  return result;
});

// 日志类型图标映射
const typeIconMap: Record<LogLevel, string> = {
  'success': 'check-circle',
  'info': 'info',
  'warning': 'warning',
  'error': 'circle-close',
  'debug': 'monitor'
};

// 上下文类型图标映射
const contextTypeIconMap: Record<LogContextType, string> = {
  'api': 'connection',
  'captcha': 'picture',
  'recognition': 'cpu',
  'user': 'user',
  'system': 'setting'
};

// 日志类型颜色映射
const typeColorMap: Record<LogLevel, string> = {
  'success': 'var(--el-color-success)',
  'info': 'var(--el-color-primary)',
  'warning': 'var(--el-color-warning)',
  'error': 'var(--el-color-danger)',
  'debug': 'var(--el-color-info)'
};

// 格式化时间
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// 清除日志
const clearLogs = () => {
  ElMessageBox.confirm('确定要清空所有日志记录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    logsStore.clearLogs();
    ElMessage({
      type: 'success',
      message: '日志已清空'
    });
  }).catch(() => {});
};

// 刷新日志
const refreshLogs = () => {
  // 这里可以添加从后端获取最新日志的逻辑
  ElMessage({
    type: 'success',
    message: '日志已刷新'
  });
};

// 查看日志详情
const viewLogDetail = (log: LogEntry) => {
  selectedLog.value = log;
  dialogVisible.value = true;
};

// 关闭日志详情
const closeLogDetail = () => {
  selectedLog.value = null;
  dialogVisible.value = false;
};

// 复制日志内容
const copyLogToClipboard = (log: LogEntry) => {
  const logContent = JSON.stringify(log, null, 2);
  navigator.clipboard.writeText(logContent).then(() => {
    ElMessage({
      type: 'success',
      message: '日志已复制到剪贴板'
    });
  }).catch(err => {
    ElMessage({
      type: 'error',
      message: '复制失败: ' + err
    });
  });
};

// 格式化上下文类型显示
const formatContextType = (type: LogContextType): string => {
  const typeMap: Record<LogContextType, string> = {
    'api': 'API请求',
    'captcha': '验证码操作',
    'recognition': '识别过程',
    'user': '用户操作',
    'system': '系统事件'
  };
  return typeMap[type] || type;
};

// 格式化日志级别显示
const formatLogLevel = (level: LogLevel): string => {
  const levelMap: Record<LogLevel, string> = {
    'success': '成功',
    'info': '信息',
    'warning': '警告',
    'error': '错误',
    'debug': '调试'
  };
  return levelMap[level] || level;
};
</script>

<template>
  <div class="logs-page">
    <div class="logs-header">
      <h2 class="page-title">操作日志</h2>
      
      <div class="logs-actions">
        <el-button type="primary" size="small" plain @click="refreshLogs">
          <el-icon><refresh /></el-icon>
          刷新
        </el-button>
        
        <el-button type="danger" size="small" plain @click="clearLogs">
          <el-icon><delete /></el-icon>
          清空
        </el-button>
      </div>
    </div>
    
    <div class="logs-filters">
      <el-input
        v-model="searchText"
        placeholder="搜索日志..."
        clearable
        prefix-icon="Search"
        size="small"
        class="filter-search"
      />
      
      <el-select
        v-model="filterLevel"
        placeholder="日志级别"
        clearable
        size="small"
        class="filter-select"
      >
        <el-option
          v-for="level in Object.values(LogLevel)"
          :key="level"
          :label="formatLogLevel(level)"
          :value="level"
        >
          <div class="filter-option-item">
            <el-icon :style="{ color: typeColorMap[level] }">
              <component :is="typeIconMap[level]" />
            </el-icon>
            <span>{{ formatLogLevel(level) }}</span>
          </div>
        </el-option>
      </el-select>
      
      <el-select
        v-model="filterContextType"
        placeholder="日志类型"
        clearable
        size="small"
        class="filter-select"
      >
        <el-option
          v-for="type in Object.values(LogContextType)"
          :key="type"
          :label="formatContextType(type)"
          :value="type"
        >
          <div class="filter-option-item">
            <el-icon>
              <component :is="contextTypeIconMap[type]" />
            </el-icon>
            <span>{{ formatContextType(type) }}</span>
          </div>
        </el-option>
      </el-select>
    </div>
    
    <div v-if="filteredLogs.length === 0" class="empty-logs">
      <el-empty description="暂无日志记录" :image-size="80">
        <template #description>
          <p>当前没有符合条件的日志记录</p>
        </template>
      </el-empty>
    </div>
    
    <div v-else class="logs-list">
      <div 
        v-for="log in filteredLogs" 
        :key="log.id" 
        class="log-item"
        @click="viewLogDetail(log)"
      >
        <div class="log-icon">
          <el-icon :style="{ color: typeColorMap[log.level] }">
            <component :is="typeIconMap[log.level]" />
          </el-icon>
        </div>
        
        <div class="log-content">
          <div class="log-message">{{ log.message }}</div>
          <div class="log-meta">
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <span class="log-type">{{ formatContextType(log.context.type) }}</span>
          </div>
        </div>
        
        <div class="log-actions">
          <el-button
            size="small"
            text
            circle
            @click.stop="copyLogToClipboard(log)"
          >
            <el-icon><document-copy /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="日志详情"
      width="80%"
      top="10vh"
      @close="closeLogDetail"
    >
      <div v-if="selectedLog" class="log-detail">
        <div class="detail-section">
          <div class="detail-header">基本信息</div>
          <div class="detail-content">
            <div class="detail-item">
              <div class="detail-label">ID:</div>
              <div class="detail-value">{{ selectedLog.id }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">时间:</div>
              <div class="detail-value">{{ formatTime(selectedLog.timestamp) }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">级别:</div>
              <div class="detail-value" :style="{ color: typeColorMap[selectedLog.level] }">
                {{ formatLogLevel(selectedLog.level) }}
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">类型:</div>
              <div class="detail-value">{{ formatContextType(selectedLog.context.type) }}</div>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-header">消息内容</div>
          <div class="detail-content">
            <div class="detail-message">{{ selectedLog.message }}</div>
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-header">上下文数据</div>
          <div class="detail-content">
            <pre class="detail-json">{{ JSON.stringify(selectedLog.context, null, 2) }}</pre>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeLogDetail">关闭</el-button>
          <el-button type="primary" @click="copyLogToClipboard(selectedLog!)">
            复制日志
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.logs-page {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.logs-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-search {
  flex: 1;
  min-width: 150px;
}

.filter-select {
  width: 120px;
}

.filter-option-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logs-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  display: flex;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.log-item:hover {
  background-color: #ecf5ff;
}

.log-icon {
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-message {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-meta {
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-type {
  background-color: #f0f2f5;
  padding: 2px 6px;
  border-radius: 10px;
}

.log-actions {
  display: flex;
  align-items: center;
}

.empty-logs {
  padding: 40px 0;
  text-align: center;
}

/* 日志详情样式 */
.log-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-header {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #409eff;
}

.detail-content {
  background-color: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
}

.detail-item {
  display: flex;
  margin-bottom: 8px;
}

.detail-label {
  width: 80px;
  color: #606266;
  font-size: 14px;
}

.detail-value {
  flex: 1;
  font-size: 14px;
}

.detail-message {
  font-size: 14px;
  line-height: 1.5;
  color: #303133;
  word-break: break-all;
}

.detail-json {
  font-family: monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #606266;
  overflow-x: auto;
  white-space: pre-wrap;
  background-color: #f8f8f8;
  border-radius: 4px;
  padding: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style> 