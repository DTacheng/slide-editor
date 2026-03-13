# Slide Editor

Visual editor for HTML presentations. Self-contained, offline-capable, designed for both AI agent control and direct user manipulation.

## Quick Start

When user wants to visually edit an HTML presentation:

```bash
# Inject editor and open in browser (one command)
~/projects/slide-editor/inject.ts <html-file> --inline --enable --open
```

This will:
1. Inject the editor bundle into the HTML file
2. Automatically open the browser with editor enabled

## CLI Commands

```bash
# Full workflow: inject + enable + open (recommended)
~/projects/slide-editor/inject.ts presentation.html --inline --enable --open

# Inline mode (single file, portable)
~/projects/slide-editor/inject.ts presentation.html --inline --enable

# Link mode (separate bundle file)
~/projects/slide-editor/inject.ts presentation.html --link --enable

# Remove editor from HTML
~/projects/slide-editor/inject.ts presentation.html --remove
```

## User Interaction

| Action | How |
|--------|-----|
| Select | Click on element |
| Move | Drag selected element |
| Resize | Drag 8 corner handles |
| Edit text | Double-click text |
| Delete | Delete/Backspace key |
| Undo | Ctrl/Cmd + Z |
| Redo | Ctrl/Cmd + Shift + Z |
| Toggle Panel | P key or Panel button |
| Toggle Theme | T key or Theme button |
| Deselect | Escape |

## Toolbar Buttons

| Button | Function |
|--------|----------|
| T | Add text box |
| Image | Add image (file picker) |
| Trash | Delete selected |
| Undo/Redo | History controls |
| Panel | Toggle properties panel |
| Theme | Toggle light/dark/auto theme |
| Export | Export as new HTML file |

## Workflow

1. **Inject**: Run inject.ts with `--open` flag
2. **Edit**: Make changes in browser (editor auto-enables)
3. **Export**: Click Export button
4. **Done**: File is downloaded to your downloads folder

## API Reference

All methods available via `window.__openclawEditor`:

### Core
- `enable()` / `disable()` - Toggle editor
- `isEnabled()` - Check if active

### Slides
- `addSlide(index?)` - Add new slide
- `deleteSlide(index)` - Delete slide
- `moveSlide(from, to)` - Reorder slide
- `duplicateSlide(index)` - Copy slide
- `getSlides()` - Get all slides
- `getCurrentSlide()` / `setCurrentSlide(index)` - Get/set current

### Elements
- `addText(options)` - Add text box
- `addImage(options)` - Add image (supports local file via File picker)
- `deleteElement(id)` / `deleteSelected()` - Delete
- `moveElement(id, x, y)` - Move
- `resizeElement(id, w, h)` - Resize
- `setTextContent(id, content)` - Set text
- `setStyle(id, styles)` - Apply CSS
- `cropImage(id, rect)` - Crop image
- `bringToFront(id)` / `sendToBack(id)` - Layer order

### Selection
- `selectElement(id)` / `deselectAll()`
- `getSelectedElement()` / `getSelectedElements()`

### History
- `undo()` / `redo()`
- `canUndo()` / `canRedo()`

### Export
- `export()` - Export clean HTML
- `exportWithEditor()` - Export with editor embedded

## Type Definitions

```typescript
interface TextOptions {
  x?: number; y?: number;
  width?: number; height?: number;
  content?: string;
  fontSize?: string;
  color?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
}

interface ImageOptions {
  x?: number; y?: number;
  width?: number; height?: number;
  src: string;  // URL or data URI
  alt?: string;
}

interface CropRect {
  x: number; y: number;
  width: number; height: number;
}
```

## Examples

```javascript
// Add text
window.__openclawEditor.addText({
  x: 100, y: 200, width: 400,
  content: 'Hello World',
  fontSize: '48px'
});

// Move element
window.__openclawEditor.moveElement('editor-el-1', 150, 250);

// Export
const html = window.__openclawEditor.export();
```
