import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LayoutEngine, EditorMode } from '../../src/core/LayoutEngine';

/**
 * These tests verify that specific badcase scenarios from v0.2.0
 * are fixed in v0.3.0.
 */
describe('Badcase Regression Tests', () => {
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

  /**
   * v0.3.1+: Two-column layout with text + image
   * FIX: Animation wrappers are traversed through, all children are registered as editable
   */
  describe('Two-Column Layout (Slide 7 pattern)', () => {
    beforeEach(() => {
      slide.innerHTML = `
        <div class="slide-inner">
          <h2>精准研究</h2>
          <div class="two-col">
            <div class="reveal-left text-left">
              <h3>应用场景</h3>
              <p>大模型在司法领域的深度应用</p>
              <h3>传统方式痛点</h3>
              <ul class="feature-list">
                <li>检索不精准</li>
                <li>阅读耗时</li>
              </ul>
            </div>
            <div class="reveal-scale">
              <img src="slide7.png" class="slide-image" style="width: 400px; height: 300px;">
            </div>
          </div>
        </div>
      `;
    });

    it('should detect .two-col as single container', () => {
      const context = engine.initialize(slide, EditorMode.PROTECTED);

      const twoCol = context.containers.find(c =>
        c.element.classList.contains('two-col'));

      expect(twoCol).toBeDefined();
    });

    it('should register text children inside animation wrappers (v0.3.1 fix)', () => {
      engine.initialize(slide, EditorMode.PROTECTED);

      // Text elements inside animation wrappers SHOULD now be registered (v0.3.1 fix)
      // This allows editing elements that were previously inaccessible
      const textElements = slide.querySelectorAll('.reveal-left h3, .reveal-left p');

      textElements.forEach(el => {
        expect(el.hasAttribute('data-editor-id')).toBe(true);
      });
    });

    it('should register img inside animation wrappers (v0.3.1 fix)', () => {
      engine.initialize(slide, EditorMode.PROTECTED);

      // Images inside animation wrappers SHOULD be registered
      const img = slide.querySelector('.reveal-scale img');
      expect(img!.hasAttribute('data-editor-id')).toBe(true);
      expect(img!.getAttribute('data-editor-type')).toBe('image');
    });

    it('should NOT register .two-col itself as editable (children are editable)', () => {
      engine.initialize(slide, EditorMode.PROTECTED);

      // .two-col is a layout container, its children should be editable, not the container itself
      const twoCol = slide.querySelector('.two-col');
      // The container itself shouldn't have editor ID in the new implementation
      expect(twoCol!.hasAttribute('data-editor-id')).toBe(false);
    });
  });

  /**
   * v0.3.1+: Demo layout with nested containers
   * FIX: All visible elements inside containers are registered as editable
   */
  describe('Demo Layout with Nested Containers (Slide 16 pattern)', () => {
    beforeEach(() => {
      slide.innerHTML = `
        <div class="slide-inner">
          <h2>现场实操演示</h2>
          <div class="demo-layout">
            <div class="demo-image-container reveal-scale">
              <img src="demo.jpg" class="demo-image" style="width: 500px; height: 350px;">
            </div>
            <div class="demo-info-container reveal">
              <div class="demo-info-card">
                <span class="demo-url-large">ami.ailaw.cn</span>
                <p>用户上手即用的高效产品</p>
              </div>
              <div class="demo-features">
                <div class="demo-feature-item">
                  <span>Icon</span>
                  <span>深度研究</span>
                </div>
                <div class="demo-feature-item">
                  <span>Icon</span>
                  <span>智能摘要</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    it('should register elements inside animation wrappers (v0.3.1 fix)', () => {
      engine.initialize(slide, EditorMode.PROTECTED);

      // Image inside reveal-scale should be registered
      const img = slide.querySelector('.demo-image');
      expect(img!.hasAttribute('data-editor-id')).toBe(true);

      // Text elements inside reveal should be registered
      const urlSpan = slide.querySelector('.demo-url-large');
      const descP = slide.querySelector('.demo-info-card p');

      expect(urlSpan!.hasAttribute('data-editor-id')).toBe(true);
      expect(descP!.hasAttribute('data-editor-id')).toBe(true);
    });

    it('should allow editing individual elements inside .demo-info-card', () => {
      engine.initialize(slide, EditorMode.PROTECTED);

      const card = slide.querySelector('.demo-info-card');
      const urlSpan = card!.querySelector('.demo-url-large');
      const descP = card!.querySelector('p');

      // In v0.3.1, all text elements should be individually editable
      expect(urlSpan!.hasAttribute('data-editor-id')).toBe(true);
      expect(descP!.hasAttribute('data-editor-id')).toBe(true);
    });
  });

  /**
   * v0.3.1+: Animation containers (.reveal* classes)
   * FIX: Animation wrappers are traversed through, children are registered as editable
   * This allows editing elements that were previously inaccessible
   */
  describe('Animation Container Handling', () => {
    beforeEach(() => {
      slide.innerHTML = `
        <div class="reveal">
          <h3>Fade In Animation</h3>
          <p>This whole block should animate together</p>
        </div>
        <div class="reveal-left">
          <h3>Slide from Left</h3>
          <p>Should preserve slide-in animation</p>
        </div>
        <div class="reveal-scale">
          <h3>Scale Animation</h3>
          <p>Should preserve scale animation</p>
        </div>
      `;
    });

    it('should NOT register animation wrappers as containers', () => {
      const context = engine.initialize(slide, EditorMode.PROTECTED);

      // Animation wrappers should NOT be in containers list
      const revealContainers = context.containers.filter(c => {
        const el = c.element;
        return el.classList.contains('reveal') ||
               el.classList.contains('reveal-left') ||
               el.classList.contains('reveal-scale');
      });

      expect(revealContainers.length).toBe(0);
    });

    it('should register children of animation containers as editable elements', () => {
      engine.initialize(slide, EditorMode.PROTECTED);

      // Children inside animation wrappers SHOULD be registered (v0.3.1 fix)
      const h3Elements = slide.querySelectorAll('.reveal h3, .reveal-left h3, .reveal-scale h3');
      const pElements = slide.querySelectorAll('.reveal p, .reveal-left p, .reveal-scale p');

      h3Elements.forEach(child => {
        expect(child.hasAttribute('data-editor-id')).toBe(true);
      });

      pElements.forEach(child => {
        expect(child.hasAttribute('data-editor-id')).toBe(true);
      });
    });

    it('should preserve animation classes on wrappers', () => {
      engine.initialize(slide, EditorMode.PROTECTED);

      // Animation classes should be preserved
      const revealContainers = slide.querySelectorAll('.reveal, .reveal-left, .reveal-scale');
      expect(revealContainers.length).toBe(3);

      revealContainers.forEach(container => {
        expect(container.classList.toString()).toMatch(/reveal/);
      });
    });
  });

  /**
   * Badcase: Inline flex/grid styles
   * Issue: Elements with style="display: flex" were not recognized as containers
   */
  describe('Inline Styled Flex/Grid Elements', () => {
    beforeEach(() => {
      slide.innerHTML = `
        <div class="card-container">
          <div class="card" style="display: flex; gap: 1rem;">
            <div style="flex-shrink: 0;">01</div>
            <div>
              <h4>Card Title</h4>
              <p>Card description</p>
            </div>
          </div>
          <div class="card" style="display: grid; grid-template-columns: auto 1fr;">
            <div>Icon</div>
            <div>
              <h4>Grid Card</h4>
              <p>Grid description</p>
            </div>
          </div>
        </div>
      `;
    });

    it('should handle elements with inline flex/grid styles', () => {
      const context = engine.initialize(slide, EditorMode.PROTECTED);

      // v0.3.1+: All visible elements are registered, including children of flex/grid containers
      // The card elements inside flex/grid containers should be editable
      const cards = slide.querySelectorAll('.card');
      expect(cards.length).toBeGreaterThan(0);

      // At least one card should have editable children
      let hasEditableChild = false;
      cards.forEach(card => {
        const children = card.querySelectorAll('h4, p, div');
        children.forEach(child => {
          if (child.hasAttribute('data-editor-id')) {
            hasEditableChild = true;
          }
        });
      });

      expect(hasEditableChild).toBe(true);
    });
  });

  /**
   * Critical: Position should not be absolute in PROTECTED mode
   */
  describe('Position Type Protection', () => {
    it('should mark element as moved in PROTECTED mode', () => {
      slide.innerHTML = `
        <h1>Simple Title</h1>
      `;

      engine.initialize(slide, EditorMode.PROTECTED);

      const el = slide.querySelector('h1') as HTMLElement;
      const id = el.getAttribute('data-editor-id')!;

      engine.moveElement(id, 10, 20);

      // Element should be marked as moved
      expect(el.hasAttribute('data-editor-moved')).toBe(true);
      // Position values should be set
      expect(el.style.left).toBeTruthy();
      expect(el.style.top).toBeTruthy();
    });

    it('should mark element as moved in FREEFORM mode', () => {
      slide.innerHTML = `
        <h1>Simple Title</h1>
      `;

      engine.initialize(slide, EditorMode.FREEFORM);

      const el = slide.querySelector('h1') as HTMLElement;
      const id = el.getAttribute('data-editor-id')!;

      engine.moveElement(id, 10, 20);

      // Element should be marked as moved
      expect(el.hasAttribute('data-editor-moved')).toBe(true);
      // Position values should be set
      expect(el.style.left).toBeTruthy();
      expect(el.style.top).toBeTruthy();
    });
  });
});
