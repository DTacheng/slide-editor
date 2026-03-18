import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LayoutEngine, EditorMode } from '../../src/core/LayoutEngine';

/**
 * 用户反馈：容器内的图片无法单独选中
 * 场景：第7页 .reveal-scale 容器内有图片，应该能单独编辑
 */
describe('Nested Image Editable Tests', () => {
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

  it('should allow img inside .reveal-scale to be individually editable', () => {
    slide.innerHTML = `
      <div class="reveal-scale">
        <img src="diagram.png" alt="Diagram" style="width: 400px;">
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    // 图片应该有独立的 data-editor-id
    const img = slide.querySelector('img');
    expect(img!.hasAttribute('data-editor-id')).toBe(true);
    expect(img!.getAttribute('data-editor-type')).toBe('image');
  });

  it('should allow img inside .card to be individually editable', () => {
    slide.innerHTML = `
      <div class="card">
        <h3>Card Title</h3>
        <img src="image.png" alt="Image" style="width: 200px;">
        <p>Card description</p>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const img = slide.querySelector('img');
    expect(img!.hasAttribute('data-editor-id')).toBe(true);
  });

  it('should allow moving nested img independently', () => {
    // Create a proper slide structure with dimensions
    slide.style.cssText = 'position: relative; width: 1200px; height: 675px;';
    slide.innerHTML = `
      <div class="two-col" style="width: 1000px; height: 500px;">
        <div class="col reveal-scale" style="width: 400px; height: 300px;">
          <img src="chart.png" alt="Chart" class="slide-image" style="width: 200px; height: 150px;">
        </div>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const img = slide.querySelector('img') as HTMLElement;
    const id = img.getAttribute('data-editor-id')!;

    // Verify image is registered
    expect(id).toBeTruthy();

    // 应该能单独移动图片
    engine.moveElement(id, 10, 20);

    // In jsdom, getComputedStyle may return 'static' so position might not change
    // but the style values should be set
    expect(img.style.left).toBe('10px');
    expect(img.style.top).toBe('20px');
    expect(img.hasAttribute('data-editor-moved')).toBe(true);
  });

  it('should detect img inside nested containers', () => {
    slide.innerHTML = `
      <div class="slide-inner">
        <div class="two-col">
          <div class="reveal-scale">
            <img src="nested.png" alt="Nested Image">
          </div>
        </div>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const img = slide.querySelector('img');
    expect(img!.hasAttribute('data-editor-id')).toBe(true);
    expect(img!.getAttribute('data-editor-type')).toBe('image');
  });

  it('should register nested img as editable element', () => {
    slide.innerHTML = `
      <div class="card">
        <img src="test.png" alt="Test">
      </div>
    `;

    const context = engine.initialize(slide, EditorMode.PROTECTED);

    // 找到图片对应的 element info
    const imgInfo = context.standaloneElements.find(
      el => el.type === 'image'
    );

    expect(imgInfo).toBeDefined();
    // v0.3.1+: All elements are registered equally, isInContainer is always false
    // The important thing is that nested images are detected and editable
    expect(imgInfo!.isInContainer).toBe(false);
    expect(imgInfo!.element.hasAttribute('data-editor-id')).toBe(true);
  });

  it('should not register the same img twice', () => {
    slide.innerHTML = `
      <div class="reveal-scale">
        <img src="test.png" alt="Test">
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const img = slide.querySelector('img') as HTMLElement;
    const editorId = img.getAttribute('data-editor-id');

    // 图片应该只有一个 data-editor-id
    expect(editorId).toBeTruthy();

    // 再次初始化，ID 不应该改变
    engine.initialize(slide, EditorMode.PROTECTED);
    expect(img.getAttribute('data-editor-id')).toBe(editorId);
  });

  it('should work with FREEFORM mode for nested images', () => {
    slide.innerHTML = `
      <div class="card">
        <img src="test.png" alt="Test" style="width: 100px;">
      </div>
    `;

    engine.initialize(slide, EditorMode.FREEFORM);

    const img = slide.querySelector('img') as HTMLElement;
    const id = img.getAttribute('data-editor-id')!;

    engine.moveElement(id, 10, 20);

    // 在 FREEFORM 模式下，位置应该是 absolute
    expect(img.style.position).toBe('absolute');
    expect(img.hasAttribute('data-editor-moved')).toBe(true);
  });
});
