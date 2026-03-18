/**
 * LayoutEngine - Core layout management for Slide Editor v0.3.0
 *
 * Key improvements over v0.2.0:
 * - Uses 'relative' positioning instead of 'absolute' to preserve layout flow
 * - Container-level editing instead of element-level拆解
 * - Two modes: PROTECTED (default) and FREEFORM (with warning)
 *
 * v0.3.1+: Complete refactor for real-world cases
 * - Recursive detection of ALL visible elements (not just predefined containers)
 * - Smart element detection that handles nested animation wrappers
 * - Hidden element support for interactive content
 */

export enum EditorMode {
  PROTECTED = 'protected', // Default: preserve layout, use relative positioning
  FREEFORM = 'freeform', // Optional: convert to absolute (with warning)
}

export interface ContainerInfo {
  id: string;
  element: HTMLElement;
  type: 'flex' | 'grid' | 'block';
  isFlex: boolean;
  isGrid: boolean;
  rect: DOMRect;
}

export interface ElementInfo {
  id: string;
  element: HTMLElement;
  type: 'text' | 'image' | 'container';
  originalPosition: string;
  isInContainer: boolean;
}

// Animation wrapper classes that should be traversed through, not treated as containers
const ANIMATION_WRAPPER_CLASSES = [
  'reveal',
  'reveal-left',
  'reveal-right',
  'reveal-up',
  'reveal-down',
  'reveal-scale',
  'reveal-fade',
  'reveal-slide',
];

