<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@stores/user';

const userStore = useUserStore();
const isLoggedIn = computed(() => userStore.isLoggedIn);
const username = computed(() => userStore.currentUser?.username || '');

// 扩展开关状态
const extensionEnabled = ref(true);

// 扩展状态类型
const statusType = computed(() => {
  return extensionEnabled.value ? 'success' : 'danger';
});

// 扩展状态文本
const statusText = computed(() => {
  return extensionEnabled.value ? '运行中' : '已停用';
});

// 处理登出
const handleLogout = () => {
  userStore.logout();
};
</script>

<template>
  <el-header class="app-header">
    <div class="logo-container">
      <img src="/icon/48.png" alt="Logo" class="logo" />
      <h1 class="title">验证码识别器</h1>
    </div>
    
    <div class="header-right">
      <div class="extension-status">
        <el-tag size="medium" :type="statusType" effect="dark">{{ statusText }}</el-tag>
        <el-switch
          v-model="extensionEnabled"
          style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
          size="medium"
          inline-prompt
        />
      </div>
      
      <div class="user-info" v-if="isLoggedIn">
        <el-avatar :size="28" class="avatar">{{ username.charAt(0) }}</el-avatar>
        <span class="username">{{ username }}</span>
      </div>
      
      <!-- 右侧自定义插槽 -->
      <slot name="right"></slot>
    </div>
  </el-header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  padding: 0 16px;
  background-color: var(--el-color-primary);
  color: #fff;
}

.logo-container {
  display: flex;
  align-items: center;
}

.logo {
  width: 24px;
  height: 24px;
  margin-right: 8px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #fff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.extension-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.username {
  font-size: 14px;
  color: #fff;
}

.avatar {
  background-color: #fff;
  color: var(--el-color-primary);
}
</style> 