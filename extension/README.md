# 验证码识别助手浏览器扩展

这是一个基于深度学习的验证码识别浏览器扩展，能够自动识别网页中的验证码并填写。

## 项目结构

```
extension/
├── src/
│   ├── entrypoints/               # 入口点
│   │   ├── background/            # 后台脚本
│   │   │   └── index.ts           # 后台服务入口
│   │   ├── content/               # 内容脚本
│   │   │   ├── matchers/          # 验证码匹配器
│   │   │   │   ├── interfaces.ts  # 匹配器接口定义
│   │   │   │   ├── character.ts   # 字符验证码匹配器
│   │   │   │   ├── chain.ts       # 匹配器责任链
│   │   │   │   └── index.ts       # 匹配器模块索引
│   │   │   ├── captcha-detector.ts  # 验证码检测器
│   │   │   ├── captcha-processor.ts # 验证码处理器
│   │   │   ├── captcha-selector.ts  # 验证码选择器
│   │   │   ├── dom-utils.ts       # DOM操作工具
│   │   │   ├── element-capture.ts # 元素捕获工具
│   │   │   ├── highlighting.ts    # 高亮显示
│   │   │   ├── message-handler.ts # 消息处理器
│   │   │   ├── selector-ui.ts     # 选择器UI
│   │   │   └── index.ts           # 内容脚本入口
│   │   └── popup/                 # 弹出界面
│   │       ├── App.vue            # 弹出界面主组件
│   │       ├── index.html         # HTML入口
│   │       ├── main.ts            # JS入口
│   │       └── style.css          # 样式表
│   ├── stores/                    # 状态存储
│   │   ├── captcha.ts             # 验证码记录存储
│   │   ├── settings.ts            # 设置存储
│   │   └── index.ts               # 存储模块索引
│   ├── types/                     # 类型定义
│   │   ├── api.ts                 # API接口类型
│   │   ├── captcha.ts             # 验证码相关类型
│   │   ├── messages.ts            # 消息类型定义
│   │   └── index.ts               # 类型模块索引
│   ├── utils/                     # 工具函数
│   │   ├── api.ts                 # API服务
│   │   ├── messaging.ts           # 消息通信
│   │   ├── storage.ts             # 存储工具
│   │   └── index.ts               # 工具模块索引
│   └── wxt.config.ts              # WXT配置文件
├── package.json                   # 项目配置
└── README.md                      # 项目说明
```

## 模块职责

### 内容脚本模块

- **入口 (index.ts)**: 负责初始化验证码识别功能，加载设置，注册消息处理器
- **消息处理器 (message-handler.ts)**: 处理从后台或弹出界面收到的消息
- **验证码检测器 (captcha-detector.ts)**: 检测页面中的验证码元素
- **验证码处理器 (captcha-processor.ts)**: 处理验证码识别和填充
- **验证码选择器 (captcha-selector.ts)**: 处理用户手动选择验证码的交互

### 验证码匹配模块

- **匹配器接口 (interfaces.ts)**: 定义验证码匹配器的统一接口
- **字符验证码匹配器 (character.ts)**: 处理基于文字的验证码
- **匹配器责任链 (chain.ts)**: 管理多个验证码匹配器，按优先级执行

### 辅助功能模块

- **DOM工具 (dom-utils.ts)**: DOM相关操作辅助函数
- **元素捕获 (element-capture.ts)**: 将页面元素转换为图像数据
- **高亮显示 (highlighting.ts)**: 高亮显示验证码元素
- **选择器UI (selector-ui.ts)**: 提供用户选择界面

### 状态管理

- **验证码记录存储 (stores/captcha.ts)**: 管理验证码记录
- **设置存储 (stores/settings.ts)**: 管理扩展设置

### 工具函数

- **API服务 (utils/api.ts)**: 处理与后端API的通信
- **消息通信 (utils/messaging.ts)**: 处理扩展组件间的消息通信
- **存储工具 (utils/storage.ts)**: 处理本地存储

## 消息处理流程

1. **内容脚本收到消息** → `message-handler.ts` 处理消息
2. **处理特定消息类型** → 根据消息类型分发到对应处理函数
3. **执行对应操作** → 调用验证码处理器、检测器等功能模块

## 验证码识别流程

1. **检测验证码** → `captcha-detector.ts` 调用匹配器检测验证码
2. **处理验证码** → `captcha-processor.ts` 对验证码进行处理
3. **发送识别请求** → 通过消息发送到后台脚本
4. **填写验证码** → 将识别结果填入对应的输入框

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar).