// Tags that should never be treated as editable elements
const SKIP_TAGS = ['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'BR', 'HR'];

// Tags that are always content elements (not containers)
const CONTENT_TAGS = ['IMG', 'VIDEO', 'CANVAS', 'SVG', 'IFRAME', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'];

interface OriginalStyles {
  position: string;
  left: string;
  top: string;
  width: string;
  height: string;
  marginLeft: string;
  marginTop: string;
}

export interface LayoutContext {
  mode: EditorMode;
  containers: ContainerInfo[];
  standaloneElements: ElementInfo[];
}

export class LayoutEngine {
  private mode: EditorMode = EditorMode.PROTECTED;
  private containers: Map<string, ContainerInfo> = new Map();
  private elements: Map<string, ElementInfo> = new Map();
  private originalStyles: Map<HTMLElement, OriginalStyles> = new Map();
  private idCounter = 0;
  private hiddenElements: HTMLElement[] = [];
  private currentHiddenIndex: number = -1; // -1 means none shown
  private hiddenElementsVisible: boolean = false;

  // Legacy: Container selectors (kept for compatibility)
  private predefinedSelectors = [
    '.card',
    '.container',
    '.two-col',
    '.three-col',
    '.grid',
    '.feature-list',
    '.demo-layout',
    '.demo-info-card',
    '.demo-info-container',
    '.demo-image-container',
    '.demo-features',
    '.stat-grid',
    '.pain-point-container',
    '.evolution-timeline',
    '.pain-point-left',
    '.pain-point-right',
    '.response-card',
    // HTML native containers
    'ul',
    'ol',
    'dl',
    'table',
    'figure',
    'blockquote',
  ];

  // Selectors for interactive elements
  private interactiveSelectors = [
    'img',
    '[onclick]',
    '[data-interactive]',
    '.response-card',
    '.modal', '.popup',
    '.editable', '[contenteditable]',
    'button', '.btn', '.button',
    // NEW: Statistics and UI components
    '.stat-number', '.stat-label', '.stat-value',
    '.btn-primary', '.btn-secondary',
    '[role="button"]', '[role="link"]',
    '[data-editable]',
    // NEW: Floating buttons and action elements
    '.floating-button', '.action-button', '.fab',
    // NEW: Visual elements that should be editable
    '.logo', '.corner-logo', '.brand-logo',
    // NEW: User-defined hidden editable elements
    '[data-hidden-editable]', '[hidden-editable]',
    // NEW: Card components
    '.card', '.evolution-card', '.info-card', '.feature-card',
  ];

  /**
   * Initialize layout engine for a slide
   * v0.3.1+: Complete refactor - recursive detection of all visible elements
   */
  initialize(slide: HTMLElement, mode: EditorMode): LayoutContext {
    this.mode = mode;
    this.containers.clear();
    this.elements.clear();
    this.hiddenElements = [];
    this.resetHiddenElements(); // Reset hidden element state on slide switch

    // Temporarily show hidden elements for detection
    this.forceShowHiddenElements(slide);

    // v0.3.1+: NEW recursive detection of all visible elements
    // This is the primary detection method that finds ALL editable elements
    const allElements = this.detectAllElements(slide);

    // v0.3.1: Keep legacy container detection for backward compatibility
    // This populates the containers array for code that depends on it
    const legacyContainers = this.detectContainers(slide);
    legacyContainers.forEach(container => {
      if (!this.containers.has(container.id)) {
        this.containers.set(container.id, container);
      }
    });

    // Restore hidden elements
    this.restoreHiddenElements();

    return {
      mode,
      containers: Array.from(this.containers.values()),
      standaloneElements: Array.from(this.elements.values()),
    };
  }

  /**
   * NEW v0.3.1: Recursive detection of ALL visible elements
   * This replaces the old container-based detection that missed nested elements
   */
  private detectAllElements(slide: HTMLElement): ElementInfo[] {
    const elements: ElementInfo[] = [];
    const processed = new Set<HTMLElement>();

    console.log('[LayoutEngine] Starting detection on slide:', slide.className);

    const traverse = (el: HTMLElement, depth: number = 0) => {
      // Skip non-element nodes
      if (!(el instanceof HTMLElement)) return;

      // Skip script, style, and other non-visual elements
      if (SKIP_TAGS.includes(el.tagName)) return;

      // Skip if already processed
      if (processed.has(el)) return;

      // Skip the slide element itself - we only want its children
      if (el === slide) {
        for (let i = 0; i < el.children.length; i++) {
          traverse(el.children[i] as HTMLElement, depth + 1);
        }
        return;
      }

      // Determine if this element should be editable
      const isEditable = this.shouldBeEditable(el);
      const isAnimWrapper = this.isAnimationWrapper(el);

      // Debug logging for key elements
      if (depth <= 3 && (isEditable || isAnimWrapper)) {
        console.log(`[LayoutEngine] Depth ${depth}:`, el.tagName, el.className, {
          isEditable,
          isAnimWrapper,
          hasContent: this.hasVisibleContent(el),
        });
      }

      // Check if this is an animation wrapper - if so, traverse children
      // BUT if the element itself is editable (like h1.reveal), register it too
      if (isAnimWrapper) {
        if (isEditable) {
          // Element like h1.reveal or p.reveal - register as editable
          const elementInfo = this.createAndRegisterElement(el);
          if (elementInfo) {
            elements.push(elementInfo);
            processed.add(el);
          }
          // Don't traverse children of h1/p/span as they are leaf elements
          if (!this.isLeafElement(el)) {
            for (let i = 0; i < el.children.length; i++) {
              traverse(el.children[i] as HTMLElement, depth + 1);
            }
          }
        } else {
          // Pure animation wrapper like div.reveal - traverse children only
          for (let i = 0; i < el.children.length; i++) {
            traverse(el.children[i] as HTMLElement, depth + 1);
          }
        }
        return;
      }

      if (isEditable) {
        const elementInfo = this.createAndRegisterElement(el);
        if (elementInfo) {
          elements.push(elementInfo);
          processed.add(el);
        }

        // For leaf elements (images, text), don't traverse children
        if (this.isLeafElement(el)) {
          return;
        }
      }

      // Traverse children
      for (let i = 0; i < el.children.length; i++) {
        traverse(el.children[i] as HTMLElement, depth + 1);
      }
    };

    // Start traversal from slide's children
    for (let i = 0; i < slide.children.length; i++) {
      traverse(slide.children[i] as HTMLElement, 0);
    }

    console.log(`[LayoutEngine] Detection complete: ${elements.length} elements found`);
    return elements;
  }

  /**
   * Check if element is an animation wrapper that should be traversed through
   */
  private isAnimationWrapper(el: HTMLElement): boolean {
    const className = el.className;
    if (typeof className !== 'string') return false;

    return ANIMATION_WRAPPER_CLASSES.some(wrapperClass =>
      className.includes(wrapperClass)
    );
  }

  /**
   * Check if element should be treated as an editable element
   */
  private shouldBeEditable(el: HTMLElement): boolean {
    // Always editable: images
    if (el.tagName === 'IMG') return true;

    // Always editable: images
    if (el.tagName === 'IMG') return true;

    // Always editable: content elements with text
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P'].includes(el.tagName)) {
      return this.hasVisibleContent(el);
    }

    // Interactive elements
    if (this.interactiveSelectors.some(selector => el.matches(selector))) {
      return true;
    }

    // Elements marked as editable
    if (el.hasAttribute('data-editor-container') || el.classList.contains('editable')) {
      return true;
    }

    // Spans with text content
    if (el.tagName === 'SPAN' && this.hasVisibleContent(el)) {
      return true;
    }

    // Strong, em, b, i tags with text content
    if (['STRONG', 'EM', 'B', 'I', 'MARK', 'SMALL'].includes(el.tagName) && this.hasVisibleContent(el)) {
      return true;
    }

    // Anchor tags with text or images
    if (el.tagName === 'A') {
      return this.hasVisibleContent(el) || el.querySelector('img') !== null;
    }

    // Labels with text
    if (el.tagName === 'LABEL' && this.hasVisibleContent(el)) {
      return true;
    }

    // List items with text
    if ((el.tagName === 'LI' || el.tagName === 'DT' || el.tagName === 'DD') && this.hasVisibleContent(el)) {
      return true;
    }

    // NEW v0.3.3: Support for common UI component DIVs
    // These are specific class-based elements that should be editable
    const editableClasses = [
      'stat-number', 'stat-label', 'stat-value',
      'btn', 'button', 'btn-primary', 'btn-secondary',
      'floating-button', 'action-button', 'fab',
      'logo', 'corner-logo', 'brand-logo',
      'response-card', 'modal', 'popup',
    ];
    if (editableClasses.some(cls => el.classList.contains(cls))) {
      return this.hasVisibleContent(el) || el.classList.contains('logo') || el.classList.contains('corner-logo') || el.classList.contains('brand-logo');
    }

    // NEW v0.3.3: Support for data-editable attribute
    if (el.hasAttribute('data-editable')) {
      return true;
    }

    // v0.3.2+: Generic containers (DIV, SECTION, etc.) are NOT editable elements
    // Only leaf elements (images, text) and specific UI components should be editable
    // This prevents "whole section selection" bug
    return false;
  }

  /**
   * Check if element has visible content
   */
  private hasVisibleContent(el: HTMLElement): boolean {
    const text = el.textContent?.trim();
    return !!text && text.length > 0;
  }

  /**
   * Check if element has direct visible content (not from children)
   */
  private hasDirectVisibleContent(el: HTMLElement): boolean {
    // Check for direct text content
    for (let i = 0; i < el.childNodes.length; i++) {
      const node = el.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if element has children that would be registered as editable
   */
  private hasEditableChildren(el: HTMLElement): boolean {
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i];
      if (this.shouldBeEditable(child as HTMLElement)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if element is a leaf element (no need to traverse children)
   */
  private isLeafElement(el: HTMLElement): boolean {
    // Images and media are always leaves
    if (['IMG', 'VIDEO', 'CANVAS', 'SVG', 'IFRAME', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(el.tagName)) {
      return true;
    }

    // Text elements are leaves
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P'].includes(el.tagName)) {
      return true;
    }

    return false;
  }

  /**
   * Create and register an element
   */
  private createAndRegisterElement(el: HTMLElement): ElementInfo | null {
    // Skip if already has editor ID
    if (el.hasAttribute('data-editor-id')) return null;

    // Skip hidden elements (unless they were force-shown)
    const style = getComputedStyle(el);
    if (style.display === 'none' && !el.dataset.wasHidden) return null;

    const id = `editor-el-${++this.idCounter}`;
    const tagName = el.tagName.toLowerCase();
    const type = tagName === 'img' ? 'image' : 'text';

    const info: ElementInfo = {
      id,
      element: el,
      type,
      originalPosition: style.position,
      isInContainer: false,
    };

    this.elements.set(id, info);
    this.registerStandaloneElement(info);

    return info;
  }

  /**
   * Force show hidden elements for detection
   * This allows editing of elements like .response-card that are hidden by default
   */
  private forceShowHiddenElements(slide: HTMLElement): void {
    this.hiddenElements = [];

    // Find all elements that are hidden but should be editable
    // Expanded list of selectors for v0.3.3
    const selectors = [
      '.response-card',
      '[hidden-editable]',
      '[data-hidden-editable]',
      // Additional hidden element patterns
      '.hidden-editable',
      '[data-editor-hidden]',
      // Common animation/transition hidden states
      '.slide-out',
      '.fade-out',
      // User feedback patterns
      '.feedback-card',
      '.hidden-card',
      // Interactive elements that start hidden
      '.dropdown-menu',
      '.tooltip',
      '.popover',
    ];

    selectors.forEach(selector => {
      try {
        slide.querySelectorAll(selector).forEach((el) => {
          const htmlEl = el as HTMLElement;
          const style = getComputedStyle(htmlEl);

          if (style.display === 'none') {
            // Use !important to override CSS specificity issues
            htmlEl.style.setProperty('display', 'block', 'important');
            htmlEl.dataset.wasHidden = 'true';
            this.hiddenElements.push(htmlEl);
          }
        });
      } catch (e) {
        // Invalid selector, skip
      }
    });

    // Also check for elements with data-editor-hidden attribute
    // These are explicitly marked by users as hidden but editable
    slide.querySelectorAll('[data-editor-hidden]').forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (getComputedStyle(htmlEl).display === 'none') {
        htmlEl.style.setProperty('display', 'block', 'important');
        htmlEl.dataset.wasHidden = 'true';
        if (!this.hiddenElements.includes(htmlEl)) {
          this.hiddenElements.push(htmlEl);
        }
      }
    });
  }

  /**
   * Toggle visibility of hidden elements
   * Called from Toolbar to show/hide hidden editable elements
   * v0.3.4: Changed to cycle through hidden elements one at a time to avoid overlap
   */
  toggleHiddenElements(show: boolean, slide?: HTMLElement): void {
    const targetSlide = slide || document.querySelector('.slide[style*="flex"]') as HTMLElement;
    if (!targetSlide) return;

    // Collect all hidden elements on this slide
    const selectors = [
      '.response-card',
      '[hidden-editable]',
      '[data-hidden-editable]',
      '.hidden-editable',
      '[data-editor-hidden]',
    ];

    const hiddenElements: HTMLElement[] = [];
    selectors.forEach(selector => {
      try {
        targetSlide.querySelectorAll(selector).forEach((el) => {
          const htmlEl = el as HTMLElement;
          // Only include elements that are actually hidden
          if (getComputedStyle(htmlEl).display === 'none' || htmlEl.classList.contains('response-card')) {
            hiddenElements.push(htmlEl);
          }
        });
      } catch (e) {
        // Invalid selector, skip
      }
    });

    if (hiddenElements.length === 0) {
      console.log('[LayoutEngine] No hidden elements found on this slide');
      return;
    }

    // Hide all currently shown hidden elements
    hiddenElements.forEach(el => {
      el.classList.remove('active');
      el.style.display = '';
      delete el.dataset.wasHidden;
    });

    if (!show || this.currentHiddenIndex >= hiddenElements.length - 1) {
      // Turn off: reset to none shown
      this.currentHiddenIndex = -1;
      this.hiddenElementsVisible = false;
      console.log('[LayoutEngine] Hidden elements hidden');
    } else {
      // Show next hidden element
      this.currentHiddenIndex++;
      const nextElement = hiddenElements[this.currentHiddenIndex];
      nextElement.classList.add('active');
      nextElement.dataset.wasHidden = 'true';
      this.hiddenElementsVisible = true;
      console.log(`[LayoutEngine] Showing hidden element ${this.currentHiddenIndex + 1}/${hiddenElements.length}`);
    }
  }

  /**
   * Reset hidden elements state (called when switching slides)
   */
  resetHiddenElements(): void {
    this.currentHiddenIndex = -1;
    this.hiddenElementsVisible = false;
  }

  /**
   * Restore hidden elements to their original state
   */
  private restoreHiddenElements(): void {
    this.hiddenElements.forEach((el) => {
      if (el.dataset.wasHidden) {
        el.style.display = '';
        delete el.dataset.wasHidden;
      }
    });
    this.hiddenElements = [];
  }

  /**
   * Legacy: Detect containers using layered strategy
   * Kept for backward compatibility
   */
  private detectContainers(slide: HTMLElement): ContainerInfo[] {
    const containers: ContainerInfo[] = [];
    const processed = new Set<HTMLElement>();

    // Layer 1: Predefined selectors
    this.predefinedSelectors.forEach((selector) => {
      try {
        slide.querySelectorAll(selector).forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (processed.has(htmlEl)) return;

          const info = this.analyzeElement(htmlEl);
          if (info && this.isValidContainer(info)) {
            containers.push(info);
            processed.add(htmlEl);
          }
        });
      } catch (e) {
        // Invalid selector, skip
      }
    });

    // Layer 2: User-marked containers
    slide.querySelectorAll('[data-editor-container]').forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (processed.has(htmlEl)) return;

      const info = this.analyzeElement(htmlEl);
      if (info && this.isValidContainer(info)) {
        containers.push(info);
        processed.add(htmlEl);
      }
    });

    // Layer 3: Auto-detect Flex/Grid (only if few containers found)
    if (containers.length < 3) {
      this.detectFlexGridContainers(slide, containers, processed);
    }

    // Sort by hierarchy (parent containers first)
    return this.sortByHierarchy(containers);
  }

  /**
   * Analyze an element and create ContainerInfo
   */
  private analyzeElement(el: HTMLElement): ContainerInfo | null {
    const rect = el.getBoundingClientRect();

    // Filter out too small elements (but allow in test environments where rect may be 0)
    const isTestEnv = rect.width === 0 && rect.height === 0 && el.children.length > 0;
    if (!isTestEnv && (rect.width < 20 || rect.height < 20)) return null;

    const computed = getComputedStyle(el);
    const display = computed.display;

    return {
      id: `container-${++this.idCounter}`,
      element: el,
      type: display === 'flex' ? 'flex' : display === 'grid' ? 'grid' : 'block',
      isFlex: display === 'flex',
      isGrid: display === 'grid',
      rect,
    };
  }

  /**
   * Check if element is a valid container
   */
  private isValidContainer(info: ContainerInfo): boolean {
    // Must have children to be a container
    return info.element.children.length > 0;
  }

  /**
   * Auto-detect Flex/Grid containers
   */
  private detectFlexGridContainers(
    slide: HTMLElement,
    containers: ContainerInfo[],
    processed: Set<HTMLElement>
  ): void {
    // Only check elements that have children and are not processed
    const candidates = slide.querySelectorAll(
      '*:not(script):not(style):not(link)'
    );

    candidates.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (processed.has(htmlEl)) return;
      if (htmlEl.children.length === 0) return;

      // Check computed style (expensive, use sparingly)
      const computed = getComputedStyle(htmlEl);
      if (computed.display === 'flex' || computed.display === 'grid') {
        const info = this.analyzeElement(htmlEl);
        if (info && this.isValidContainer(info)) {
          containers.push(info);
          processed.add(htmlEl);
        }
      }
    });
  }

  /**
   * Detect interactive elements inside containers that should be independently editable
   * This enables "mixed editing" strategy: containers can be moved as a whole,
   * but key elements like images can also be selected and moved individually
   */
  private detectNestedInteractiveElements(
    slide: HTMLElement,
    containerEls: Set<HTMLElement>
  ): ElementInfo[] {
    const elements: ElementInfo[] = [];
    const processed = new Set<HTMLElement>();

    // Find all interactive elements that are inside containers
    containerEls.forEach((container) => {
      this.interactiveSelectors.forEach((selector) => {
        try {
          container.querySelectorAll(selector).forEach((el) => {
            const htmlEl = el as HTMLElement;

            // Skip if already processed
            if (processed.has(htmlEl)) return;
            // Skip if already has editor ID (registered by container or standalone)
            if (htmlEl.hasAttribute('data-editor-id')) return;
            // Skip if inside another nested element that's also interactive
            // (to prevent double registration)
            const parentInteractive = htmlEl.parentElement?.closest(this.interactiveSelectors.join(', '));
            if (parentInteractive && container.contains(parentInteractive)) return;

            const computed = getComputedStyle(htmlEl);
            const tagName = htmlEl.tagName.toLowerCase();

            elements.push({
              id: `editor-el-${++this.idCounter}`,
              element: htmlEl,
              type: tagName === 'img' ? 'image' : 'text',
              originalPosition: computed.position,
              isInContainer: true, // Mark as inside container
            });

            processed.add(htmlEl);
          });
        } catch (e) {
          // Invalid selector, skip
        }
      });
    });

    return elements;
  }

  /**
   * Detect standalone elements (not inside any container)
   */
  private detectStandaloneElements(
    slide: HTMLElement,
    containers: ContainerInfo[]
  ): ElementInfo[] {
    const containerEls = new Set(containers.map((c) => c.element));
    const elements: ElementInfo[] = [];

    // Selectors for top-level elements (direct children of slide)
    // Use :scope to select direct children regardless of parent class
    const selectors = [
      ':scope > h1',
      ':scope > h2',
      ':scope > h3',
      ':scope > h4',
      ':scope > h5',
      ':scope > h6',
      ':scope > p',
      ':scope > img',
      ':scope > a',
      ':scope > div',
      ':scope > span',
      ':scope > section',
    ];

    selectors.forEach((selector) => {
      slide.querySelectorAll(selector).forEach((el) => {
        const htmlEl = el as HTMLElement;

        // Skip if inside any container
        const inContainer = Array.from(containerEls).some((c) =>
          c.contains(htmlEl)
        );
        if (inContainer) return;

        // Skip if already processed
        if (htmlEl.hasAttribute('data-editor-id')) return;

        const computed = getComputedStyle(htmlEl);
        const tagName = htmlEl.tagName.toLowerCase();

        elements.push({
          id: `editor-el-${++this.idCounter}`,
          element: htmlEl,
          type: tagName === 'img' ? 'image' : 'text',
          originalPosition: computed.position,
          isInContainer: false,
        });
      });
    });

    return elements;
  }

  /**
   * Register a container as editable
   * v0.3.2+: Containers are NOT registered as editable elements
   * Only leaf elements (text, images) get data-editor-id
   * This prevents "whole section selection" bug
   */
  private registerContainer(container: ContainerInfo): void {
    // Do not register containers as editable
    // Containers are layout structures, not editable elements
    // this.saveOriginalStyles(el);
  }

  /**
   * Register a standalone element as editable
   */
  private registerStandaloneElement(element: ElementInfo): void {
    const el = element.element;

    // Set attributes
    el.setAttribute('data-editor-id', element.id);
    el.setAttribute('data-editor-type', element.type);

    // Add visual class
    el.classList.add('slide-editor-editable');

    // Store original styles
    this.saveOriginalStyles(el);
  }

  /**
   * Move element by delta (dx, dy)
   * KEY CHANGE v0.3.0: Uses relative positioning instead of absolute
   */
  moveElement(id: string, dx: number, dy: number): void {
    const el = this.findElement(id);
    if (!el) return;

    if (this.mode === EditorMode.PROTECTED) {
      this.moveProtected(el, dx, dy);
    } else {
      this.moveFreeform(el, dx, dy);
    }
  }

  /**
   * Move element to absolute position (x, y)
   */
  moveElementTo(id: string, x: number, y: number): void {
    const el = this.findElement(id);
    if (!el) return;

    if (this.mode === EditorMode.PROTECTED) {
      // For protected mode, we need to calculate delta from current position
      const currentLeft = parseFloat(el.style.left) || 0;
      const currentTop = parseFloat(el.style.top) || 0;
      this.moveProtected(el, x - currentLeft, y - currentTop);
    } else {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }

  /**
   * Protected mode: Use relative positioning
   * This preserves layout flow while allowing movement
   */
  private moveProtected(el: HTMLElement, dx: number, dy: number): void {
    const computed = getComputedStyle(el);

    // Save original styles if not already saved
    if (!this.originalStyles.has(el)) {
      this.saveOriginalStyles(el);
    }

    // Get current position
    let currentLeft = 0;
    let currentTop = 0;

    if (el.style.position === 'relative') {
      currentLeft = parseFloat(el.style.left) || 0;
      currentTop = parseFloat(el.style.top) || 0;
    } else if (computed.position === 'relative') {
      currentLeft = parseFloat(computed.left) || 0;
      currentTop = parseFloat(computed.top) || 0;
    }

    // If element is static, convert to relative
    if (computed.position === 'static') {
      el.style.position = 'relative';
    }

    // Apply new position
    el.style.left = `${currentLeft + dx}px`;
    el.style.top = `${currentTop + dy}px`;

    // Mark as moved
    el.setAttribute('data-editor-moved', 'true');
  }

  /**
   * Freeform mode: Use absolute positioning (v0.2.0 compatible)
   */
  private moveFreeform(el: HTMLElement, dx: number, dy: number): void {
    const slide = el.closest('.slide') as HTMLElement;
    if (!slide) return;

    const slideRect = slide.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // If not yet absolute, convert it
    if (getComputedStyle(el).position !== 'absolute') {
      const relativeLeft = elRect.left - slideRect.left;
      const relativeTop = elRect.top - slideRect.top;

      el.style.position = 'absolute';
      el.style.left = `${relativeLeft}px`;
      el.style.top = `${relativeTop}px`;
      el.style.width = `${elRect.width}px`;
      if (el.tagName.toLowerCase() === 'img') {
        el.style.height = `${elRect.height}px`;
      }
    }

    // Apply delta
    const currentLeft = parseFloat(el.style.left) || 0;
    const currentTop = parseFloat(el.style.top) || 0;
    el.style.left = `${currentLeft + dx}px`;
    el.style.top = `${currentTop + dy}px`;

    // Mark as moved
    el.setAttribute('data-editor-moved', 'true');
  }

  /**
   * Get element's current layout info
   */
  getElementInfo(id: string): {
    id: string;
    element: HTMLElement;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
  } | null {
    const el = this.findElement(id);
    if (!el) return null;

    const slide = el.closest('.slide') as HTMLElement;
    if (!slide) return null;

    const slideRect = slide.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    return {
      id,
      element: el,
      x: rect.left - slideRect.left,
      y: rect.top - slideRect.top,
      width: rect.width,
      height: rect.height,
      type: el.getAttribute('data-editor-type') || 'unknown',
    };
  }

  /**
   * Prepare all elements for export
   */
  prepareForExport(mode: EditorMode): void {
    // Process all registered elements
    this.elements.forEach((info, id) => {
      this.prepareElementForExport(info.element, mode);
    });

    // Process all containers
    this.containers.forEach((info, id) => {
      this.prepareElementForExport(info.element, mode);
    });
  }

  /**
   * Prepare single element for export
   */
  private prepareElementForExport(el: HTMLElement, mode: EditorMode): void {
    // Remove editor attributes (keep data-editor-moved for reference if needed)
    el.removeAttribute('data-editor-id');
    el.removeAttribute('data-editor-type');
    el.classList.remove('slide-editor-editable', 'slide-editor-selected');

    // In protected mode, keep relative positioning and transforms
    // This preserves the user's edits while maintaining layout structure
    if (mode === EditorMode.PROTECTED) {
      // Keep relative positioning and offsets
      // The element stays in document flow but with adjusted position
    }

    // Note: We don't remove data-editor-moved here, it's used by Exporter
    // Exporter will decide whether to keep or reset based on mode
  }

  /**
   * Restore element to original state
   */
  restoreElement(id: string): void {
    const el = this.findElement(id);
    if (!el) return;

    const original = this.originalStyles.get(el);
    if (!original) return;

    el.style.position = original.position;
    el.style.left = original.left;
    el.style.top = original.top;
    el.style.width = original.width;
    el.style.height = original.height;
    el.style.marginLeft = original.marginLeft;
    el.style.marginTop = original.marginTop;

    el.removeAttribute('data-editor-moved');
  }

  /**
   * Check if element has been modified
   */
  isModified(id: string): boolean {
    const el = this.findElement(id);
    if (!el) return false;
    return el.hasAttribute('data-editor-moved');
  }

  /**
   * Get all editable element IDs
   */
  getAllElementIds(): string[] {
    const ids: string[] = [];
    this.containers.forEach((_, id) => ids.push(id));
    this.elements.forEach((_, id) => ids.push(id));
    return ids;
  }

  /**
   * Find element by ID
   */
  private findElement(id: string): HTMLElement | null {
    // Check containers
    const container = this.containers.get(id);
    if (container) return container.element;

    // Check standalone elements
    const element = this.elements.get(id);
    if (element) return element.element;

    // Fallback to query
    return document.querySelector(`[data-editor-id="${id}"]`) as HTMLElement;
  }

  /**
   * Save original styles for restoration
   */
  private saveOriginalStyles(el: HTMLElement): void {
    const computed = getComputedStyle(el);
    this.originalStyles.set(el, {
      position: computed.position,
      left: el.style.left,
      top: el.style.top,
      width: el.style.width,
      height: el.style.height,
      marginLeft: el.style.marginLeft,
      marginTop: el.style.marginTop,
    });
  }

  /**
   * Sort containers by hierarchy (parents first)
   */
  private sortByHierarchy(containers: ContainerInfo[]): ContainerInfo[] {
    return containers.sort((a, b) => {
      if (a.element.contains(b.element)) return -1;
      if (b.element.contains(a.element)) return 1;
      return 0;
    });
  }

  /**
   * Get only the outermost containers (those not inside another container)
   * Used to determine which elements should be filtered as "inside container"
   */
  private getOutermostContainers(containers: ContainerInfo[]): ContainerInfo[] {
    return containers.filter((container) => {
      // Check if this container is inside any other container
      return !containers.some(
        (other) =>
          other !== container && other.element.contains(container.element)
      );
    });
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.containers.clear();
    this.elements.clear();
    this.originalStyles.clear();
    this.idCounter = 0;
  }

  /**
   * Detect if slide has complex layout (Flex/Grid)
   */
  hasComplexLayout(slide: HTMLElement): boolean {
    const flexElements = slide.querySelectorAll(
      '[style*="display: flex"], [style*="display:flex"]'
    );
    const gridElements = slide.querySelectorAll(
      '[style*="display: grid"], [style*="display:grid"]'
    );
    return flexElements.length > 0 || gridElements.length > 0;
  }
}
