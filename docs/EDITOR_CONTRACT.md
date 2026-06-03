# Editor-Friendly HTML-PPT 生成契约 (v1)

> 这份文档定义 **slide-editor 能稳定选中、拖动、编辑、保存** 的 HTML 结构标准。
> 生成侧（html-ppt 生成 skill）必须遵守本契约；编辑侧（slide-editor）按本契约解析。
> 一句话目标：**生成的每一页天然满足 editor 的"吃法"，做到生成即可编辑。**

本契约直接对应 `src/core/LayoutEngine.ts` 的 `shouldBeEditable` 与 `src/core/DragManager.ts` 的定位逻辑。任何与代码不一致之处，以代码为准并回头修订本文档。

---

## 0. 名词

| 名词 | 含义 |
|------|------|
| 幻灯片 (slide) | 一屏，editor 以 `.slide` 为单位切换显示 |
| 可编辑元素 (editable) | 被赋予 `data-editor-id`、能点选/拖动/改文字的叶子元素 |
| 容器 (container) | 仅承担布局、本身不可选中的结构节点（div/section/flex/grid） |
| 动画包裹 (anim wrapper) | `.reveal*` 类，editor 会"穿透"它去找里面的内容 |

---

## 1. 幻灯片结构（硬性）

1. **每一屏必须是 `class="slide"`**。editor 全程用 `document.querySelectorAll('.slide')` 定位幻灯片；当前页 `display:flex`、其余 `display:none`。
   - ✅ `<section class="slide"> … </section>` 或 `<div class="slide"> … </div>`
   - ❌ `.page` / `.reveal section` / 自定义类 —— editor 一页都找不到，整份不可编辑。
2. **`.slide` 自身必须建立定位上下文**：`position: relative`。
   - 这是拖动坐标基准。缺它时 `offsetParent` 会上溯到 body，导致拖动坐标错乱、边界判定失效。
3. 幻灯片之间不要相互嵌套；`.slide` 是顶层兄弟节点（可统一放在一个 `.slides` 容器里）。

```html
<div class="slides">
  <section class="slide"> … 第1页 … </section>
  <section class="slide"> … 第2页 … </section>
</div>
```

```css
.slide { position: relative; width: 1280px; height: 720px; }
```

---

## 2. 可编辑元素标记（核心 —— 解决"选不中"）

editor 只给"叶子级内容元素"打 `data-editor-id`。**裸 `<div>` / `<section>` 永远不可选**（`LayoutEngine` 第344–347 行：泛容器一律 `return false`，以避免"整块被选中"）。

因此生成侧对**每个想让用户编辑的元素**，必须落到下面三种之一：

### 2.1 用语义标签（首选）
有文字的 `h1~h6`、`p`、`span/strong/em/b/i/mark/small`、`a`、`label`、`li/dt/dd`，以及 `img`，会被自动识别为可编辑。

- ✅ `<h1>标题</h1>`、`<p>正文</p>`、`<img src=…>`
- ❌ `<div class="title">标题</div>` ← **选不中**（裸 div）

### 2.2 显式标记 `data-editable`（兜底，最稳）
当必须用 `div`（例如卡片整体、带背景的色块文字）时，**显式加 `data-editable`**，editor 会无条件识别。

```html
<div class="card" data-editable> … 整张卡片可作为一个可编辑单元 … </div>
<div class="kpi-number" data-editable>1,280</div>
```

> 生成侧推荐策略：**凡是"用户可能想改的可视单元"，一律补 `data-editable`。** 这是从生成端消灭"选不中"最省力的开关。

### 2.3 约定 class（与现有 interactiveSelectors 对齐）
以下 class 已被 editor 内置识别，生成时沿用即可：
`.card .btn .button .btn-primary .btn-secondary .logo .corner-logo .brand-logo .stat-number .stat-label .stat-value .response-card .modal .popup .floating-button .action-button .fab`，以及 `[onclick] [role=button] [role=link] [contenteditable]`。

### 2.4 选中优先级
点击时 editor 沿事件路径取**最深**的 `data-editor-id`，到 `.slide` 边界停止。
- 不要把可编辑叶子再包进另一个也可编辑的元素里（双层 editable 会让点击选到内层，外层选不到）。
- 一个可视单元只标记一层。

---

## 3. 定位与布局（核心 —— 解决"拖了就跳"）

拖动时 `DragManager` 会**清掉元素的 `transform`**，并强制写 `position` + `left/top`。下面三种写法会导致拖动瞬移/弹回，**生成侧必须避免**：

| ❌ 禁用写法 | 为什么会跳 | ✅ 改用 |
|-----------|-----------|--------|
| `transform: translate(-50%,-50%)` 做居中 | 拖动清掉 transform → 元素瞬移半个身位 | 直接用算好的 `left/top`，或父级 flex 居中但**该元素本身不可拖** |
| `right` / `bottom` 定位（角标、logo） | 转 left/top 时按可视位置重算，易偏 | 统一用 `left` / `top` |
| 可编辑元素是 **flex/grid 子项**，靠 `gap`/`marg:auto`/`justify` 排布 | 写的偏移被父容器重排吃掉，像橡皮筋弹回 | 见 §3.1 |

