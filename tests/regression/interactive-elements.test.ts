import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LayoutEngine, EditorMode } from '../../src/core/LayoutEngine';

/**
 * 用户反馈：第2页点击交互后弹出的 .response-card 无法编辑
 */
describe('Interactive Elements Editable Tests', () => {
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

  it('should detect .response-card as editable unit', () => {
    slide.innerHTML = `
      <div class="pain-point-container">
        <div class="pain-point clickable" onclick="showResponse()">
          <p>"复杂的刑事案件..."</p>
        </div>
        <div class="response-card" id="response-0">
          <h3>深度信息检索</h3>
          <p>AI智能体自动拆解...</p>
        </div>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    // response-card 应该有独立的编辑器 ID
    const responseCard = slide.querySelector('.response-card');
    expect(responseCard!.hasAttribute('data-editor-id')).toBe(true);
  });

  it('should detect elements with onclick as interactive', () => {
    slide.innerHTML = `
      <div class="card">
        <div class="clickable-element" onclick="handleClick()">
          <span>Click me</span>
        </div>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    // 有 onclick 的元素应该可编辑
    const clickable = slide.querySelector('.clickable-element');
    expect(clickable!.hasAttribute('data-editor-id')).toBe(true);
  });

  it('should allow editing text inside response-card', () => {
    slide.innerHTML = `
      <div class="response-card">
        <h3>Title</h3>
        <p>Description text</p>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const card = slide.querySelector('.response-card') as HTMLElement;
    const id = card.getAttribute('data-editor-id')!;

    // 应该能获取元素信息
    const info = engine.getElementInfo(id);
    expect(info).not.toBeNull();
    expect(info!.type).toBe('text');
  });

  it('should detect data-interactive marked elements', () => {
    slide.innerHTML = `
      <div class="container">
        <div data-interactive class="interactive-widget">
          <span>Widget Content</span>
        </div>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const widget = slide.querySelector('.interactive-widget');
    expect(widget!.hasAttribute('data-editor-id')).toBe(true);
  });

  it('should detect buttons inside containers', () => {
    slide.innerHTML = `
      <div class="card">
        <h3>Card Title</h3>
        <p>Card content</p>
        <button>Click Me</button>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const button = slide.querySelector('button');
    expect(button!.hasAttribute('data-editor-id')).toBe(true);
  });

  it('should detect .btn class elements', () => {
    slide.innerHTML = `
      <div class="demo-layout">
        <div class="demo-info-card">
          <span class="btn btn-primary">Action</span>
        </div>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const btn = slide.querySelector('.btn');
    expect(btn!.hasAttribute('data-editor-id')).toBe(true);
  });

  it('should detect modals and popups', () => {
    slide.innerHTML = `
      <div class="slide-content">
        <div class="modal" id="myModal">
          <h2>Modal Title</h2>
          <p>Modal content</p>
        </div>
        <div class="popup tooltip">
          <span>Popup content</span>
        </div>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const modal = slide.querySelector('.modal');
    const popup = slide.querySelector('.popup');

    expect(modal!.hasAttribute('data-editor-id')).toBe(true);
    expect(popup!.hasAttribute('data-editor-id')).toBe(true);
  });

  it('should detect contenteditable elements', () => {
    slide.innerHTML = `
      <div class="card">
        <div contenteditable="true" class="editable-text">
          Editable content
        </div>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const editable = slide.querySelector('[contenteditable]');
    expect(editable!.hasAttribute('data-editor-id')).toBe(true);
  });

  it('should detect .editable class elements', () => {
    slide.innerHTML = `
      <div class="container">
        <div class="editable">
          <p>This is editable</p>
        </div>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const editable = slide.querySelector('.editable');
    expect(editable!.hasAttribute('data-editor-id')).toBe(true);
  });

  it('should allow moving interactive elements independently', () => {
    // Set up slide with dimensions for proper layout calculation
    slide.style.cssText = 'position: relative; width: 1200px; height: 675px;';
    slide.innerHTML = `
      <div class="pain-point-container" style="width: 800px; height: 400px;">
        <div class="response-card" id="response-1" style="width: 300px; height: 200px;">
          <h3>Test Response</h3>
        </div>
      </div>
    `;

    engine.initialize(slide, EditorMode.PROTECTED);

    const responseCard = slide.querySelector('.response-card') as HTMLElement;
    const id = responseCard.getAttribute('data-editor-id')!;

    // Verify element is registered
    expect(id).toBeTruthy();

    // 应该能单独移动 response-card
    engine.moveElement(id, 15, 25);

    // Style values should be set
    expect(responseCard.style.left).toBe('15px');
    expect(responseCard.style.top).toBe('25px');
    expect(responseCard.hasAttribute('data-editor-moved')).toBe(true);
  });

  it('should mark interactive elements as editable', () => {
    slide.innerHTML = `
      <div class="card">
        <button class="action-btn">Action</button>
      </div>
    `;

    const context = engine.initialize(slide, EditorMode.PROTECTED);

    const btnInfo = context.standaloneElements.find(
      el => el.element.tagName.toLowerCase() === 'button'
    );

    expect(btnInfo).toBeDefined();
    // v0.3.1+: All elements are registered equally, isInContainer is always false
    // The important thing is that the element is detected and editable
    expect(btnInfo!.isInContainer).toBe(false);
    expect(btnInfo!.element.hasAttribute('data-editor-id')).toBe(true);
  });
});
