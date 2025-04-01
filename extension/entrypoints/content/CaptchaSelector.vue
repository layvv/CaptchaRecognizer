<template>
  <div class="captcha-recognizer-panel" ref="panelRef">
    <div class="captcha-recognizer-panel-header" @mousedown="startDrag" ref="headerRef">
      验证码识别
    </div>
    
    <div class="captcha-recognizer-panel-content">
      <!-- 初始提示 -->
      <div v-if="!selected">
        <p>请将鼠标移动到验证码元素上，点击选择</p>
      </div>
      
      <!-- 选中后显示元素信息 -->
      <template v-else>
        <h3>选中的元素</h3>
        <div class="captcha-recognizer-element-info">
          <div>
            <strong>标签:</strong> 
            <span class="captcha-recognizer-tag-value">{{ elementInfo.tagName }}</span>
          </div>
          
          <div v-if="elementInfo.id">
            <strong>ID:</strong> 
            <span class="captcha-recognizer-id-value">{{ elementInfo.id }}</span>
          </div>
          
          <div v-if="elementInfo.classes && elementInfo.classes.length">
            <strong>类:</strong> 
            <span 
              v-for="cls in elementInfo.classes" 
              :key="cls" 
              class="captcha-recognizer-class-value"
            >{{ cls }}</span>
          </div>
          
          <div>
            <strong>选择器:</strong> 
            <span 
              class="captcha-recognizer-selector-value" 
              :title="elementInfo.selector"
            >{{ formatSelector(elementInfo.selector) }}</span>
          </div>
          
          <div>
            <strong>尺寸:</strong> 
            {{ Math.round(elementInfo.rect?.width || 0) }} × {{ Math.round(elementInfo.rect?.height || 0) }}
          </div>
        </div>
        
        <h3>验证码匹配</h3>
        <div class="captcha-recognizer-match-info">
          <div v-if="matchResult && matchResult.type">
            <div class="match-info-row">
              <strong>类型:</strong> 
              {{ matchResult.type === 'char' ? '字符型验证码' : '滑块验证码' }}
            </div>
            <div class="match-info-row">
              <strong>匹配度:</strong> 
              <span 
                class="captcha-recognizer-match-score" 
                :class="matchResult.score >= 0.7 ? 'high-score' : 'low-score'"
              >{{ (matchResult.score * 100).toFixed(0) }}%</span>
            </div>
          </div>
          <div v-else>
            未识别为验证码，请重新选择
          </div>
        </div>
      </template>
    </div>
    
    <div class="captcha-recognizer-panel-footer">
      <button id="captcha-recognizer-cancel" @click="$emit('cancel')">取消选择</button>
      <button v-if="selected" id="captcha-recognizer-reselect" @click="$emit('reselect')">重新选择</button>
      <button 
        v-if="selected && matchResult && matchResult.score > 0.5" 
        id="captcha-recognizer-select" 
        @click="handleSelect"
      >选择并上传</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { CaptchaType } from '@/types';

interface Props {
  elementInfo: {
    selector: string;
    tagName: string;
    id: string;
    classes: string[];
    rect?: DOMRect | null;
  };
  matchResult: {
    type: CaptchaType | null;
    score: number;
  } | null;
  selected: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['cancel', 'reselect', 'select']);

const panelRef = ref<HTMLElement | null>(null);
const headerRef = ref<HTMLElement | null>(null);

// 格式化选择器，避免过长
const formatSelector = (selector: string) => {
  return selector.length > 50 ? selector.substring(0, 47) + '...' : selector;
};

// 处理选择按钮点击
const handleSelect = () => {
  if (props.matchResult && props.matchResult.type) {
    emit('select', props.matchResult.type);
  }
};

