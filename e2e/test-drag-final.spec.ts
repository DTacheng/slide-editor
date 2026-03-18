import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const testFilePath = path.join(process.cwd(), 'Amicus-宣讲PPT-测试badcase', 'amicus-presentation.html');
const bundlePath = path.join(process.cwd(), 'dist', 'editor.bundle.js');

test('最终拖动测试', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  
  await page.goto(`file://${testFilePath}`);
  await page.waitForSelector('.slide', { timeout: 10000 });
  
  const bundleContent = fs.readFileSync(bundlePath, 'utf-8');
  await page.addScriptTag({ content: bundleContent });
  await page.waitForTimeout(500);
  
  await page.evaluate(() => window.__openclawEditor?.enable());
  await page.waitForTimeout(1000);
  
  // 1. 点击选中图片
  await page.locator('img.avatar-image').click();
  await page.waitForTimeout(300);
  
  const isSelected = await page.locator('img.avatar-image').evaluate(el => 
    el.classList.contains('slide-editor-selected')
  );
  console.log('✓ 选中状态:', isSelected);
  expect(isSelected).toBe(true);
  
  // 2. 获取原始位置
  const originalBox = await page.locator('img.avatar-image').boundingBox();
  console.log('原始位置:', originalBox);
  
  // 3. 执行拖动
  await page.mouse.move(originalBox!.x + originalBox!.width/2, originalBox!.y + originalBox!.height/2);
  await page.mouse.down();
  await page.mouse.move(originalBox!.x + originalBox!.width/2 + 100, originalBox!.y + originalBox!.height/2 + 100);
  await page.mouse.up();
  await page.waitForTimeout(500);
  
  // 4. 获取新位置
  const newBox = await page.locator('img.avatar-image').boundingBox();
  console.log('新位置:', newBox);
  
  // 5. 验证移动
  const moved = Math.abs(newBox!.x - originalBox!.x) > 50 || Math.abs(newBox!.y - originalBox!.y) > 50;
  console.log('✓ 是否移动:', moved);
  
  expect(moved).toBe(true);
});
