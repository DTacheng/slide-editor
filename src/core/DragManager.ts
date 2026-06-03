import type { EditorState, HistoryAction } from '../types';

interface ElementStartPosition {
  x: number;
  y: number;
  originalPosition: string;
  originalTransform: string;
  originalLeft: string;
  originalTop: string;
  originalRight: string;
  originalBottom: string;
  originalWidth: string;
  originalHeight: string;
  originalMargin: string;
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
   * Capture initial position of an element.
   *
   * v0.3.5 — Unified "promote to absolute" strategy.
   * Regardless of the original layout (static / relative / flex child / grid child /
   * transform-centered / right-bottom anchored), we measure the element's current
   * VISUAL rectangle relative to its .slide and pin it with absolute left/top.
   * This makes dragging pixel-stable and eliminates the classic failure modes:
   *   - transform: translate(-50%,-50%) being cleared → element jumps half a box
   *   - right/bottom anchoring → mis-converted to left/top
   *   - flex/grid children → relative offset gets re-flowed away ("rubber-band")
   *   - wrong offsetParent (no positioned ancestor) → coordinate basis is off
   *
   * Original style values are saved so endDrag/cancel could restore them if needed.
   */
  private captureInitialPosition(el: HTMLElement, id: string): void {
    // Disable native drag behavior that conflicts with editor drag
    if (el.tagName === 'IMG') {
      el.draggable = false;
    }

    // Save original inline styles for potential restoration
    const originalPosition = el.style.position;
    const originalTransform = el.style.transform;
    const originalLeft = el.style.left;
    const originalTop = el.style.top;
    const originalRight = el.style.right;
    const originalBottom = el.style.bottom;
    const originalWidth = el.style.width;
    const originalHeight = el.style.height;
    const originalMargin = el.style.margin;

    // Establish the positioning context = the element's DIRECT parent, and make it
    // positioned (relative) if it is static. This is critical: once we set the
    // element to position:absolute, its containing block becomes the nearest
    // positioned ancestor. By pinning the direct parent as that ancestor we keep
    // drag coordinates in the SAME space that ResizeManager uses for its handles
    // (which are appended to el.parentElement). Measuring against .slide instead
    // caused nested elements (e.g. a number inside an absolutely-positioned .card)
    // to jump by the card's offset on drag start.
    const parent = (el.parentElement as HTMLElement | null) || (el.closest('.slide') as HTMLElement | null);
    let basisLeft = 0, basisTop = 0;
    if (parent) {
      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      const parentRect = parent.getBoundingClientRect();
      // Absolute offsets are relative to the parent's padding box (inside its border)
      basisLeft = parentRect.left + (parent.clientLeft || 0);
      basisTop = parentRect.top + (parent.clientTop || 0);
    }

    // Measure the element's current visual box BEFORE we mutate any styles.
    const rect = el.getBoundingClientRect();
    const visualLeft = rect.left - basisLeft;
    const visualTop = rect.top - basisTop;

    // Pin the element with absolute positioning at its current visual location.
    // Lock width/height first so promoting out of flow doesn't resize the box.
    el.style.width = `${rect.width}px`;
    if (el.tagName === 'IMG' || originalHeight) {
      el.style.height = `${rect.height}px`;
    }
    el.style.position = 'absolute';
    el.style.margin = '0';
    el.style.transform = 'none';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.left = `${visualLeft}px`;
    el.style.top = `${visualTop}px`;

    this.elementStartPositions.set(id, {
      x: visualLeft,
      y: visualTop,
      originalPosition,
      originalTransform,
      originalLeft,
      originalTop,
      originalRight,
      originalBottom,
      originalWidth,
      originalHeight,
      originalMargin,
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
    // Constrain within the element's positioning context (its offsetParent), which
    // is the same basis the drag coordinates use. For top-level elements this is
    // the slide; for nested elements it is their container. This keeps the clamp
    // math consistent with the left/top values we write.
    const container = (el.offsetParent as HTMLElement) || (el.closest('.slide') as HTMLElement);
    if (!container) return;

    const slideRect = container.getBoundingClientRect();
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
