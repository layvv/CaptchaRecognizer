/**
 * 元素选择器配置
 */
export interface ElementSelectorConfig {
  enabled: boolean;               // 是否启用
  highlightColor: string;         // 高亮颜色
  outlineWidth: number;           // 边框宽度
  showInfo: boolean;              // 是否显示信息
  allowClick: boolean;            // 是否允许点击
  excludeSelectors: string[];     // 排除选择器
  transitionDuration: number;     // 过渡动画时长(秒)
  pulseAnimation: boolean;        // 是否启用脉冲动画
  autoScroll: boolean;            // 是否自动滚动到视图
}

/**
 * 元素高亮样式
 */
export interface ElementHighlightStyle {
  outlineColor: string;           // 边框颜色
  outlineWidth: string;           // 边框宽度
  outlineStyle: string;           // 边框样式
  backgroundColor: string;        // 背景颜色
  backgroundOpacity: number;      // 背景透明度
  zIndex: number;                 // 层级
  transitionDuration: string;     // 过渡动画时长
  animation: string;              // 动画
}

/**
 * 选中元素信息
 */
export interface SelectedElementInfo {
  element: HTMLElement;           // 元素引用
  selector: string;               // CSS选择器
  xpath: string;                  // XPath
  boundingRect: DOMRect;          // 元素位置信息
  attributes: Record<string, string>; // 元素属性
  isVisible: boolean;             // 是否可见
  isInteractive: boolean;         // 是否可交互
  parentSelectors: string[];      // 父级选择器
  siblingSelectors: string[];     // 兄弟选择器
}

/**
 * 选择器状态
 */
export interface SelectorState {
  isActive: boolean;              // 是否激活
  selectedElement: SelectedElementInfo | null; // 当前选中元素
  hoveredElement: HTMLElement | null; // 当前悬停元素
  history: SelectedElementInfo[]; // 历史选择记录
}

/**
 * 选择器事件
 */
export interface SelectorEvents {
  onSelect: (info: SelectedElementInfo) => void; // 选中元素
  onHover: (element: HTMLElement | null) => void; // 悬停元素
  onCancel: () => void;           // 取消选择
  onComplete: (info: SelectedElementInfo) => void; // 完成选择
}

/**
 * 选择器生成规则
 */
export interface SelectorGenerationRule {
  useId: boolean;                 // 使用ID
  useClass: boolean;              // 使用类名
  useTag: boolean;                // 使用标签名
  useAttr: string[];              // 使用属性
  maxLength: number;              // 最大长度
  optimizationLevel: number;      // 优化级别 (0-3)
} 