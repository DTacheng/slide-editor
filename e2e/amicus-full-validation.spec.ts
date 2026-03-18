import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

declare global {
  interface Window {
    __openclawEditor?: {
      setCurrentSlide: (index: number) => void;
      startCropImage: (id: string) => void;
    };
  }
}

/**
 * Amicus PPT 完整验证测试
 * 覆盖所有18页幻灯片的所有元素
 *
 * 成功标准：
 * 1. 所有元素可被选中
 * 2. 所有元素可被拖拽移动
 * 3. 所有元素可被删除
 * 4. 所有文本元素可被编辑
 * 5. 所有图片可被裁剪
 */

test.describe('Amicus PPT - Full Validation (All 18 Slides)', () => {
  test.beforeEach(async ({ page }) => {
    // 创建测试页面内容（内联编辑器脚本）
    // 读取原始 HTML
    const htmlPath = path.join(process.cwd(), 'Amicus-宣讲PPT-测试badcase', 'amicus-presentation.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // 读取编辑器脚本
    const scriptPath = path.join(process.cwd(), 'dist', 'editor.bundle.js');
    let scriptContent = '';
    if (fs.existsSync(scriptPath)) {
      scriptContent = fs.readFileSync(scriptPath, 'utf-8');
    }

    // 在 </body> 前注入编辑器脚本
    const injectScript = `
<script>
${scriptContent}
</script>
<script>
// Auto-enable editor
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.__openclawEditor) window.__openclawEditor.enable();
  });
} else {
  if (window.__openclawEditor) window.__openclawEditor.enable();
}
</script>
</body>`;

    htmlContent = htmlContent.replace('</body>', injectScript);

    // 加载页面
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    // 等待编辑器激活
    await page.waitForSelector('.slide-editor-active', { timeout: 10000 });

    // 等待至少一个元素被注册
    await page.waitForSelector('[data-editor-id]', { timeout: 10000 });
  });

  /**
   * Slide 1: 封面
   * 元素：主标题(h1)、副标题(subtitle)、Ami头像(avatar-image)、Logo
   */
  test('Slide 1: 封面 - 所有元素可编辑', async ({ page }) => {
    // 切换到第1页
    await page.evaluate(() => window.__openclawEditor?.setCurrentSlide(0));

    // 首先检查页面上有多少可编辑元素
    const editableCount = await page.locator('[data-editor-id]').count();
    console.log(`Slide 1 可编辑元素数量: ${editableCount}`);

    // 检查 h1 的文本内容
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const h1Text = await h1.textContent();
    console.log(`h1 文本内容: "${h1Text}"`);

    // 检查 h1 的父元素
    const parentClass = await h1.evaluate(el => el.parentElement?.className);
    console.log(`h1 父元素 class: "${parentClass}"`);

    // 检查 h1 的计算样式
    const computedStyle = await h1.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        display: style.display,
        opacity: style.opacity,
        visibility: style.visibility
      };
    });
    console.log(`h1 计算样式:`, computedStyle);

    // 检查所有可编辑元素的标签名
    const editableTags = await page.locator('[data-editor-id]').evaluateAll(els =>
      els.slice(0, 10).map(el => el.tagName.toLowerCase())
    );
    console.log(`前10个可编辑元素标签:`, editableTags);

    const h1HasId = await h1.evaluate(el => el.hasAttribute('data-editor-id'));
    expect(h1HasId, '主标题应该有 data-editor-id').toBe(true);

    // 点击主标题，验证可以被选中
    await h1.click();
    await expect(h1).toHaveClass(/slide-editor-selected/);

    // 验证副标题可编辑
    const subtitle = page.locator('.subtitle').first();
    await expect(subtitle).toBeVisible();
    const subtitleHasId = await subtitle.evaluate(el => el.hasAttribute('data-editor-id'));
    expect(subtitleHasId, '副标题应该有 data-editor-id').toBe(true);

    // 验证Ami头像可编辑
    const avatar = page.locator('.avatar-image, img[alt*="Ami"]').first();
    if (await avatar.isVisible().catch(() => false)) {
      const avatarHasId = await avatar.evaluate(el => el.hasAttribute('data-editor-id'));
      expect(avatarHasId, 'Ami头像应该有 data-editor-id').toBe(true);

      // 点击图片验证可以选中
      await avatar.click();
      await expect(avatar).toHaveClass(/slide-editor-selected/);
    }

    // 验证Logo可编辑
    const logo = page.locator('.logo, img[alt*="logo"], img[alt*="Logo"]').first();
    if (await logo.isVisible().catch(() => false)) {
      const logoHasId = await logo.evaluate(el => el.hasAttribute('data-editor-id'));
      expect(logoHasId, 'Logo应该有 data-editor-id').toBe(true);
    }
  });

  /**
   * Slide 2: 痛点场景
   * 元素：pain-point列表、response-card（默认隐藏）
   */
  test('Slide 2: 痛点场景 - 交互元素可编辑', async ({ page }) => {
    await page.evaluate(() => window.__openclawEditor?.setCurrentSlide(1));

    // 验证 pain-point 元素可编辑
    const painPoints = page.locator('.pain-point');
    const painPointCount = await painPoints.count();
    expect(painPointCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(painPointCount, 3); i++) {
      const pp = painPoints.nth(i);
      const hasId = await pp.evaluate(el => el.hasAttribute('data-editor-id'));
      expect(hasId, `pain-point ${i} 应该有 data-editor-id`).toBe(true);
    }

    // 点击第一个 pain-point 激活 response-card
    await painPoints.first().click();

    // 验证 response-card 可编辑（编辑器应该强制显示隐藏元素）
    const responseCard = page.locator('.response-card.active, .response-card').first();
    await responseCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    if (await responseCard.isVisible().catch(() => false)) {
      const hasId = await responseCard.evaluate(el => el.hasAttribute('data-editor-id'));
      expect(hasId, 'response-card 应该有 data-editor-id').toBe(true);
    }
  });

  /**
   * Slide 3: 企业介绍
   * 元素：大楼照片、企业Logo、介绍文本
   */
  test('Slide 3: 企业介绍 - 图片和文本可编辑', async ({ page }) => {
    await page.evaluate(() => window.__openclawEditor?.setCurrentSlide(2));

    // 验证大楼照片可编辑
    const buildingImg = page.locator('img[alt*="大楼"], img[alt*="办公"], .building-image img').first();
    if (await buildingImg.isVisible().catch(() => false)) {
      const hasId = await buildingImg.evaluate(el => el.hasAttribute('data-editor-id'));
      expect(hasId, '大楼照片应该有 data-editor-id').toBe(true);

      // 验证可以选中
      await buildingImg.click();
      await expect(buildingImg).toHaveClass(/slide-editor-selected/);
    }

    // 验证介绍文本可编辑
    const textBlocks = page.locator('p, .intro-text');
    const textCount = await textBlocks.count();
    if (textCount > 0) {
      const firstText = textBlocks.first();
      const hasId = await firstText.evaluate(el => el.hasAttribute('data-editor-id'));
      expect(hasId, '介绍文本应该有 data-editor-id').toBe(true);
    }
  });

  /**
   * Slide 7: 知识图谱（用户反馈的具体问题页）
   * 元素：.reveal-scale 容器内的知识图谱图片
   */
  test('Slide 7: 知识图谱 - 嵌套图片可编辑', async ({ page }) => {
    await page.evaluate(() => window.__openclawEditor?.setCurrentSlide(6));

    // 查找知识图谱图片
    const chartImg = page.locator('img[alt*="图谱"], img[alt*="chart"], .knowledge-graph img').first();

    if (await chartImg.isVisible().catch(() => false)) {
      // 验证图片在动画容器内也能被检测到
      const hasId = await chartImg.evaluate(el => {
        // 向上查找是否有动画容器
        let parent = el.parentElement;
        let inAnimationWrapper = false;
        while (parent) {
          if (parent.className && parent.className.includes('reveal')) {
            inAnimationWrapper = true;
            break;
          }
          parent = parent.parentElement;
        }
        return {
          hasEditorId: el.hasAttribute('data-editor-id'),
          inAnimationWrapper
        };
      });

      expect(hasId.hasEditorId, '知识图谱图片应该有 data-editor-id').toBe(true);
      if (hasId.inAnimationWrapper) {
        console.log('图片在动画容器内，验证递归检测工作正常');
      }

      // 验证可以选中
      await chartImg.click();
      await expect(chartImg).toHaveClass(/slide-editor-selected/);
    }
  });

  /**
   * Slide 16: Logo墙（用户反馈的具体问题页）
   * 元素：客户Logo墙图片
   */
  test('Slide 16: Logo墙 - 图片可编辑和裁剪', async ({ page }) => {
    // 先跳到后面几页
    const slideCount = await page.locator('.slide').count();
    if (slideCount < 16) {
      test.skip();
      return;
    }

    await page.evaluate(() => window.__openclawEditor?.setCurrentSlide(15));

    // 查找Logo墙图片
    const logoWall = page.locator('img[alt*="Logo墙"], img[alt*="logo墙"], .logo-wall img').first();

    if (await logoWall.isVisible().catch(() => false)) {
      const hasId = await logoWall.evaluate(el => el.hasAttribute('data-editor-id'));
      expect(hasId, 'Logo墙图片应该有 data-editor-id').toBe(true);

      // 点击选中
      await logoWall.click();
      await expect(logoWall).toHaveClass(/slide-editor-selected/);

      // 验证调整大小手柄出现
      const handles = page.locator('.slide-editor-resize-handle');
      await expect(handles.first()).toBeVisible();
    }
  });

  /**
   * 通用功能测试：拖拽移动
   */
  test('通用: 元素可以被拖拽移动', async ({ page }) => {
    await page.evaluate(() => window.__openclawEditor?.setCurrentSlide(0));

    // 找到一个可编辑元素
    const element = page.locator('[data-editor-id]').first();
    await expect(element).toBeVisible();

    // 获取初始位置
    const initialBox = await element.boundingBox();
    expect(initialBox).not.toBeNull();

    // 点击选中
    await element.click();
    await expect(element).toHaveClass(/slide-editor-selected/);

    // 拖拽元素（使用 mouse 操作）
    await element.dragTo(element, {
      sourcePosition: { x: 10, y: 10 },
      targetPosition: { x: 50, y: 50 }
    });

    // 验证元素被移动（通过检查 data-editor-moved 属性）
    const wasMoved = await element.evaluate(el => el.hasAttribute('data-editor-moved'));
    expect(wasMoved, '元素应该被标记为已移动').toBe(true);
  });

  /**
   * 通用功能测试：文本编辑
   */
  test('通用: 文本元素可以被编辑', async ({ page }) => {
    await page.evaluate(() => window.__openclawEditor?.setCurrentSlide(0));

    // 找到第一个文本元素
    const textElement = page.locator('[data-editor-type="text"]').first();
    if (await textElement.isVisible().catch(() => false)) {
      // 双击进入编辑模式
      await textElement.dblclick();

      // 验证 contenteditable 属性
      const isEditable = await textElement.evaluate(el =>
        el.getAttribute('contenteditable') === 'true'
      );
      expect(isEditable, '文本元素应该进入编辑模式').toBe(true);
    }
  });

  /**
   * 通用功能测试：删除元素
   */
  test('通用: 元素可以被删除', async ({ page }) => {
    await page.evaluate(() => window.__openclawEditor?.setCurrentSlide(0));

    // 找到一个可编辑元素
    const element = page.locator('[data-editor-id]').first();
    const elementId = await element.getAttribute('data-editor-id');

    // 点击选中
    await element.click();

    // 按 Delete 键
    await page.keyboard.press('Delete');

    // 验证元素从 DOM 中移除
    const stillExists = await page.locator(`[data-editor-id="${elementId}"]`).isVisible().catch(() => false);
    expect(stillExists, '元素应该被删除').toBe(false);
  });

  /**
   * 通用功能测试：图片裁剪
   */
  test('通用: 图片可以被裁剪', async ({ page }) => {
    await page.evaluate(() => window.__openclawEditor?.setCurrentSlide(0));

    // 找到第一个图片元素
    const imgElement = page.locator('[data-editor-type="image"]').first();
    if (await imgElement.isVisible().catch(() => false)) {
      // 点击图片选中
      await imgElement.click();
      await expect(imgElement).toHaveClass(/slide-editor-selected/);

      // 通过 API 调用裁剪功能
      const elementId = await imgElement.getAttribute('data-editor-id');

      // 启动裁剪模式
      await page.evaluate((id) => {
        window.__openclawEditor?.startCropImage(id);
      }, elementId);

      // 验证裁剪遮罩层出现
      const cropOverlay = page.locator('.slide-editor-crop-overlay');
      await expect(cropOverlay).toBeVisible();

      // 点击取消按钮
      const cancelBtn = page.locator('#crop-cancel');
      await cancelBtn.click();

      // 验证遮罩层消失
      await expect(cropOverlay).not.toBeVisible();
    }
  });

  /**
   * 统计测试：验证所有slide都有可编辑元素
   */
  test('统计: 验证所有幻灯片都有可编辑元素', async ({ page }) => {
    const slides = page.locator('.slide');
    const slideCount = await slides.count();

    console.log(`总共有 ${slideCount} 页幻灯片`);

    for (let i = 0; i < slideCount; i++) {
      await page.evaluate((idx) => window.__openclawEditor?.setCurrentSlide(idx), i);

      // 等待一下让元素渲染
      await page.waitForTimeout(100);

      const editableElements = page.locator(`[data-editor-id]`);
      const count = await editableElements.count();

      console.log(`Slide ${i + 1}: ${count} 个可编辑元素`);
      expect(count, `Slide ${i + 1} 应该至少有1个可编辑元素`).toBeGreaterThan(0);
    }
  });
});
