<script setup lang="ts">
import { computed } from 'vue';
import { useCaptchaStore } from '../../stores/captcha';
import type { CaptchaType } from '../../types';

const captchaStore = useCaptchaStore();

// 计算属性
const hasInfoSet = computed(() => captchaStore.hasInfoSet);
const captchaType = computed(() => captchaStore.currentInfoSet?.captchaType || '');
const recognitionResult = computed(() => captchaStore.recognitionResult?.result || '');
const confidence = computed(() => {
  return captchaStore.recognitionResult?.confidence 
    ? (captchaStore.recognitionResult.confidence * 100).toFixed(1) + '%' 
    : '';
});

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

// 状态颜色
const statusColor = computed(() => {
  if (!hasInfoSet.value) return 'var(--el-color-danger)';
  if (recognitionResult.value) return 'var(--el-color-success)';
  return 'var(--el-color-warning)';
});
</script>

<template>
  <el-card class="captcha-status" shadow="hover">
    <template #header>
      <div class="card-header">
        <h3 class="title">验证码状态</h3>
        <el-tag 
          :type="hasInfoSet ? 'success' : 'danger'" 
          size="small"
        >
          {{ hasInfoSet ? '已定位' : '未定位' }}
        </el-tag>
      </div>
    </template>
    
    <div class="status-content">
      <el-empty 
        v-if="!hasInfoSet" 
        description="尚未定位验证码"
        :image-size="80"
      >
        <el-button type="primary" size="small">手动定位</el-button>
      </el-empty>
      
      <template v-else>
        <div class="info-row">
          <span class="label">类型:</span>
          <el-tag 
            v-if="captchaTypeInfo" 
            size="small" 
            effect="plain"
          >
            <el-icon v-if="captchaTypeInfo.icon">
              <component :is="captchaTypeInfo.icon" />
            </el-icon>
            {{ captchaTypeInfo?.label }}
          </el-tag>
        </div>
        
        <div class="info-row">
          <span class="label">状态:</span>
          <span class="value status" :style="{ color: statusColor }">
            <el-icon v-if="recognitionResult">
              <check-circle />
            </el-icon>
            <el-icon v-else>
              <loading />
            </el-icon>
            {{ recognitionResult ? '识别成功' : '等待识别' }}
          </span>
        </div>
        
        <div v-if="recognitionResult" class="info-row">
          <span class="label">结果:</span>
          <el-tag type="success" class="result-tag">{{ recognitionResult }}</el-tag>
          <span class="confidence" v-if="confidence">
            置信度: {{ confidence }}
          </span>
        </div>
      </template>
    </div>
  </el-card>
</template>

<style scoped>
.captcha-status {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 16px;
  margin: 0;
  font-weight: 500;
}

.status-content {
  min-height: 100px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  line-height: 24px;
}

.label {
  width: 54px;
  font-size: 13px;
  color: #909399;
}

.value {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status {
  font-weight: 500;
}

.result-tag {
  letter-spacing: 1px;
  font-family: monospace;
  font-weight: bold;
  margin-right: 8px;
}

.confidence {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
</style> 