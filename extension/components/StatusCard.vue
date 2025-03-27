<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCaptchaStore } from '../stores/captcha';
import type { CaptchaType } from '../types';

const captchaStore = useCaptchaStore();
const serverStatus = ref('online'); // 可能的值: online, offline, loading

// 计算属性
const hasInfoSet = computed(() => captchaStore.hasInfoSet);
const serverStatusType = computed(() => {
  if (serverStatus.value === 'online') return 'success';
  if (serverStatus.value === 'offline') return 'danger';
  return 'warning';
});
const captchaType = computed(() => captchaStore.currentInfoSet?.captchaType || '');

// 验证码类型信息
const captchaTypeInfo = computed(() => {
  const types: Record<CaptchaType, { label: string; icon: string }> = {
    text: { 
      label: '文字验证码', 
      icon: 'Document' 
    },
    slider: { 
      label: '滑块验证码', 
      icon: 'DCaret' 
    },
    click: { 
      label: '点选验证码', 
      icon: 'Pointer' 
    },
    rotate: { 
      label: '旋转验证码', 
      icon: 'RefreshRight' 
    }
  };
  
  return captchaType.value ? types[captchaType.value as CaptchaType] : null;
});
</script>

<template>
  <div class="status-card">
    <div class="status-item">
      <div class="status-icon" :class="serverStatusType">
        <el-icon v-if="serverStatus === 'online'"><check /></el-icon>
        <el-icon v-else-if="serverStatus === 'offline'"><close /></el-icon>
        <el-icon v-else><loading /></el-icon>
      </div>
      <div class="status-info">
        <div class="status-label">服务器状态</div>
        <div class="status-value" :class="serverStatusType">
          {{ serverStatus === 'online' ? '在线' : serverStatus === 'offline' ? '离线' : '连接中' }}
        </div>
      </div>
    </div>

    <div class="status-item">
      <div class="status-icon" :class="hasInfoSet ? 'success' : 'warning'">
        <el-icon v-if="hasInfoSet"><aim /></el-icon>
        <el-icon v-else><warning /></el-icon>
      </div>
      <div class="status-info">
        <div class="status-label">验证码定位</div>
        <div class="status-value" :class="hasInfoSet ? 'success' : 'warning'">
          {{ hasInfoSet ? '已定位' : '未定位' }}
        </div>
      </div>
    </div>

    <div class="status-item" v-if="hasInfoSet">
      <div class="status-icon">
        <el-icon v-if="captchaTypeInfo?.icon">
          <component :is="captchaTypeInfo.icon" />
        </el-icon>
      </div>
      <div class="status-info">
        <div class="status-label">验证码类型</div>
        <div class="status-value">
          {{ captchaTypeInfo?.label || '未知' }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  background-color: #f5f7fa;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #ebeef5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.status-icon.success {
  background-color: #f0f9eb;
  color: #67c23a;
}

.status-icon.warning {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.status-icon.danger {
  background-color: #fef0f0;
  color: #f56c6c;
}

.status-info {
  display: flex;
  flex-direction: column;
}

.status-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
}

.status-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.status-value.success {
  color: #67c23a;
}

.status-value.warning {
  color: #e6a23c;
}

.status-value.danger {
  color: #f56c6c;
}

@media (max-width: 360px) {
  .status-card {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style> 