<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useUserStore } from '../stores/user';
import type { FormInstance, FormRules } from 'element-plus';

const emit = defineEmits(['register', 'login-success']);

const userStore = useUserStore();
const formRef = ref<FormInstance>();
const loading = ref(false);

// 表单数据
const loginForm = reactive({
  username: '',
  password: '',
});

// 表单验证规则
const rules = reactive<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码长度为6-30个字符', trigger: 'blur' }
  ]
});

// 处理登录
const handleLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  
  try {
    await formEl.validate();
    loading.value = true;
    
    await userStore.login({
      username: loginForm.username,
      password: loginForm.password
    });
    
    emit('login-success');
  } catch (error) {
    // 错误会通过userStore.error显示
    console.error('登录失败:', error);
  } finally {
    loading.value = false;
  }
};

// 切换到注册
const switchToRegister = () => {
  emit('register');
};
</script>

<template>
  <div class="login-form">
    <h2 class="form-title">登录账号</h2>
    
    <el-alert
      v-if="userStore.error"
      :title="userStore.error"
      type="error"
      :closable="false"
      show-icon
      class="login-error"
    />
    
    <el-form
      ref="formRef"
      :model="loginForm"
      :rules="rules"
      label-position="top"
      @keyup.enter="handleLogin(formRef)"
    >
      <el-form-item label="用户名" prop="username">
        <el-input 
          v-model="loginForm.username"
          placeholder="请输入用户名"
          prefix-icon="User"
        />
      </el-form-item>
      
      <el-form-item label="密码" prop="password">
        <el-input 
          v-model="loginForm.password"
          type="password"
          placeholder="请输入密码"
          show-password
          prefix-icon="Lock"
        />
      </el-form-item>
      
      <div class="form-actions">
        <el-button 
          type="primary" 
          :loading="loading" 
          @click="handleLogin(formRef)"
          class="submit-btn"
        >
          登录
        </el-button>
      </div>
      
      <div class="form-footer">
        <span>还没有账号？</span>
        <el-button 
          link 
          type="primary" 
          @click="switchToRegister"
        >
          立即注册
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.login-form {
  padding: 16px 8px;
}

.form-title {
  text-align: center;
  margin-bottom: 24px;
  font-size: 20px;
  color: var(--el-color-primary);
}

.login-error {
  margin-bottom: 16px;
}

.form-actions {
  margin-top: 24px;
}

.submit-btn {
  width: 100%;
}

.form-footer {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: #606266;
}
</style> 