import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const testFilePath = path.join(process.cwd(), 'Amicus-宣讲PPT-测试badcase', 'amicus-presentation.html');
const bundlePath = path.join(process.cwd(), 'dist', 'editor.bundle.js');

test('诊断拖动问题根本原因', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  
  await page.goto(`file://${testFilePath}?edit=1`);
  await page.waitForSelector('.slide', { timeout: 10000 });
  
  const bundleContent = fs.readFileSync(bundlePath, 'utf-8');
  await page.addScriptTag({ content: bundleContent });
  await page.waitForTimeout(500);
  
  await page.evaluate(() => window.__openclawEditor?.enable());
  await page.waitForTimeout(1000);
  
  // 1. 检查图片默认拖拽行为
  const imgDraggable = await page.evaluate(() => {
    const img = document.querySelector('img.avatar-image');
    return {
      draggable: img?.draggable,
      userSelect: window.getComputedStyle(img!).userSelect,
      pointerEvents: window.getComputedStyle(img!).pointerEvents,
      webkitUserDrag: (img as any)?.style?.webkitUserDrag
    };
  });
  console.log('图片默认拖拽设置:', imgDraggable);
  
  // 2. 检查原PPT是否有全局事件拦截
  const hasGlobalIntercept = await page.evaluate(() => {
    // 检查是否有人拦截了 mousemove
    const listeners = (window as any)._getEventListeners?.(document) || {};
    return {
      hasMouseDown: document.onmousedown !== null,
      hasMouseMove: document.onmousemove !== null,
      hasMouseUp: document.onmouseup !== null,
      hasPointerDown: document.onpointerdown !== null
    };
  });
  console.log('全局事件拦截:', hasGlobalIntercept);
  
  // 3. 检查拖动管理器状态
  const dragState = await page.evaluate(() => {
    const editor = (window as any).__openclawEditor;
    return {
      dragManagerExists: !!editor?.dragManager,
      isActive: editor?.dragManager?.isActive?.(),
      hasOnDragEnd: typeof editor?.dragManager?.setOnDragEnd === 'function'
    };
  });
  console.log('拖动管理器状态:', dragState);
  
  // 4. 检查 editorStyles 是否禁止了拖拽
  const styles = await page.evaluate(() => {
    const img = document.querySelector('img.avatar-image');
    const computed = window.getComputedStyle(img!);
    return {
      cursor: computed.cursor,
      pointerEvents: computed.pointerEvents,
      touchAction: computed.touchAction,
      userSelect: computed.userSelect
    };
  });
  console.log('图片CSS样式:', styles);
  
  // 5. 模拟拖动并检查事件是否触发
  await page.evaluate(() => {
    (window as any).dragEvents = [];
    const img = document.querySelector('img.avatar-image');
    
    ['mousedown', 'mousemove', 'mouseup', 'pointerdown', 'pointermove', 'pointerup'].forEach(evt => {
      img?.addEventListener(evt, (e) => {
        (window as any).dragEvents.push({
          type: evt,
          target: (e.target as HTMLElement).tagName,
          time: Date.now()
        });
      }, true);
    });
  });
  
  // 点击并拖动图片
  const box = await page.locator('img.avatar-image').boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width/2 + 50, box.y + box.height/2 + 50);
    await page.mouse.up();
  }
  await page.waitForTimeout(500);
  
  const events = await page.evaluate(() => (window as any).dragEvents);
  console.log('触发的事件:', events);
});