### 3.1 可拖动元素的定位规范
**凡是希望用户能自由拖动的元素**，按"绝对定位、相对 slide"来生成：

```css
.slide { position: relative; }
.slide .draggable {
  position: absolute;
  left: 120px;   /* 相对 .slide 左上角 */
  top:  80px;
  /* 不要写 right/bottom，不要用 transform 平移 */
}
```

### 3.2 布局型内容怎么办
flex/grid 适合做**整体排版骨架**，但骨架里的子元素若用绝对定位拖动会与 flex 冲突。两种合规做法：

- **A. 排版用 flex/grid，但不期望拖动**：子元素只标 `data-editable` 用于改文字/换图，不追求自由拖位（拖动仍可用，但定位以 flow 为主）。
- **B. 需要自由拖动**：把该元素从 flex/grid 流里拿出来，作为 `.slide` 的绝对定位直接子节点。

> 简记：**要排版用 flex/grid，要拖动用 absolute；不要让同一个元素既靠 flex 排又要自由拖。**

### 3.3 尺寸
- `img` 建议显式给 `width`（高度可 auto），便于 resize handle 计算。
- 文本框建议给 `width`，避免换行抖动。

---

## 4. 事件与交互（避免抢走选中）

1. 可编辑叶子及其祖先**不要**挂 `onclick` 跳转 / `stopPropagation`（会截走 editor 的 capture 选中）。
2. 真正的交互按钮（`input/textarea/button`）editor 会主动跳过不选——若它需要可编辑，改用 `data-editable` 的 div 包装文字部分。
3. `<a href>` 链接：editor 可选中，但导出后仍是链接；演示态点击会跳转，编辑态由 editor 拦截。生成侧如不需要跳转就别加 `href`。

---

## 5. 动画

- 入场动画统一用约定类：`.reveal .reveal-left .reveal-right .reveal-up .reveal-down .reveal-scale .reveal-fade .reveal-slide`。editor 会"穿透"这些 wrapper 找到里面的内容元素。
- `h1.reveal` / `p.reveal` 这类"既是动画又是内容"的元素，editor 会同时识别为可编辑。✅ 允许。
- 不要用自定义动画类去包裹可编辑元素（editor 不认识，会把它当容器穿透或忽略）。

---

## 6. 隐藏可编辑元素（互动卡片）

需要"默认隐藏、编辑时可显"的元素（答案卡、反馈卡等），用约定标记之一：
`.response-card`、`[data-hidden-editable]`、`[hidden-editable]`、`[data-editor-hidden]`、`.hidden-editable`。
editor 的眼睛按钮会逐个循环显示它们。

---

## 7. 导出契约

- 导出时 editor 移除所有 `data-editor-*` 与 `slide-editor-*` 类，保留用户在 protected 模式下的 `left/top` 偏移。
- 因此生成侧加的 `data-editable` 在导出后会被清理，不污染最终文件——**可以放心多加**。

---

## 8. 生成侧 checklist（给 html-ppt 生成 skill 的硬规则）

生成每一页时逐条自检：

- [ ] 每屏是 `<section class="slide">` 或 `<div class="slide">`，且 `.slide{position:relative}`
- [ ] 每个可编辑可视单元：是语义标签 / 有 `data-editable` / 命中约定 class（三选一）
- [ ] 没有 `<div class="...">文字</div>` 这种裸 div 直接装可编辑文字
- [ ] 需拖动的元素：`position:absolute; left/top`，相对 `.slide`
- [ ] 没有用 `transform: translate()` 给可拖动元素做定位
- [ ] 没有用 `right/bottom` 给可拖动元素定位
- [ ] 同一可视单元只标记一层 editable，没有嵌套 editable
- [ ] 可编辑元素及祖先没有 `onclick` / `stopPropagation`
- [ ] 动画只用 `.reveal*` 约定类
- [ ] `img` 有显式 `width`

---

## 附：最小合规模板

```html
<section class="slide" style="position:relative;width:1280px;height:720px;">
  <!-- 标题：语义标签，自动可编辑 -->
  <h1 style="position:absolute;left:80px;top:64px;">季度复盘</h1>

  <!-- 正文：语义标签 -->
  <p style="position:absolute;left:80px;top:160px;width:520px;">
    本季度核心指标全面达成……
  </p>

  <!-- KPI 数字：裸 div 必须补 data-editable + absolute -->
  <div data-editable style="position:absolute;left:760px;top:160px;font-size:96px;font-weight:800;">
    1,280
  </div>

  <!-- 图片：显式 width -->
  <img src="chart.png" width="420"
       style="position:absolute;left:760px;top:300px;" />
</section>
```
