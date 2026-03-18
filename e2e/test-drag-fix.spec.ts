import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const testFilePath = path.join(process.cwd(), 'Amicus-宣讲PPT-测试badcase', 'amicus-presentation.html');
const bundlePath = path.join(process.cwd(), 'dist', 'editor.bundle.js');

test('验证修复 draggable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  
  await page.goto(`file://${testFilePath}`);
  await page.waitForSelector('.slide', { timeout: 10000 });
  
  const bundleContent = fs.readFileSync(bundlePath, 'utf-8');
  await page.addScriptTag({ content: bundleContent });
  await page.waitForTimeout(500);
  
  // 在启用编辑器前，先禁用所有图片的 draggable
  await page.evaluate(() => {
    document.querySelectorAll('img').forEach(img => {
      img.draggable = false;
      (img as HTMLElement).style.webkitUserDrag = 'none';
    });
  });
  
  await page.evaluate(() => window.__openclawEditor?.enable());
  await page.waitForTimeout(1000);
  
  // 点击选中图片
  await page.locator('img.avatar-image').click();
  await page.waitForTimeout(300);
  
  // 检查是否选中
  const isSelected = await page.locator('img.avatar-image').evaluate(el => 
    el.classList.contains('slide-editor-selected')
  );
  console.log('选中状态:', isSelected);
  
  // 尝试拖动
  const box = await page.locator('img.avatar-image').boundingBox();
  if (box && isSelected) {
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width/2 + 100, box.y + box.height/2 + 100);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // 检查位置是否改变
    const newBox = await page.locator('img.avatar-image').boundingBox();
    console.log('原始位置:', box);
    console.log('新位置:', newBox);
    
    const moved = Math.abs(newBox!.x - box.x) > 10 || Math.abs(newBox!.y - box.y) > 10;
    console.log('是否移动:', moved);
  }
});
