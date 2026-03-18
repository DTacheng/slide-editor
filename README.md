# Slide Editor

**English | [中文](#幻灯片编辑器)**

A browser-based visual editor for HTML presentations and frontend-designed slides. Self-contained, offline-capable, and designed for both AI agent control and direct user manipulation.

**Perfect for:** Frontend-designed presentations, HTML slides, marketing decks, pitch decks, and web-based slide editing.

## Features

- **Select, Move, Resize** - Click to select, drag to move, 8-point resize handles
- **Text Editing** - Double-click to edit text inline with contenteditable
- **Add Elements** - Add text boxes and images via toolbar or API
- **Image Cropping** - Non-destructive crop using CSS clip-path
- **Slide Navigation** - Thumbnail strip with 18+ slides support
- **History** - Full undo/redo support (Ctrl+Z / Ctrl+Shift+Z)
- **Theme Support** - Light, dark, and auto (system) themes
- **Hidden Elements Toggle** - Cyclic reveal of hidden response cards (eye button)
- **Clean Export** - Export HTML without editor artifacts
- **Responsive Design** - Works with flex/grid layouts

## Quick Start

### Installation

```bash
npm install @dtacheng/slide-editor
# or
bun install @dtacheng/slide-editor
```

### Build

```bash
cd ~/projects/slide-editor
npm install
npm run build
```

Output: `dist/editor.bundle.js` (~85KB minified)

## Usage

### Method 1: CLI Injection (Recommended)

From any directory, inject the editor into your HTML presentation:

```bash
# Full workflow: inject + enable + open (recommended)
npx slide-editor presentation.html --inline --enable --open

# Inline mode (single file, portable)
npx slide-editor presentation.html --inline --enable

# Link mode (separate bundle file)
npx slide-editor presentation.html --link --enable

# Remove editor from HTML
npx slide-editor presentation.html --remove
```

Options:
- `--inline` - Embed bundle directly in HTML (single file, shareable)
- `--link` - Reference external `editor.bundle.js` file
- `--enable` - Add auto-enable check
- `--open` - Open in browser after injection (editor auto-enabled)
- `--remove` - Remove editor from HTML
- `-o <file>` - Output to different file

### Method 2: Manual Integration

```bash
# Copy bundle to your HTML's directory
cp node_modules/@dtacheng/slide-editor/dist/editor.bundle.js /path/to/your/project/

# Add to your HTML before </body>
```

```html
<script src="editor.bundle.js"></script>
<script>
  // Enable via console or URL parameter
  if (new URLSearchParams(location.search).get('edit') === '1') {
    window.__openclawEditor.enable();
  }
</script>
```

### Method 3: AI Agent Integration

When generating HTML with an AI agent, include the bundle inline:

```javascript
// Read the bundle
const bundle = require('fs').readFileSync(
  require.resolve('@dtacheng/slide-editor/dist/editor.bundle.js'),
  'utf-8'
);

// Inject into generated HTML
const html = generatedHtml.replace('</body>', `
<script>${bundle}</script>
<script>
if (new URLSearchParams(location.search).get('edit') === '1') {
  window.__openclawEditor.enable();
}
</script>
</body>`);
```

### Enable Editor

After injection, enable the editor by:

1. **URL**: Add `?edit=1` to the page URL
2. **Console**: Run `window.__openclawEditor.enable()`
3. **PostMessage**: `window.postMessage({ type: 'OPENCLAW_EDITOR_ENABLE' }, '*')`

Note: When using `--open` flag, the editor auto-enables without needing URL parameters.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + S` | Save (download) |
| `Delete` / `Backspace` | Delete selected |
| `Escape` | Deselect all |
| `P` | Toggle properties panel |
| `T` | Toggle theme (light/dark/auto) |
| `Shift + Click` | Multi-select |

## Testing

```bash
# Unit tests
npm run test

# E2E tests with Playwright
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# All tests
npm run test:all
```

## Development

```bash
# Watch mode
npm run dev

# Type check
npm run typecheck

# Build
npm run build
```

## Project Structure

```
src/
├── index.ts           # Main entry, EditorAPI implementation
├── types.ts           # TypeScript type definitions
├── styles.ts          # CSS styles (injected when enabled)
├── core/
│   ├── LayoutEngine.ts       # Layout management (v0.3.0+)
│   ├── SelectionManager.ts   # Selection state management
│   ├── DragManager.ts        # Pointer drag handling
│   ├── ResizeManager.ts      # 8-point resize handles
│   ├── TextEditor.ts         # Contenteditable wrapper
│   └── HistoryManager.ts     # Undo/redo stack
├── components/
│   ├── Toolbar.ts            # Top toolbar
│   ├── PropertiesPanel.ts    # Right sidebar properties
│   ├── SlideNavigator.ts     # Bottom slide strip
│   └── Toolbar.ts            # Toolbar with hidden elements toggle
└── serialization/
    └── Exporter.ts           # HTML export & image cropping
```

## API

Full API documentation in [SKILL.md](./SKILL.md).

### Quick Reference

```javascript
// Enable/disable
window.__openclawEditor.enable();
window.__openclawEditor.disable();

// Add elements
window.__openclawEditor.addText({ content: 'Title', fontSize: '48px' });
window.__openclawEditor.addImage({ src: 'image.png' });

// Modify elements
window.__openclawEditor.moveElement(id, x, y);
window.__openclawEditor.resizeElement(id, width, height);
window.__openclawEditor.setStyle(id, { color: 'red' });

// Toggle hidden elements (cycles through one at a time)
window.__openclawEditor.toggleHiddenElements(true);

// Export
const html = window.__openclawEditor.export();
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

Requires Pointer Events API.

## License

MIT

---

# 幻灯片编辑器

**[English](#slide-editor) | 中文**

基于浏览器的 HTML 演示文稿和前端设计幻灯片可视化编辑器。自包含、可离线运行，专为 AI Agent 控制和直接用户操作而设计。

**完美适用于：** 前端设计的演示文稿、HTML 幻灯片、营销文稿、融资路演稿，以及基于网页的幻灯片编辑。

## 功能特性

- **选择、移动、调整大小** - 点击选择，拖拽移动，8点调整手柄
- **文本编辑** - 双击使用 contenteditable 内联编辑文本
- **添加元素** - 通过工具栏或 API 添加文本框和图片
- **图片裁剪** - 使用 CSS clip-path 实现非破坏性裁剪
- **幻灯片导航** - 缩略图条支持 18+ 张幻灯片
- **历史记录** - 完整的撤销/重做支持（Ctrl+Z / Ctrl+Shift+Z）
- **主题支持** - 亮色、暗色和自动（系统）主题
- **隐藏元素切换** - 循环显示隐藏的响应卡片（眼睛按钮）
- **干净导出** - 导出不含编辑器痕迹的 HTML
- **响应式设计** - 支持 flex/grid 布局

## 快速开始

### 安装

```bash
npm install @dtacheng/slide-editor
# 或
bun install @dtacheng/slide-editor
```

### 构建

```bash
cd ~/projects/slide-editor
npm install
npm run build
```

输出：`dist/editor.bundle.js`（~85KB 压缩后）

## 使用方法

### 方法 1：CLI 注入（推荐）

从任意目录注入编辑器到你的 HTML 演示文稿：

```bash
# 完整工作流：注入 + 启用 + 打开（推荐）
npx slide-editor presentation.html --inline --enable --open

# 内联模式（单文件，可移植）
npx slide-editor presentation.html --inline --enable

# 链接模式（独立 bundle 文件）
npx slide-editor presentation.html --link --enable

# 从 HTML 中移除编辑器
npx slide-editor presentation.html --remove
```

选项：
- `--inline` - 直接嵌入 bundle 到 HTML（单文件，可分享）
- `--link` - 引用外部 `editor.bundle.js` 文件
- `--enable` - 添加自动启用检查
- `--open` - 注入后在浏览器中打开（自动启用编辑器）
- `--remove` - 从 HTML 中移除编辑器
- `-o <file>` - 输出到不同文件

### 方法 2：手动集成

```bash
# 复制 bundle 到你的 HTML 目录
cp node_modules/@dtacheng/slide-editor/dist/editor.bundle.js /path/to/your/project/

# 在 HTML 的 </body> 前添加
```

```html
<script src="editor.bundle.js"></script>
<script>
  // 通过控制台或 URL 参数启用
  if (new URLSearchParams(location.search).get('edit') === '1') {
    window.__openclawEditor.enable();
  }
</script>
```

### 方法 3：AI Agent 集成

使用 AI Agent 生成 HTML 时，内联包含 bundle：

```javascript
// 读取 bundle
const bundle = require('fs').readFileSync(
  require.resolve('@dtacheng/slide-editor/dist/editor.bundle.js'),
  'utf-8'
);

// 注入到生成的 HTML
const html = generatedHtml.replace('</body>', `
<script>${bundle}</script>
<script>
if (new URLSearchParams(location.search).get('edit') === '1') {
  window.__openclawEditor.enable();
}
</script>
</body>`);
```

### 启用编辑器

注入后，通过以下方式启用编辑器：

1. **URL**：在页面 URL 添加 `?edit=1`
2. **控制台**：运行 `window.__openclawEditor.enable()`
3. **PostMessage**：`window.postMessage({ type: 'OPENCLAW_EDITOR_ENABLE' }, '*')`

注意：使用 `--open` 标志时，编辑器自动启用，无需 URL 参数。

## 键盘快捷键

| 快捷键 | 操作 |
|--------|------|
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z` | 重做 |
| `Ctrl/Cmd + S` | 保存（下载） |
| `Delete` / `Backspace` | 删除选中项 |
| `Escape` | 取消全选 |
| `P` | 切换属性面板 |
| `T` | 切换主题（亮/暗/自动） |
| `Shift + Click` | 多选 |

## 测试

```bash
# 单元测试
npm run test

# Playwright E2E 测试
npm run test:e2e

# 带 UI 的 E2E 测试
npm run test:e2e:ui

# 全部测试
npm run test:all
```

## 开发

```bash
# 监听模式
npm run dev

# 类型检查
npm run typecheck

# 构建
npm run build
```

## 项目结构

```
src/
├── index.ts           # 主入口，EditorAPI 实现
├── types.ts           # TypeScript 类型定义
├── styles.ts          # CSS 样式（启用时注入）
├── core/
│   ├── LayoutEngine.ts       # 布局管理（v0.3.0+）
│   ├── SelectionManager.ts   # 选择状态管理
│   ├── DragManager.ts        # 指针拖拽处理
│   ├── ResizeManager.ts      # 8点调整手柄
│   ├── TextEditor.ts         # Contenteditable 包装器
│   └── HistoryManager.ts     # 撤销/重做栈
├── components/
│   ├── Toolbar.ts            # 顶部工具栏
│   ├── PropertiesPanel.ts    # 右侧属性栏
│   ├── SlideNavigator.ts     # 底部幻灯片条
│   └── Toolbar.ts            # 带隐藏元素切换的工具栏
└── serialization/
    └── Exporter.ts           # HTML 导出和图片裁剪
```

## API

完整 API 文档参见 [SKILL.md](./SKILL.md)。

### 快速参考

```javascript
// 启用/禁用
window.__openclawEditor.enable();
window.__openclawEditor.disable();

// 添加元素
window.__openclawEditor.addText({ content: '标题', fontSize: '48px' });
window.__openclawEditor.addImage({ src: 'image.png' });

// 修改元素
window.__openclawEditor.moveElement(id, x, y);
window.__openclawEditor.resizeElement(id, width, height);
window.__openclawEditor.setStyle(id, { color: 'red' });

// 切换隐藏元素（每次循环显示一个）
window.__openclawEditor.toggleHiddenElements(true);

// 导出
const html = window.__openclawEditor.export();
```

## 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

需要 Pointer Events API。

## 许可证

MIT
