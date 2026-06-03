# 生成手册：产出"可编辑级"HTML-PPT

> 本手册把 Anthropic 官方 **frontend-design** 的美学方法论，与本项目的 **EDITOR_CONTRACT**
> 结构约束融合，指导 agent 直接生成"生成即可被 slide-editor 编辑"的演示文稿。
> 配合 `docs/EDITOR_CONTRACT.md`（结构契约）与 `scripts/check-compatibility.js`（交付前自检）使用。

整个 skill 的生命周期：**① 生成（本手册） → ② 编辑（inject + 浏览器） → ③ 保存（export）**。

---

## 阶段 ①：生成

### A. 先定美学方向（来自 frontend-design）

写代码前先确定一个**鲜明、克制而有意图**的方向，避免"AI 通用感"：

- **目的与受众**：这份演示解决什么问题、讲给谁听、什么场合。
- **基调**：从极端里选一个并贯彻——极简 / 编辑杂志感 / 复古未来 / 工业实用 / 精致奢华 / 几何装饰 等。
- **排版**：选有性格的字体，**避免 Inter/Roboto/Arial/系统字体**；展示字体 + 正文字体搭配。
- **色彩**：用 CSS 变量统一；强主色 + 锐利点缀，胜过平均分布的怯懦配色。**避开"白底紫渐变"这类陈词滥调。**
- **动效**：优先 CSS-only；把力气集中在一次精心编排的入场（错峰 `animation-delay`），而非到处撒微交互。
- **构图**：敢用非对称、留白、网格打破、对角线流动。

> 关键不是繁复或极简，而是**意图明确并执行到位**。

### B. 再套结构约束（来自 EDITOR_CONTRACT，硬性）

美学自由发挥，但**落地结构必须满足下列每一条**，否则 editor 选不中/拖不动：

1. **每屏 `<section class="slide">`，且 `.slide { position: relative }`。** 固定画布（推荐 1280×720 或 1920×1080），整体缩放适配视口。
2. **每个"用户可能想改"的可视单元，必须可被识别**：用语义标签（`h1~h6/p/img/li…`），或补 `data-editable`，或用约定 class（`.card .btn .logo .stat-number …`）。
3. **绝不**用 `<div class="x">文字</div>` 这种"裸 div 包文字"且里面还嵌子元素的写法装可编辑文字——文字会夹在容器里选不中。纯文字、无子元素的裸 div 现已可选，但**推荐显式加 `data-editable`** 更稳。
4. **要自由拖动的元素**：`position:absolute; left/top`，相对 `.slide`。**不要**用 `transform: translate()` 定位、**不要**用 `right/bottom` 定位。
5. **排版骨架用 flex/grid 可以**，但别让"既靠 flex 排布、又要自由拖动"的元素并存（要拖就从流里拿出来做 absolute）。
6. **动画只用约定类**：`.reveal .reveal-left .reveal-right .reveal-up .reveal-down .reveal-scale .reveal-fade .reveal-slide`（editor 会穿透它们）。
7. 可编辑元素及其祖先**不要**挂 `onclick` / `stopPropagation`；`img` 给显式 `width`。

> `data-editable` 在导出时会被自动清除（契约 §7），**可以放心多加**。

### C. 落地脚手架

```html
<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<style>
  :root{ --bg:#0f1115; --ink:#f4f1ea; --accent:#e8b04b; }
  /* 用有性格的字体，避免 Inter/Roboto */
  @import url('https://fonts.googleapis.com/css2?family=…&display=swap');
  body{ margin:0; background:var(--bg); }
  .slides{ }
  .slide{
    position: relative;            /* ← 拖动坐标基准，必须 */
    width: 1280px; height: 720px;
    margin: 0 auto; overflow: hidden;
    background: var(--bg); color: var(--ink);
  }
  /* 入场动画用约定类 */
  .reveal{ opacity:0; animation: rise .6s ease forwards; }
  @keyframes rise{ to{ opacity:1; transform:none; } }
</style>
</head>
<body>
<div class="slides">

  <section class="slide">
    <h1 class="reveal" style="position:absolute; left:80px; top:72px;">主标题</h1>
    <p class="reveal" style="position:absolute; left:80px; top:180px; width:560px;">副标题或导语……</p>

    <!-- KPI：裸 div 必须 data-editable + absolute -->
    <div data-editable style="position:absolute; left:820px; top:160px; font-size:120px; font-weight:800; color:var(--accent);">
      1,280
    </div>

    <img src="chart.png" width="380" style="position:absolute; left:820px; top:340px;">
  </section>

  <!-- 更多 .slide … -->

</div>
</body>
</html>
```

### D. 交付前自检（强制）

生成完，**先跑自检脚本**，把适配度拉到 95%+ 再交给编辑阶段：

```bash
node scripts/check-compatibility.js my-deck.html
```

按报告修掉"选不中的文字"和"拖动跳位"项（改语义标签 / 加 `data-editable` / 改 absolute 定位）。

---

## 阶段 ②：编辑

```bash
# 注入编辑器并在浏览器打开（自动启用）
node dist/inject.js my-deck.html --inline --enable --open
```

浏览器中：点击选中、拖动移动、8 角点缩放、双击改文字、Delete 删除、Ctrl/Cmd+Z 撤销。

## 阶段 ③：保存 / 导出

编辑器里点 **Export**（或 Ctrl/Cmd+S）导出干净 HTML（自动移除所有 `data-editor-*` 与 `data-editable` 标记），得到可分发的最终文件。

---

## 一句话给生成 agent

> 美学上大胆、独特、避免 AI 通用感；结构上严守 EDITOR_CONTRACT——
> **每屏 `.slide{position:relative}`，可编辑单元用语义标签或 `data-editable`，可拖动元素用 `absolute left/top`、不用 transform/right/bottom，动画只用 `.reveal*`**；
> 交付前用 `check-compatibility.js` 把适配度跑到 95%+。
