---
name: slide-editor
version: 0.3.1
description: "Visual editor for HTML presentations. Self-contained, offline-capable, designed for AI agent control. HTML 演示文稿可视化编辑器，自包含可离线，支持 AI Agent 控制。"
---

# Slide Editor

[中文](#中文) | [English](#english)

---

## English

Visual editor for HTML presentations. Self-contained, offline-capable, designed for both AI agent control and direct user manipulation.

### Installation

**Prerequisites**: Node.js 18+ (no need for bun).

```bash
# Clone or download this project
cd slide-editor

# Install dependencies and build
npm install
npm run build
```

### Auto-Detection Mode

This skill will **automatically detect** the best mode for your system:

```bash
# Auto-detect and run (recommended)
node ~/projects/slide-editor/scripts/detect-and-run.js presentation.html
```

**Detection Logic:**
1. ✅ If Node.js is installed → Use **CLI Mode** (full features, direct file save)
2. ❌ If no Node.js → Use **Chrome Extension Mode** (browser-based, export to download)

---

### Quick Start

#### Option A: CLI Mode (Node.js required)

```bash
# Inject editor and open in browser (one command)
node ~/projects/slide-editor/dist/inject.js <html-file> --inline --enable --open
```

**Advantages:**
- Direct file modification (no manual export/replace)
- Can be scripted and automated
- Works offline completely

#### Option B: Chrome Extension Mode (No Node.js)

**Installation:**
1. Open Chrome, go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `chrome-extension` folder from this project

**Usage:**
1. Open your HTML presentation in Chrome
2. Click the Slide Editor icon in toolbar
3. Click "Enable Editor"
4. Edit and click "Export HTML" when done

**Advantages:**
- Zero installation (no Node.js, no npm)
- Works on any computer with Chrome
- Works with local files and web pages
- One-click enable/disable

This will:
1. Inject the editor bundle into the HTML file
2. Automatically open the browser with editor enabled

### CLI Commands

```bash
# Full workflow: inject + enable + open (recommended)
node ~/projects/slide-editor/dist/inject.js presentation.html --inline --enable --open

# Inline mode (single file, portable)
node ~/projects/slide-editor/dist/inject.js presentation.html --inline --enable

# Link mode (separate bundle file)
node ~/projects/slide-editor/dist/inject.js presentation.html --link --enable

# Remove editor from HTML
node ~/projects/slide-editor/dist/inject.js presentation.html --remove
```

### User Interaction

| Action | How |
|--------|-----|
| Select | Click on element |
| Move | Drag selected element |
| Resize | Drag 8 corner handles |
| Edit text | Double-click text |
| Delete | Delete/Backspace key |
| Undo | Ctrl/Cmd + Z |
| Redo | Ctrl/Cmd + Shift + Z |
| Toggle Panel | P key or Panel button |
| Toggle Theme | T key or Theme button |
| Deselect | Escape |

### Toolbar Buttons

| Button | Function |
|--------|----------|
| T | Add text box |
| Image | Add image (file picker) |
| Trash | Delete selected |
| Undo/Redo | History controls |
| Panel | Toggle properties panel |
| Theme | Toggle light/dark/auto theme |
| 👁 Eye | Toggle hidden elements (cycles through one at a time) |
| Export | Export as new HTML file |

> **Note:** The Eye button is designed for editing hidden response cards in presentations. Each click reveals the next hidden element, cycling through them one at a time to avoid overlap.

### Workflow

1. **Inject**: Run inject.ts with `--open` flag
2. **Edit**: Make changes in browser (editor auto-enables)
3. **Export**: Click Export button
4. **Done**: File is downloaded to your downloads folder

### API Reference

All methods available via `window.__openclawEditor`:

#### Core
- `enable()` / `disable()` - Toggle editor
- `isEnabled()` - Check if active

#### Slides
- `addSlide(index?)` - Add new slide
- `deleteSlide(index)` - Delete slide
- `moveSlide(from, to)` - Reorder slide
- `duplicateSlide(index)` - Copy slide
- `getSlides()` - Get all slides
- `getCurrentSlide()` / `setCurrentSlide(index)` - Get/set current

#### Elements
- `addText(options)` - Add text box
- `addImage(options)` - Add image (supports local file via File picker)
- `deleteElement(id)` / `deleteSelected()` - Delete
- `moveElement(id, x, y)` - Move
- `resizeElement(id, w, h)` - Resize
- `setTextContent(id, content)` - Set text
- `setStyle(id, styles)` - Apply CSS
- `cropImage(id, rect)` - Crop image
- `bringToFront(id)` / `sendToBack(id)` - Layer order
- `toggleHiddenElements(show)` - Cycle through hidden elements (eye button feature)

#### Selection
- `selectElement(id)` / `deselectAll()`
- `getSelectedElement()` / `getSelectedElements()`

#### History
- `undo()` / `redo()`
- `canUndo()` / `canRedo()`

#### Export
- `export()` - Export clean HTML
- `exportWithEditor()` - Export with editor embedded

### Type Definitions

```typescript
interface TextOptions {
  x?: number; y?: number;
  width?: number; height?: number;
  content?: string;
  fontSize?: string;
  color?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
}

interface ImageOptions {
  x?: number; y?: number;
  width?: number; height?: number;
  src: string;  // URL or data URI
  alt?: string;
}

interface CropRect {
  x: number; y: number;
  width: number; height: number;
}
```

### Examples

```javascript
// Add text
window.__openclawEditor.addText({
  x: 100, y: 200, width: 400,
  content: 'Hello World',
  fontSize: '48px'
});

// Move element
window.__openclawEditor.moveElement('editor-el-1', 150, 250);

// Export
const html = window.__openclawEditor.export();
```

---

## 中文

HTML 演示文稿的可视化编辑器。自包含、可离线使用，支持 AI Agent 控制和直接用户操作。

### 安装

**前置条件**：Node.js 18+（不需要 bun）。

```bash
# 克隆或下载此项目
cd slide-editor

# 安装依赖并构建
npm install
npm run build
```

### 自动识别模式

本工具会**自动检测**您系统的最佳运行模式：

```bash
# 自动检测并运行（推荐）
node ~/projects/slide-editor/scripts/detect-and-run.js presentation.html
```

**检测逻辑：**
1. ✅ 如果安装了 Node.js → 使用 **CLI 模式**（完整功能，直接保存文件）
2. ❌ 如果没有 Node.js → 使用 **Chrome 扩展模式**（浏览器内运行，导出下载）

---

### 快速开始

#### 方案 A：CLI 模式（需要 Node.js）

**优点：**
- 直接修改原文件（无需手动导出/替换）
- 可脚本化、可自动化
- 完全离线运行

```bash
node ~/projects/slide-editor/dist/inject.js presentation.html --inline --enable --open
```

#### 方案 B：Chrome 扩展模式（无需 Node.js）

**安装：**
1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目中的 `chrome-extension` 文件夹

**使用：**
1. 在 Chrome 中打开您的 HTML 演示文稿
2. 点击工具栏上的 Slide Editor 图标
3. 点击「Enable Editor」启用编辑器
4. 编辑完成后点击「Export HTML」导出

**优点：**
- 零安装（无需 Node.js、无需 npm）
- 任何有 Chrome 的电脑都能用
- 支持本地文件和网页
- 一键启用/禁用

---

### CLI 命令

```bash
# 完整流程：注入 + 启用 + 打开（推荐）
node ~/projects/slide-editor/dist/inject.js presentation.html --inline --enable --open

# 内联模式（单文件，便携）
node ~/projects/slide-editor/dist/inject.js presentation.html --inline --enable

# 链接模式（独立的 bundle 文件）
node ~/projects/slide-editor/dist/inject.js presentation.html --link --enable

# 从 HTML 中移除编辑器
node ~/projects/slide-editor/dist/inject.js presentation.html --remove
```

### 用户操作

| 操作 | 方法 |
|------|------|
| 选择 | 点击元素 |
| 移动 | 拖拽选中的元素 |
| 调整大小 | 拖拽 8 个角点手柄 |
| 编辑文本 | 双击文本 |
| 删除 | Delete/Backspace 键 |
| 撤销 | Ctrl/Cmd + Z |
| 重做 | Ctrl/Cmd + Shift + Z |
| 切换面板 | P 键或面板按钮 |
| 切换主题 | T 键或主题按钮 |
| 取消选择 | Escape |

### 工具栏按钮

| 按钮 | 功能 |
|------|------|
| T | 添加文本框 |
| 图片 | 添加图片（文件选择器） |
| 垃圾桶 | 删除选中 |
| 撤销/重做 | 历史控制 |
| 面板 | 切换属性面板 |
| 主题 | 切换亮/暗/自动主题 |
| 👁 眼睛 | 切换隐藏元素（每次循环显示一个） |
| 导出 | 导出为新的 HTML 文件 |

> **注意：** 眼睛按钮专为演示文稿中的隐藏响应卡片设计。每次点击显示下一个隐藏元素，循环切换以避免重叠。

### 工作流程

1. **注入**：使用 `--open` 标志运行 inject.ts
2. **编辑**：在浏览器中进行更改（编辑器自动启用）
3. **导出**：点击导出按钮
4. **完成**：文件下载到你的下载文件夹

### API 参考

所有方法通过 `window.__openclawEditor` 访问：

#### 核心
- `enable()` / `disable()` - 切换编辑器
- `isEnabled()` - 检查是否激活

#### 幻灯片
- `addSlide(index?)` - 添加新幻灯片
- `deleteSlide(index)` - 删除幻灯片
- `moveSlide(from, to)` - 重新排序幻灯片
- `duplicateSlide(index)` - 复制幻灯片
- `getSlides()` - 获取所有幻灯片
- `getCurrentSlide()` / `setCurrentSlide(index)` - 获取/设置当前幻灯片

#### 元素
- `addText(options)` - 添加文本框
- `addImage(options)` - 添加图片（支持通过文件选择器选择本地文件）
- `deleteElement(id)` / `deleteSelected()` - 删除
- `moveElement(id, x, y)` - 移动
- `resizeElement(id, w, h)` - 调整大小
- `setTextContent(id, content)` - 设置文本
- `setStyle(id, styles)` - 应用 CSS
- `cropImage(id, rect)` - 裁剪图片
- `bringToFront(id)` / `sendToBack(id)` - 图层顺序
- `toggleHiddenElements(show)` - 循环显示隐藏元素（眼睛按钮功能）

#### 选择
- `selectElement(id)` / `deselectAll()`
- `getSelectedElement()` / `getSelectedElements()`

#### 历史
- `undo()` / `redo()`
- `canUndo()` / `canRedo()`

#### 导出
- `export()` - 导出干净的 HTML
- `exportWithEditor()` - 导出带编辑器的 HTML

### 示例

```javascript
// 添加文本
window.__openclawEditor.addText({
  x: 100, y: 200, width: 400,
  content: '你好世界',
  fontSize: '48px'
});

// 移动元素
window.__openclawEditor.moveElement('editor-el-1', 150, 250);

// 导出
const html = window.__openclawEditor.export();
```
