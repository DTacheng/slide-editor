import type { EditorState, HistoryAction } from '../types';

interface ElementStartPosition {
  x: number;
  y: number;
  originalTransform: string;
  originalRight: string;
  originalBottom: string;
}

export class DragManager {
  private state: EditorState;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private elementStartPositions: Map<string, ElementStartPosition> = new Map();
  private historyPush: (action: HistoryAction) => void;
  private onDragEnd: (() => void) | null = null;

  constructor(state: EditorState, historyPush: (action: HistoryAction) => void) {
    this.state = state;
    this.historyPush = historyPush;
  }

  setOnDragEnd(callback: () => void): void {
    this.onDragEnd = callback;
  }

  startDrag(e: PointerEvent, elementId: string): void {
    if (!this.state.selectedIds.has(elementId)) return;

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.elementStartPositions.clear();

    // Store starting positions of all selected elements
    // Ensure elements have relative positioning for left/top to work
    this.state.selectedIds.forEach((id) => {
      const el = document.querySelector(`[data-editor-id="${id}"]`) as HTMLElement;
      if (el) {
        this.captureInitialPosition(el, id);
      }
    });

    // Capture pointer
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);

    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Capture initial position of an element, handling various CSS positioning scenarios
   * Fixes issues with transform, right/bottom positioning, and absolute positioned elements
   */
  private captureInitialPosition(el: HTMLElement, id: string): void {
    // Disable native drag behavior that conflicts with editor drag
    if (el.tagName === 'IMG') {
      el.draggable = false;
    }

    const computed = window.getComputedStyle(el);

    // Store original values for potential restoration
    const originalTransform = el.style.transform;
    const originalRight = el.style.right;
    const originalBottom = el.style.bottom;

    // Get current visual position BEFORE clearing transform
    // This is the actual position we want to maintain
    const rect = el.getBoundingClientRect();
    const parentEl = el.offsetParent as HTMLElement;
    const parentRect = parentEl ? parentEl.getBoundingClientRect() : { left: 0, top: 0 };

    // Calculate position relative to offset parent
    // This accounts for any transform that was applied
    const visualLeft = rect.left - parentRect.left;
    const visualTop = rect.top - parentRect.top;

    // Handle elements with right/bottom positioning (convert to left/top)
    // This is common for corner logos using right: 50% + transform: translateX(50%)
    if (computed.position === 'absolute' || computed.position === 'fixed') {
      // Clear transform first
      el.style.transform = 'none';

      // Always set position to absolute for consistency
      el.style.position = 'absolute';

      // Convert right positioning to left positioning using visual position
      if (computed.right !== 'auto' && computed.left === 'auto') {
        el.style.right = 'auto';
        el.style.left = `${visualLeft}px`;
      } else if (computed.left !== 'auto') {
        // If left was already set, parse it and adjust for any delta
        const currentLeft = parseFloat(computed.left) || 0;
        el.style.left = `${currentLeft}px`;
      } else {
        // Neither left nor right was set explicitly
        el.style.left = `${visualLeft}px`;
      }

      // Convert bottom positioning to top positioning using visual position
      if (computed.bottom !== 'auto' && computed.top === 'auto') {
        el.style.bottom = 'auto';
        el.style.top = `${visualTop}px`;
      } else if (computed.top !== 'auto') {
        // If top was already set, use it
        const currentTop = parseFloat(computed.top) || 0;
        el.style.top = `${currentTop}px`;
      } else {
        // Neither top nor bottom was set explicitly
        el.style.top = `${visualTop}px`;
      }
    } else {
      // For relative/static positioned elements
      if (computed.position === 'static') {
        el.style.position = 'relative';
      }

      // Clear any transform that might affect positioning
      el.style.transform = 'none';

      // For relative positioned elements, we need to be careful
      // If left/top are not set, the element is at its natural position
      // We should only set them if we need to move the element
      if (!el.style.left && !computed.left) {
        el.style.left = '0px';
      } else if (computed.left !== 'auto') {
        el.style.left = computed.left;
      } else {
        el.style.left = '0px';
      }

      if (!el.style.top && !computed.top) {
        el.style.top = '0px';
      } else if (computed.top !== 'auto') {
        el.style.top = computed.top;
      } else {
        el.style.top = '0px';
      }
    }

    // Store the starting position
    const startX = parseFloat(el.style.left) || 0;
    const startY = parseFloat(el.style.top) || 0;

    this.elementStartPositions.set(id, {
      x: startX,
      y: startY,
      originalTransform,
      originalRight,
      originalBottom,
    });
  }

  handleMove(e: PointerEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;

    // Move all selected elements
    this.elementStartPositions.forEach((startPos, id) => {
      const el = document.querySelector(`[data-editor-id="${id}"]`) as HTMLElement;
      if (el) {
        const newX = startPos.x + deltaX;
        const newY = startPos.y + deltaY;
        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;

        // Add boundary check to prevent dragging outside the slide
        this.enforceBoundaryConstraints(el);
      }
    });
  }

  /**
   * Enforce boundary constraints to prevent elements from being dragged outside the slide
   */
  private enforceBoundaryConstraints(el: HTMLElement): void {
    const slide = el.closest('.slide') as HTMLElement;
    if (!slide) return;

    const slideRect = slide.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // Allow some tolerance so the element doesn't have to be completely inside
    const tolerance = 50;

    let currentLeft = parseFloat(el.style.left) || 0;
    let currentTop = parseFloat(el.style.top) || 0;
    let adjusted = false;

    // Check right boundary
    const maxRight = slideRect.width - elRect.width + tolerance;
    if (currentLeft > maxRight) {
      currentLeft = maxRight;
      adjusted = true;
    }

    // Check bottom boundary
    const maxBottom = slideRect.height - elRect.height + tolerance;
    if (currentTop > maxBottom) {
      currentTop = maxBottom;
      adjusted = true;
    }

    // Check left/top boundaries
    if (currentLeft < -tolerance) {
      currentLeft = -tolerance;
      adjusted = true;
    }
    if (currentTop < -tolerance) {
      currentTop = -tolerance;
      adjusted = true;
    }

    if (adjusted) {
      el.style.left = `${currentLeft}px`;
      el.style.top = `${currentTop}px`;
    }
  }

  endDrag(e: PointerEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;

    // Only record history if there was actual movement
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      // Record history for each moved element
      this.elementStartPositions.forEach((startPos, id) => {
        const el = document.querySelector(`[data-editor-id="${id}"]`) as HTMLElement;
        if (el) {
          this.historyPush({
            type: 'move',
            elementId: id,
            from: { x: startPos.x, y: startPos.y },
            to: { x: startPos.x + deltaX, y: startPos.y + deltaY },
          });
        }
      });
    }

    // Note: We intentionally do NOT restore original transform/right/bottom
    // because the element is now being dragged with left/top positioning
    // This maintains the new position state set during drag

    this.isDragging = false;
    this.elementStartPositions.clear();

    if (this.onDragEnd) {
      this.onDragEnd();
    }
  }

  isActive(): boolean {
    return this.isDragging;
  }
}