// 拖动相关逻辑
const startDrag = (e: MouseEvent) => {
  if (!panelRef.value) return;
  
  e.preventDefault();
  
  const panel = panelRef.value;
  
  // 获取当前样式
  const style = window.getComputedStyle(panel);
  
  // 确保面板使用绝对定位
  if (style.position !== 'absolute') {
    const rect = panel.getBoundingClientRect();
    
    // 保存原始定位信息用于调试
    const originalPosition = {
      position: style.position,
      top: style.top,
      right: style.right,
      left: style.left,
      bottom: style.bottom
    };
    
    // 确保使用正确的位置
    let newLeft = rect.left + window.scrollX;
    
    // 如果原来是从右侧定位的，计算正确的left值
    if (style.right !== 'auto' && style.right !== '') {
      newLeft = window.innerWidth - rect.width - parseFloat(style.right);
    }
    
    // 转换为绝对定位，保持视觉位置不变
    panel.style.position = 'absolute';
    panel.style.top = (rect.top + window.scrollY) + 'px';
    panel.style.left = newLeft + 'px';
    panel.style.margin = '0';
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
  }
  
  // 记录初始鼠标位置和面板位置
  const initialMouseX = e.clientX;
  const initialMouseY = e.clientY;
  const initialPanelTop = panel.offsetTop;
  const initialPanelLeft = panel.offsetLeft;
  
  // 应用拖动时的视觉效果
  panel.style.boxShadow = '0 8px 28px rgba(0, 0, 0, 0.25)';
  panel.style.opacity = '0.95';
  panel.style.transition = 'none';
  
  // 鼠标移动处理函数
  const mouseMoveHandler = (e: MouseEvent) => {
    e.preventDefault();
    
    // 计算新位置
    const newTop = initialPanelTop + (e.clientY - initialMouseY);
    const newLeft = initialPanelLeft + (e.clientX - initialMouseX);
    
    // 应用新位置
    panel.style.top = newTop + 'px';
    panel.style.left = newLeft + 'px';
  };
  
  // 鼠标释放处理函数
  const mouseUpHandler = () => {
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    
    // 恢复样式
    panel.style.boxShadow = '';
    panel.style.opacity = '';
    panel.style.transition = '';
  };
  
  document.addEventListener('mousemove', mouseMoveHandler);
  document.addEventListener('mouseup', mouseUpHandler);
};

// 初始化面板位置
onMounted(() => {
  if (!panelRef.value) return;
  
  const panel = panelRef.value;
  
  // 初始位置设为视口中央
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const panelWidth = 320; // 预估宽度
  const panelHeight = 400; // 预估高度
  
  panel.style.position = 'absolute';
  panel.style.top = ((viewportHeight - panelHeight) / 2 + window.scrollY) + 'px';
  panel.style.left = ((viewportWidth - panelWidth) / 2 + window.scrollX) + 'px';
});
</script>

<style>
.captcha-recognizer-panel {
  width: 320px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #333;
  z-index: 999999;
  transition: box-shadow 0.3s ease, opacity 0.3s ease;
}

.captcha-recognizer-panel-header {
  background-color: #4285f4;
  color: white;
  padding: 12px 16px;
  font-weight: 600;
  cursor: move;
  user-select: none;
}

.captcha-recognizer-panel-content {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.captcha-recognizer-panel-footer {
  padding: 12px 16px;
  background-color: #f5f5f5;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.captcha-recognizer-element-info,
.captcha-recognizer-match-info {
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
}

.captcha-recognizer-element-info > div {
  margin-bottom: 8px;
}

.captcha-recognizer-class-value {
  display: inline-block;
  background-color: #e9f0fe;
  border: 1px solid #d2e0fd;
  border-radius: 3px;
  padding: 2px 6px;
  margin-right: 4px;
  margin-bottom: 4px;
  font-size: 12px;
}

.captcha-recognizer-selector-value {
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 12px;
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #eee;
  word-break: break-all;
}

.captcha-recognizer-match-score {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.high-score {
  background-color: #e6f7e6;
  color: #2e7d32;
}

.low-score {
  background-color: #ffebee;
  color: #c62828;
}

.match-info-row {
  margin-bottom: 8px;
}

/* 按钮样式 */
#captcha-recognizer-cancel {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  color: #555;
}

#captcha-recognizer-reselect {
  background-color: #e0e0e0;
  border: 1px solid #ccc;
  color: #333;
}

#captcha-recognizer-select {
  background-color: #4285f4;
  border: 1px solid #2c75ea;
  color: white;
}

#captcha-recognizer-cancel,
#captcha-recognizer-reselect,
#captcha-recognizer-select {
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

#captcha-recognizer-cancel:hover {
  background-color: #eaeaea;
}

#captcha-recognizer-reselect:hover {
  background-color: #d5d5d5;
}

#captcha-recognizer-select:hover {
  background-color: #3275e4;
}
</style> 