<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useUserStore } from '../../stores/user';
import type { FormInstance, FormRules } from 'element-plus';

const emit = defineEmits(['login', 'register-success']);

const userStore = useUserStore();
const formRef = ref<FormInstance>();
const loading = ref(false);

// 表单数据
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
});

// 表单验证规则
const validatePass = (rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请输入密码'));
  } else {
    if (registerForm.confirmPassword !== '') {
      formRef.value?.validateField('confirmPassword');
    }
    callback();
  }
};

const validatePass2 = (rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入密码不一致!'));
  } else {
    callback();
  }
};

const rules = reactive<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码长度为6-30个字符', trigger: 'blur' },
    { validator: validatePass, trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validatePass2, trigger: 'blur' }
  ]
});

// 处理注册
const handleRegister = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  
  try {
    await formEl.validate();
    loading.value = true;
    
    await userStore.register({
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password
    });
    
    emit('register-success');
  } catch (error) {
    // 错误会通过userStore.error显示
    console.error('注册失败:', error);
  } finally {
    loading.value = false;
  }
};

// 切换到登录
const switchToLogin = () => {
  emit('login');
};
</script>

<template>
  <div class="register-form">
    <h2 class="form-title">注册账号</h2>
    
    <el-alert
      v-if="userStore.error"
      :title="userStore.error"
      type="error"
      :closable="false"
      show-icon
      class="register-error"
    />
    
    <el-form
      ref="formRef"
      :model="registerForm"
      :rules="rules"
      label-position="top"
      @keyup.enter="handleRegister(formRef)"
    >
      <el-form-item label="用户名" prop="username">
        <el-input 
          v-model="registerForm.username"
          placeholder="请输入用户名"
          prefix-icon="User"
        />
      </el-form-item>
      
      <el-form-item label="邮箱" prop="email">
        <el-input 
          v-model="registerForm.email"
          placeholder="请输入邮箱"
          prefix-icon="Message"
        />
      </el-form-item>
      
      <el-form-item label="密码" prop="password">
        <el-input 
          v-model="registerForm.password"
          type="password"
          placeholder="请输入密码"
          show-password
          prefix-icon="Lock"
        />
      </el-form-item>
      
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input 
          v-model="registerForm.confirmPassword"
          type="password"
          placeholder="请再次输入密码"
          show-password
          prefix-icon="Lock"
        />
      </el-form-item>
      
      <div class="form-actions">
        <el-button 
          type="primary" 
          :loading="loading" 
          @click="handleRegister(formRef)"
          class="submit-btn"
        >
          注册
        </el-button>
      </div>
      
      <div class="form-footer">
        <span>已有账号？</span>
        <el-button 
          link 
          type="primary" 
          @click="switchToLogin"
        >
          立即登录
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.register-form {
  padding: 16px 8px;
}

.form-title {
  text-align: center;
  margin-bottom: 24px;
  font-size: 20px;
  color: var(--el-color-primary);
}

.register-error {
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