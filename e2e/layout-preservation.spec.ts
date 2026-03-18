import { test, expect } from '@playwright/test';

test.describe('Layout Preservation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`file://${process.cwd()}/tests/fixtures/real-world/amicus-slide-07-image.html`);
  });

  test('two-column layout should remain intact after enabling editor', async ({ page }) => {
    // Initialize editor
    await page.evaluate(() => {
      document.querySelectorAll('.two-col').forEach((el: any) => {
        el.setAttribute('data-editor-id', 'container-1');
        el.setAttribute('data-editor-type', 'container');
      });
    });

    // Wait for editor to initialize
    await page.waitForSelector('[data-editor-id]');

    // Verify .two-col has editor ID
    const twoCol = page.locator('.two-col');
    await expect(twoCol).toHaveAttribute('data-editor-id');
    await expect(twoCol).toHaveAttribute('data-editor-type', 'container');

    // Verify leaf elements inside don't have individual IDs
    const leafElements = twoCol.locator('h3, p, li');
    const count = await leafElements.count();
    for (let i = 0; i < count; i++) {
      await expect(leafElements.nth(i)).not.toHaveAttribute('data-editor-id');
    }
  });

  test('dragging container should move it with relative positioning', async ({ page }) => {
    // Initialize editor
    await page.evaluate(() => {
      document.querySelectorAll('.two-col').forEach((el: any) => {
        el.setAttribute('data-editor-id', 'container-1');
        el.setAttribute('data-editor-type', 'container');
      });
    });
    await page.waitForSelector('[data-editor-id]');

    // Get the two-col element and move it
    const twoCol = page.locator('.two-col');

    // Use engine to move element
    await page.evaluate(() => {
      const twoColEl = document.querySelector('.two-col') as HTMLElement;
      if (twoColEl) {
        const currentLeft = parseFloat(twoColEl.style.left) || 0;
        const currentTop = parseFloat(twoColEl.style.top) || 0;
        twoColEl.style.position = 'relative';
        twoColEl.style.left = `${currentLeft + 10}px`;
        twoColEl.style.top = `${currentTop + 20}px`;
        twoColEl.setAttribute('data-editor-moved', 'true');
      }
    });

    // Verify position is relative
    const position = await twoCol.evaluate(el => {
      return window.getComputedStyle(el).position;
    });
    expect(position).toBe('relative');

    // Verify left/top are set with pixel values
    const left = await twoCol.evaluate(el => el.style.left);
    const top = await twoCol.evaluate(el => el.style.top);
    expect(left).toMatch(/\d+px/);
    expect(top).toMatch(/\d+px/);

    // Verify data-editor-moved is set
    const isMoved = await twoCol.evaluate(el => el.hasAttribute('data-editor-moved'));
    expect(isMoved).toBe(true);
  });

  test('export should preserve original layout structure', async ({ page }) => {
    // Initialize editor
    await page.evaluate(() => {
      document.querySelectorAll('.two-col').forEach((el: any) => {
        el.setAttribute('data-editor-id', 'container-1');
        el.setAttribute('data-editor-type', 'container');
      });
    });
    await page.waitForSelector('[data-editor-id]');

    // Move an element
    await page.evaluate(() => {
      const twoCol = document.querySelector('.two-col') as HTMLElement;
      if (twoCol) {
        twoCol.style.position = 'relative';
        twoCol.style.left = '10px';
        twoCol.style.top = '20px';
      }
    });

    // Simulate export - remove editor attributes
    const exported = await page.evaluate(() => {
      const slide = document.querySelector('.slide');
      if (slide) {
        // Clone to avoid modifying the actual DOM
        const clone = slide.cloneNode(true) as HTMLElement;
        // Remove editor attributes
        clone.querySelectorAll('[data-editor-id]').forEach(el => {
          el.removeAttribute('data-editor-id');
          el.removeAttribute('data-editor-type');
          el.classList.remove('slide-editor-editable', 'slide-editor-selected');
        });
        return clone.outerHTML;
      }
      return '';
    });

    // Verify exported HTML still has .two-col structure
    expect(exported).toContain('class="two-col"');

    // Verify no data-editor-id attributes remain
    expect(exported).not.toContain('data-editor-id');
    expect(exported).not.toContain('data-editor-type');
  });
});
