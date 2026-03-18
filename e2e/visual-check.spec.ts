import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const testFilePath = path.join(process.cwd(), 'Amicus-宣讲PPT-测试badcase', 'amicus-presentation.html');
const bundlePath = path.join(process.cwd(), 'dist', 'editor.bundle.js');

test('visual check - full editor view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  
  // Navigate and inject editor
  await page.goto(`file://${testFilePath}`);
  await page.waitForSelector('.slide', { timeout: 10000 });
  
  const bundleContent = fs.readFileSync(bundlePath, 'utf-8');
  await page.addScriptTag({ content: bundleContent });
  await page.waitForTimeout(500);
  
  await page.evaluate(() => window.__openclawEditor?.enable());
  await page.waitForSelector('#slide-editor-navigator', { timeout: 10000 });
  await page.waitForTimeout(1000);
  
  // Full view
  await page.screenshot({ path: 'test-results/amicus-editor-slide1.png', fullPage: true });
  
  // Click h1
  const h1 = page.locator('h1').first();
  await h1.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/amicus-editor-h1-selected.png', fullPage: true });
  
  // Navigate to slide 2
  await page.locator('.slide-editor-thumbnail').nth(1).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/amicus-editor-slide2.png', fullPage: true });
  
  // Navigate to slide 3
  await page.locator('.slide-editor-thumbnail').nth(2).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/amicus-editor-slide3.png', fullPage: true });
});
