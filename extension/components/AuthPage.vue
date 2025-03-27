<script setup lang="ts">
import { ref } from 'vue';
import LoginForm from './LoginForm.vue';
import RegisterForm from './RegisterForm.vue';

const activeForm = ref('login');

// 表单切换选项
const formOptions = [
  {
    value: 'login',
    label: '登录'
  },
  {
    value: 'register',
    label: '注册'
  }
];

const switchToLogin = () => {
  activeForm.value = 'login';
};

const switchToRegister = () => {
  activeForm.value = 'register';
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-header">
        <el-segmented v-model="activeForm" :options="formOptions" />
      </div>
      
      <div class="auth-content">
        <LoginForm 
          v-if="activeForm === 'login'" 
          @register="switchToRegister" 
        />
        
        <RegisterForm 
          v-else 
          @login="switchToLogin" 
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  padding: 16px;
}

.auth-container {
  background-color: #f5f7fa;
  border-radius: 6px;
  padding: 20px;
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.auth-content {
  padding: 0;
}
</style> 