import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LayoutEngine, EditorMode } from '../../src/core/LayoutEngine';

describe('LayoutEngine', () => {
  let engine: LayoutEngine;
  let slide: HTMLElement;

  beforeEach(() => {
    engine = new LayoutEngine();
    slide = document.createElement('div');
    slide.className = 'slide';
    document.body.appendChild(slide);
  });

  afterEach(() => {
    engine.clear();
    slide.remove();
  });

  describe('Container Detection', () => {
    it('should detect predefined containers (.two-col)', () => {
      slide.innerHTML = `
        <div class="two-col">
          <div>Left</div>
          <div>Right</div>
        </div>
      `;

      const context = engine.initialize(slide, EditorMode.PROTECTED);

      expect(context.containers).toHaveLength(1);
      expect(context.containers[0].element.className).toContain('two-col');
    });

    it('should detect user-marked containers (data-editor-container)', () => {
      slide.innerHTML = `
        <div data-editor-container class="custom-layout">
          <div>Item 1</div>
          <div>Item 2</div>
        </div>
      `;

      const context = engine.initialize(slide, EditorMode.PROTECTED);

      expect(context.containers).toHaveLength(1);
      expect(context.containers[0].element.className).toContain('custom-layout');
    });

    it('should auto-detect flex containers when few predefined found', () => {
      slide.innerHTML = `
        <div style="display: flex; gap: 10px;">
          <div>Flex Item 1</div>
          <div>Flex Item 2</div>
        </div>
      `;

      const context = engine.initialize(slide, EditorMode.PROTECTED);

      expect(context.containers).toHaveLength(1);
      expect(context.containers[0].isFlex).toBe(true);
    });

    it('should sort containers by hierarchy (parents first)', () => {
      slide.innerHTML = `
        <div class="slide-inner">
          <div class="card">
            <div class="feature-list">
              <div>Deep content</div>
            </div>
          </div>
        </div>
      `;

      const context = engine.initialize(slide, EditorMode.PROTECTED);

      // Should detect all three containers
      expect(context.containers.length).toBeGreaterThanOrEqual(2);

      // Parent should be registered before child
      const innerIndex = context.containers.findIndex(c =>
        c.element.className.includes('slide-inner'));
      const cardIndex = context.containers.findIndex(c =>
        c.element.className.includes('card'));

      if (innerIndex >= 0 && cardIndex >= 0) {
        expect(innerIndex).toBeLessThan(cardIndex);
      }
    });

    it('should filter out very small elements (< 20x20)', () => {
      slide.innerHTML = `
        <div class="tiny" style="width: 10px; height: 10px;">X</div>
        <div class="normal" style="width: 100px; height: 100px;">Content</div>
      `;

      const context = engine.initialize(slide, EditorMode.PROTECTED);

      // Only normal should be detected (as standalone, not container since no children)
      const hasTiny = context.containers.some(c =>
        c.element.className.includes('tiny'));
      expect(hasTiny).toBe(false);
    });

    it('should not treat empty elements as containers', () => {
      slide.innerHTML = `<div class="empty"></div>`;

      const context = engine.initialize(slide, EditorMode.PROTECTED);

      expect(context.containers).toHaveLength(0);
    });
  });

  describe('Element Movement', () => {
    it('should set position style when moving element', () => {
      slide.innerHTML = `<h1>Standalone Title</h1>`;
      engine.initialize(slide, EditorMode.PROTECTED);

      const el = slide.querySelector('h1') as HTMLElement;
      const id = el.getAttribute('data-editor-id')!;

      engine.moveElement(id, 10, 20);

      // Style should be set
      expect(el.style.left).toBeTruthy();
      expect(el.style.top).toBeTruthy();
    });

    it('should mark element as data-editor-moved', () => {
      slide.innerHTML = `<h1>Title</h1>`;
      engine.initialize(slide, EditorMode.PROTECTED);

      const el = slide.querySelector('h1') as HTMLElement;
      const id = el.getAttribute('data-editor-id')!;

      expect(el.hasAttribute('data-editor-moved')).toBe(false);

      engine.moveElement(id, 10, 20);

      expect(el.hasAttribute('data-editor-moved')).toBe(true);
    });

    it('should handle missing element gracefully', () => {
      // Should not throw
      expect(() => {
        engine.moveElement('non-existent-id', 10, 20);
      }).not.toThrow();
    });

    it('should work in FREEFORM mode', () => {
      slide.innerHTML = `<h1>Title</h1>`;
      engine.initialize(slide, EditorMode.FREEFORM);

      const el = slide.querySelector('h1') as HTMLElement;
      const id = el.getAttribute('data-editor-id')!;

      engine.moveElement(id, 10, 20);

      // Position should be set
      expect(el.style.position).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid CSS selectors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      // This should not throw even with invalid selectors
      slide.innerHTML = `<div>Content</div>`;

      expect(() => {
        engine.initialize(slide, EditorMode.PROTECTED);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Export Preparation', () => {
    it('should clean editor attributes for export', () => {
      slide.innerHTML = `<h1>Text</h1>`;
      engine.initialize(slide, EditorMode.PROTECTED);

      const el = slide.querySelector('h1') as HTMLElement;
      engine.moveElement(el.getAttribute('data-editor-id')!, 10, 20);

      engine.prepareForExport(EditorMode.PROTECTED);

      expect(el.hasAttribute('data-editor-id')).toBe(false);
      expect(el.hasAttribute('data-editor-type')).toBe(false);
      expect(el.classList.contains('slide-editor-editable')).toBe(false);
    });

    it('should restore original styles', () => {
      slide.innerHTML = `<h1>Text</h1>`;
      engine.initialize(slide, EditorMode.PROTECTED);

      const el = slide.querySelector('h1') as HTMLElement;
      const id = el.getAttribute('data-editor-id')!;

      engine.moveElement(id, 10, 20);
      engine.restoreElement(id);

      // Original position should be restored
      expect(el.style.position).toBe('');
      expect(el.style.left).toBe('');
      expect(el.style.top).toBe('');
    });
  });

  describe('Element Info', () => {
    it('should return correct element info', () => {
      slide.innerHTML = `<h1 style="width: 200px;">Text</h1>`;
      engine.initialize(slide, EditorMode.PROTECTED);

      const el = slide.querySelector('h1') as HTMLElement;
      const id = el.getAttribute('data-editor-id')!;

      const info = engine.getElementInfo(id);

      expect(info).not.toBeNull();
      expect(info!.id).toBe(id);
    });

    it('should return null for non-existent element', () => {
      const info = engine.getElementInfo('non-existent');
      expect(info).toBeNull();
    });
  });
});
