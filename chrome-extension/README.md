# Slide Editor Chrome Extension

Chrome 扩展版本，无需 Node.js，完全离线可用。

## 安装步骤

### 方式一：开发者模式加载（推荐）

1. 打开 Chrome 浏览器，输入 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择此 `chrome-extension` 文件夹
5. 安装完成！

### 方式二：打包安装

1. 在 `chrome://extensions/` 页面
2. 点击「打包扩展程序」
3. 选择此文件夹
4. 将生成的 `.crx` 文件拖入 Chrome

## 使用方法

1. 打开任意 HTML 演示文稿（本地文件或网页）
2. 点击浏览器工具栏的 Slide Editor 图标
3. 点击「Enable Editor」启用编辑器
4. 编辑完成后点击「Export HTML」导出

## 功能特性

- ✅ 完全离线，无需网络
- ✅ 支持本地 HTML 文件 (`file://`)
- ✅ 支持网页 (`http://`, `https://`)
- ✅ 一键启用/禁用
- ✅ 导出清理后的 HTML

## 注意事项

- 首次启用时可能需要刷新页面
- 导出时会移除所有编辑器相关属性
- 建议编辑前备份原文件
