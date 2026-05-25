# 元素样式参考文档

> 基于 LAN Share 重构后主页（Home）配色体系，流式排版，极简 B 端工具质感。
> **本文件为最终规范，所有代码实现必须严格遵循。**

---

## 1. 排版与字体

| 层级 | 字体 | 大小 | 字重 | 行高 |
|------|------|------|------|------|
| 页面标题 | Inter, Avenir, Helvetica, Arial, sans-serif | 1.8rem | 600 | 1.3 |
| 区块标题 | 同上 | 1.1rem | 600 | 1.3 |
| 卡片标题 / Label | 同上 | 0.82rem | 600 | 1.3 |
| 正文 / 表格 | 同上 | 0.88rem | 400 | 1.5 |
| 辅助信息 | 同上 | 0.8rem | 400 | 1.4 |
| 弱提示 | 同上 | 0.78rem | 400 | 1.4 |

- 字体回退策略：Inter → Avenir → Helvetica → Arial → sans-serif
  - Win11：Arial 作为兜底，渲染风格接近系统原生
  - macOS 14+：Inter（已安装时）→ Helvetica（系统）→ Arial
  - Ubuntu：自带字体回退
- 无需加载外部字体，全平台自带覆盖
- **跨分辨率适配**：根字体使用 `clamp(15px, 0.5vw + 12px, 20px)`，在 1080p 窗口下约 15.6px、大屏/高分辨率窗口自动放大至 20px 上限，结合 Windows 系统 DPI 缩放自动适配
- h1 页面标题使用 `letter-spacing: -0.01em`（不可使用更大负值，否则 "Ty" 等字母对会粘连）

---

## 2. 色彩系统

### 2.1 CSS 自定义属性结构

```css
/* 默认 = 浅色 */
html {
  --bg-page: rgb(244, 246, 249);
  --bg-card: #ffffff;
  --bg-hover: rgba(33, 53, 71, 0.06);
  --bg-input: #ffffff;
  --bg-toggle: #e6e6e6;
  --bg-sidebar: #ffffff;
  --bg-table-header: #ffffff;

  --text-primary: #213547;
  --text-secondary: #5a6b7a;
  --text-tertiary: #9aa6b2;
  --text-accent: #ffffff;        /* 按钮文字（在主色背景上） */

  --border: #dde1e6;            /* 仅限侧栏等结构分隔处 */
  --border-input: #d0d5da;

  --accent: dodgerblue;          /* #1E90FF */
  --accent-hover: #42a5f5;
  --danger: #e74c3c;
  --danger-hover: #c0392b;
  --success: #27ae60;

  --radius: 4px;                 /* 按钮/输入框 */
  --radius-sm: 6px;              /* 卡片 */

  --color-scheme: light;         /* 用于 form 控件系统着色 */
}

/* 深色：通过 .dark 类 */
html.dark { /* 见下方表格 */ }

/* 深色：跟随系统（仅当 html 无 .dark / .light 类时生效） */
@media (prefers-color-scheme: dark) {
  html:not(.light):not(.dark) { /* 同 .dark 值 */ }
}
```

