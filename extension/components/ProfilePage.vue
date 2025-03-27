<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const user = computed(() => userStore.currentUser);
const isLoggedIn = computed(() => userStore.isLoggedIn);

// 登出
const handleLogout = () => {
  userStore.logout();
};
</script>

<template>
  <div class="profile-page">
    <h2 class="page-title">个人中心</h2>
    
    <div v-if="isLoggedIn">
      <div class="profile-info">
        <div class="profile-header">
          <el-avatar :size="64" class="profile-avatar">
            {{ user?.username.charAt(0).toUpperCase() }}
          </el-avatar>
          <div class="profile-detail">
            <h3 class="username">{{ user?.username }}</h3>
            <p class="email">{{ user?.email }}</p>
          </div>
        </div>
        
        <div class="user-stats">
          <div class="stat-item">
            <div class="stat-value">{{ user?.usageCount || 0 }}</div>
            <div class="stat-label">今日使用次数</div>
          </div>
          
          <div class="stat-item" v-if="userStore.isAdmin">
            <div class="stat-value">
              <el-icon style="font-size: 20px;"><crown /></el-icon>
            </div>
            <div class="stat-label">管理员权限</div>
          </div>
        </div>
        
        <div class="action-buttons">
          <el-button class="action-btn">
            <el-icon><refresh /></el-icon>
            刷新信息
          </el-button>
          
          <el-button class="action-btn" type="danger" @click="handleLogout">
            <el-icon><switch-button /></el-icon>
            退出登录
          </el-button>
        </div>
      </div>
    </div>
    
    <div v-else class="login-prompt">
      <el-empty 
        description="您尚未登录"
        :image-size="100"
      >
        <template #description>
          <p>登录账号以使用更多功能</p>
        </template>
        
        <el-button type="primary">登录</el-button>
        <el-button>注册</el-button>
      </el-empty>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 16px;
}

.page-title {
  font-size: 18px;
  margin: 0 0 16px 0;
  color: #303133;
}

.profile-info {
  background-color: #f5f7fa;
  border-radius: 6px;
  padding: 16px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.profile-avatar {
  background-color: var(--el-color-primary);
  color: #fff;
  font-weight: bold;
}

.profile-detail {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 18px;
  margin: 0 0 4px 0;
  color: #303133;
}

.email {
  font-size: 14px;
  margin: 0;
  color: #909399;
}

.user-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  margin-bottom: 24px;
  border-top: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-prompt {
  padding: 32px 0;
}
</style> 