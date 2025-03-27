<script setup lang="ts">
import { computed } from 'vue';
import { useCaptchaStore } from '../stores/captcha';

const captchaStore = useCaptchaStore();
const recognitionResult = computed(() => captchaStore.recognitionResult?.result || '');
const confidence = computed(() => {
  return captchaStore.recognitionResult?.confidence 
    ? (captchaStore.recognitionResult.confidence * 100).toFixed(1) + '%' 
    : '';
});
const processingTime = computed(() => {
  return captchaStore.recognitionResult?.processingTime
    ? captchaStore.recognitionResult.processingTime.toFixed(2) + 'ms'
    : '';
});
</script>

<template>
  <div class="result-card" v-if="recognitionResult">
    <div class="result-header">
      <h3 class="title">识别结果</h3>
      <el-tag type="success" size="small">成功</el-tag>
    </div>
    
    <div class="result-content">
      <div class="result-value">{{ recognitionResult }}</div>
      
      <div class="result-info">
        <el-tag size="small" effect="plain" v-if="confidence">
          置信度: {{ confidence }}
        </el-tag>
        <el-tag size="small" effect="plain" type="info" v-if="processingTime">
          耗时: {{ processingTime }}
        </el-tag>
      </div>
      
      <div class="result-actions">
        <el-button size="small" text type="primary">
          <el-icon><copy-document /></el-icon>
          复制结果
        </el-button>
        <el-button size="small" text type="success">
          <el-icon><check /></el-icon>
          标记正确
        </el-button>
        <el-button size="small" text type="danger">
          <el-icon><close /></el-icon>
          标记错误
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-card {
  background-color: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
  margin-top: 16px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.title {
  font-size: 14px;
  margin: 0;
  font-weight: 500;
  color: #303133;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  letter-spacing: 2px;
  font-family: monospace;
  text-align: center;
  padding: 8px 0;
}

.result-info {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
</style> 