### 2.2 浅色主题

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg-page` | `rgb(244, 246, 249)` | 页面背景 |
| `--bg-card` | `#ffffff` | 内容卡片背景 |
| `--bg-hover` | `rgba(33, 53, 71, 0.06)` | 行/项悬停 |
| `--bg-input` | `#ffffff` | 输入框背景 |
| `--bg-toggle` | `#e6e6e6` | 开关关闭色 |
| `--bg-sidebar` | `#ffffff` | 侧栏背景 |
| `--bg-table-header` | `#ffffff` | 表头背景 |
| `--text-primary` | `#213547` | 主文字 |
| `--text-secondary` | `#5a6b7a` | 辅助文字 |
| `--text-tertiary` | `#9aa6b2` | 弱提示文字 |
| `--text-accent` | `#ffffff` | 主色按钮文字 |
| `--accent` | `dodgerblue` (#1E90FF) | 主色调（按钮/链接/开关激活色） |
| `--accent-hover` | `#42a5f5` | 主色悬停 |
| `--danger` | `#e74c3c` | 危险操作 |
| `--danger-hover` | `#c0392b` | 危险悬停 |
| `--border` | `#dde1e6` | 仅限导航栏等结构分隔处（极淡） |
| `--border-input` | `#d0d5da` | 输入框边框 |
| `--color-scheme` | `light` | 系统配色方案 |

### 2.3 深色主题

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg-page` | `#2f2f2f` | 页面背景 |
| `--bg-card` | `#383838` | 内容卡片背景 |
| `--bg-hover` | `rgba(255,255,255,0.06)` | 行/项悬停 |
| `--bg-input` | `#1e1e1e` | 输入框背景 |
| `--bg-toggle` | `#505050` | 开关关闭色 |
| `--bg-sidebar` | `#383838` | 侧栏背景 |
| `--bg-table-header` | `#383838` | 表头背景 |
| `--text-primary` | `#f6f6f6` | 主文字 |
| `--text-secondary` | `#b0b0b0` | 辅助文字 |
| `--text-tertiary` | `#808080` | 弱提示文字 |
| `--text-accent` | `#1a1a1a` | 主色按钮文字 |
| `--accent` | `#24c8db` | 主色调 |
| `--accent-hover` | `#5dd9e8` | 主色悬停 |
| `--danger` | `#f56c6c` | 危险操作 |
| `--border` | `#444` | 仅结构分隔处 |
| `--border-input` | `#505050` | 输入框边框 |
| `--color-scheme` | `dark` | 系统配色方案 |

---

## 3. 布局原则（重点）

### 3.1 内容块（卡片）

- ❌ **无描边 / 实线边框** — 卡片之间不用 border 分隔
- ❌ **无阴影** — 不通过 box-shadow 区分
- ✅ **仅靠间距和背景色过渡**：
  - 卡片: `background: var(--bg-card); border: none; border-radius: 6px;`
  - 卡片之间：垂直间距 `margin-bottom: 16px`，通过 white 与 rgb(244, 246, 249) 背景的微妙对比区分
  - 卡片内部：内边距 `padding: 20px 24px`
- 卡片标题使用 `text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-size: 0.82rem; font-weight: 600; margin-bottom: 16px`

### 3.2 导航栏（唯一允许描边的地方）

- `border-right: 1px solid var(--border)` — 右侧细线分隔导航与内容区
- 侧栏宽度：180px
- 侧栏项：`padding: 9px 16px; margin: 1px 8px; border-radius: 4px;` 悬停/激活仅变背景色
- 底部分隔线（设置/其他按钮区域）：`height: 1px; background: var(--border); margin: 6px 16px;`
- 侧栏 SVG 图标：18x18 viewBox，stroke-width: 1.6，stroke-linecap: round，stroke-linejoin: round

### 3.3 内容区域内

- ❌ 禁用：`border-top` / `border-bottom` 分隔线
- ✅ 用 `padding` / `margin` / 标题层级制造块感
- 表格头部与正文之间：无分割线，仅靠 sticky header + 背景色变化区分

### 3.4 双列等高布局（流式）

```css
.two-col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.two-col .card { margin: 0; }
```

- 使用 CSS Grid 而非 Flexbox 保证同行卡片天然等高
- 内部卡片若含 flex 子项（如 textarea 撑满），需设置 `display: flex; flex-direction: column`

---

## 4. 开关组件（Toggle Switch）

- 尺寸：44px × 24px，圆角 12px
- 滑块：圆形 18px，白色，`top: 50%; transform: translateY(-50%);`，带 `box-shadow: 0 1px 3px rgba(0,0,0,0.15)`
- 关闭态滑块左侧间距：**3px**（`left: 3px`）
- 开启态滑块位置：**`left: 23px`**（44 - 18 - 3 = 23px，右侧留出与左侧对称的 3px 间隙）
- 未选中背景：`background: var(--bg-toggle)`（浅色 = #e6e6e6，深色 = #505050）
- **选中背景：`background: var(--accent)`**
- 禁用：`opacity: 0.5; cursor: not-allowed`
- 过渡：`left 0.25s, background-color 0.25s`
- 实现方式：CSS only，`appearance: none` + `::after` 伪元素

```css
.toggle {
  -webkit-appearance: none;
  appearance: none;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background-color: var(--bg-toggle);
  cursor: pointer;
  position: relative;
  transition: background-color 0.25s;
  flex-shrink: 0;
}
.toggle::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  top: 50%;
  left: 3px;
  transform: translateY(-50%);
  transition: left 0.25s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.toggle:checked { background-color: var(--accent); }
.toggle:checked::after { left: 23px; }
.toggle:disabled { opacity: 0.5; cursor: not-allowed; }
```

---

## 5. 按钮

| 状态 | 样式 |
|------|------|
| 默认主按钮 | `background: var(--accent); color: var(--text-accent); border: none; border-radius: var(--radius); font-weight: 500;` |
| 悬停 | `background: var(--accent-hover)` |
| 点击 | `opacity: 0.85` |
| 危险按钮 | `background: var(--danger)` |
| 危险悬停 | `background: var(--danger-hover)` |
| 次要按钮 | `background: transparent; color: var(--text-primary); border: 1px solid var(--border)` |
| 次要悬停 | `background: var(--bg-hover); border-color: transparent` |
| 禁用 | `opacity: 0.5; cursor: not-allowed` |

- 主要操作：`padding: 0.5em 1.5em; font-size: 0.88rem`
- 次要操作（清空记录等）：`padding: 0.35em 1em; font-size: 0.75rem`
- 过渡：`background 0.15s, opacity 0.15s`

---

## 6. 输入框 / 文本域

- 边框：`1px solid var(--border-input)`
- 聚焦 / 悬停：`border-color: var(--accent)`（无 outline / ring）
- 圆角：`var(--radius)`（4px）
- 内边距：`0.45em 0.65em`
- 字体大小：`0.9rem`
- 背景：`var(--bg-input)`
- 文字色：`var(--text-primary)`
- 文本域：`resize: vertical; min-height: 100px`
- 过渡：`border-color 0.15s`

---

## 7. 表格 / 列表

- 表头：sticky，`background: var(--bg-table-header)`，无下划线分隔
- 表头文字：`font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; color: var(--text-secondary)`
- 行：无 border，悬停时 `var(--bg-hover)` 背景
- 内容行：`padding: 0.5em 0.4em`
- 过渡：`background 0.12s`

---

## 8. 滚动条

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #a1a1a1; }
```

---

## 9. 右键菜单（Context Menu）

- 无边框方式：`background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 4px 12px rgba(0,0,0,0.08)`
- 项：`padding: 0.45em 1em; font-size: 0.82rem`
- 危险项：`color: var(--danger)`

---

## 10. 交互行为

- 所有可交互元素（行/项/按钮）的悬停反馈：**仅背景色变化**，无描边/阴影变化
- 过渡时长：`0.12s ~ 0.15s`（快速响应感）
- 右键菜单：无边框菜单，`box-shadow` 区分层级
- 开关组件：`0.25s`（略慢，配合滑块滑动手感）

---

## 11. 深色模式

- 桌面客户端：**跟随系统** `@media (prefers-color-scheme: dark)`，无手动切换开关
- 预览 HTML 中的三态切换（跟随系统 / 浅色 / 深色）仅为预览用途，不会出现在实际应用中
- 所有颜色通过 CSS 自定义属性统一切换
- `html` 上添加 `.light` 类强制浅色、`.dark` 类强制深色，无类时跟随系统

---

## 12. 侧栏图标风格

- 风格：VSCode 风格线稿图标（Feather 风格），stroke-based SVG
- viewBox：`0 0 24 24`
- 外部容器：`width: 18px; height: 18px`
- stroke-width：`1.6`
- stroke-linecap：`round`
- stroke-linejoin：`round`
- fill：`none`
- 默认描边色：`var(--text-secondary)`，激活态：`var(--text-primary)`

### 图标清单

| 页面 | 图标 SVG |
|------|----------|
| 主页 | 房屋 `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>` |
| 文本共享 | 文件 + 文字 `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>` |
| 历史 | 时钟 `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>` |
| 设置 | 齿轮 `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>` |

---

## 13. 设置页布局

- 每张卡片包含一个设置分组（"基础"、"共享"等）
- 分组标题：`.typo-label` 样式
- 设置项：`display: flex; justify-content: space-between; align-items: center; padding: 8px 0`
- 可点击值（如端口号）：`color: var(--accent); font-weight: 600; cursor: pointer`
- 路径文本：`max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`

---

## 14. 阴影使用规范

| 层级 | 用法 |
|------|------|
| 无阴影 | 卡片、弹窗背景层 |
| `box-shadow: 0 1px 3px rgba(0,0,0,0.15)` | 开关滑块 |
| `box-shadow: 0 4px 12px rgba(0,0,0,0.08)` | 右键菜单（唯一允许阴影的元素） |

---

## 15. CSS 实现最佳实践

- 所有设计令牌通过 CSS 自定义属性管理
- 使用 `color-scheme: var(--color-scheme)` 确保表单控件自动适配
- 使用 `-webkit-font-smoothing: antialiased` 和 `-moz-osx-font-smoothing: grayscale` 优化字体渲染
- 对于 styled-components，CSS 自定义属性在 `:root` / `html` 级别定义，各组件引用 `var(--xxx)`
- 过渡统一使用 `transition: [property] [duration]`，禁止使用 `all`
