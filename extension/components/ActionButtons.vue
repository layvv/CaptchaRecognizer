<script setup lang="ts">
import { useCaptchaStore } from '../stores/captcha';

const captchaStore = useCaptchaStore();

// 立即识别
const handleRecognize = () => {
  // 稍后实现
  console.log('识别验证码');
};

// 手动定位验证码
const handleLocate = () => {
  // 稍后实现
  console.log('定位验证码');
};

// 刷新页面信息
const handleRefresh = () => {
  // 稍后实现
  console.log('刷新页面信息');
};
</script>

<template>
  <div class="action-buttons">
    <!-- 立即识别按钮 -->
    <el-button 
      type="primary" 
      class="action-btn primary-btn" 
      :disabled="!captchaStore.hasInfoSet"
      @click="handleRecognize"
    >
      <el-icon><reading /></el-icon>
      <span>立即识别</span>
    </el-button>
    
    <div class="button-group">
      <!-- 手动定位按钮 -->
      <el-button type="success" class="action-btn secondary-btn" @click="handleLocate">
        <el-icon><aim /></el-icon>
        <span>手动定位</span>
      </el-button>
      
      <!-- 刷新按钮 -->
      <el-button class="action-btn secondary-btn" @click="handleRefresh">
        <el-icon><refresh-right /></el-icon>
        <span>刷新信息</span>
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
}

.primary-btn {
  width: 100%;
}

.button-group {
  display: flex;
  gap: 12px;
  width: 100%;
}

.secondary-btn {
  flex: 1;
  min-width: 0;
}
</style> 