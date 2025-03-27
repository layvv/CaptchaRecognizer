<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@stores/user';
import { LoginForm, RegisterForm } from '@components/auth';

const userStore = useUserStore();
const user = computed(() => userStore.currentUser);
const isLoggedIn = computed(() => userStore.isLoggedIn);

// 登录弹窗
const loginDialogVisible = ref(false);
const activeForm = ref('login');

// 表单切换选项
const formOptions = [
  { value: 'login', label: '登录' },
  { value: 'register', label: '注册' }
];

// 切换到登录表单
const switchToLogin = () => {
  activeForm.value = 'login';
};

// 切换到注册表单
const switchToRegister = () => {
  activeForm.value = 'register';
};

// 打开登录弹窗
const openLoginDialog = () => {
  loginDialogVisible.value = true;
};

// 关闭登录弹窗
const closeLoginDialog = () => {
  loginDialogVisible.value = false;
};

// 登录成功后处理
const handleLoginSuccess = () => {
  closeLoginDialog();
};

// 登出
const handleLogout = () => {
  userStore.logout();
};
</script>

<template>
  <div class="profile-page">
    <h2 class="page-title">我的</h2>
    
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
      
      <!-- 用户相关功能列表 -->
      <div class="feature-list">
        <div class="feature-section">
          <h3 class="section-title">我的记录</h3>
          
          <div class="feature-item">
            <el-icon><histogram /></el-icon>
            <span>使用统计</span>
            <el-icon class="arrow-icon"><arrow-right /></el-icon>
          </div>
          
          <div class="feature-item">
            <el-icon><tickets /></el-icon>
            <span>识别历史</span>
            <el-icon class="arrow-icon"><arrow-right /></el-icon>
          </div>
        </div>
        
        <div class="feature-section">
          <h3 class="section-title">其他</h3>
          
          <div class="feature-item">
            <el-icon><info-filled /></el-icon>
            <span>关于我们</span>
            <el-icon class="arrow-icon"><arrow-right /></el-icon>
          </div>
          
          <div class="feature-item">
            <el-icon><question-filled /></el-icon>
            <span>帮助中心</span>
            <el-icon class="arrow-icon"><arrow-right /></el-icon>
          </div>
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
        
        <el-button type="primary" @click="openLoginDialog">登录/注册</el-button>
      </el-empty>
      
      <!-- 未登录时也显示部分功能 -->
      <div class="feature-section">
        <h3 class="section-title">其他</h3>
        
        <div class="feature-item">
          <el-icon><info-filled /></el-icon>
          <span>关于我们</span>
          <el-icon class="arrow-icon"><arrow-right /></el-icon>
        </div>
        
        <div class="feature-item">
          <el-icon><question-filled /></el-icon>
          <span>帮助中心</span>
          <el-icon class="arrow-icon"><arrow-right /></el-icon>
        </div>
      </div>
    </div>
    
    <!-- 登录/注册弹窗 -->
    <el-dialog
      v-model="loginDialogVisible"
      :title="activeForm === 'login' ? '登录' : '注册'"
      width="80%"
      :before-close="closeLoginDialog"
    >
      <div class="auth-container">
        <div class="auth-header">
          <el-segmented v-model="activeForm" :options="formOptions" />
        </div>
        
        <div class="auth-content">
          <LoginForm 
            v-if="activeForm === 'login'" 
            @register="switchToRegister"
            @login-success="handleLoginSuccess"
          />
          
          <RegisterForm 
            v-else 
            @login="switchToLogin"
            @register-success="handleLoginSuccess"
          />
        </div>
      </div>
    </el-dialog>
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
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
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
  padding: 16px 0;
  margin-bottom: 16px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-section {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 12px 0;
  color: #909399;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  font-size: 14px;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}

.feature-item:last-child {
  border-bottom: none;
}

.feature-item .el-icon {
  font-size: 18px;
  margin-right: 8px;
  color: #909399;
}

.arrow-icon {
  margin-left: auto;
  color: #c0c4cc;
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.auth-content {
  padding: 0;
}
</style> 