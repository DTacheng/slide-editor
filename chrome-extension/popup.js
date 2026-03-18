// Check editor status on current tab
async function checkStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const hasEditor = !!window.__openclawEditor || !!window.__slideEditor;
        const isEnabled = hasEditor && (
          document.querySelector('[data-editor-id]') !== null
        );
        return { hasEditor, isEnabled };
      }
    });

    const { hasEditor, isEnabled } = results[0].result;
    updateUI(isEnabled);
  } catch (e) {
    // Page doesn't allow scripting (e.g., chrome:// pages)
    updateUI(false);
    document.getElementById('enableBtn').disabled = true;
    document.getElementById('statusText').textContent = 'Cannot access this page';
  }
}

function updateUI(isEnabled) {
  const enableBtn = document.getElementById('enableBtn');
  const disableBtn = document.getElementById('disableBtn');
  const exportBtn = document.getElementById('exportBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (isEnabled) {
    enableBtn.disabled = true;
    disableBtn.disabled = false;
    exportBtn.disabled = false;
    statusDot.classList.remove('inactive');
    statusText.textContent = 'Editor is active';
  } else {
    enableBtn.disabled = false;
    disableBtn.disabled = true;
    exportBtn.disabled = true;
    statusDot.classList.add('inactive');
    statusText.textContent = 'Editor not active on this page';
  }
}

// Enable editor
document.getElementById('enableBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject the editor bundle
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['editor.bundle.js']
  });

  // Initialize editor
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      if (window.SlideEditor && window.SlideEditor.LayoutEngine) {
        const engine = new SlideEditor.LayoutEngine();
        document.querySelectorAll('.slide').forEach(slide => {
          engine.initialize(slide, SlideEditor.EditorMode.PROTECTED);
        });
        window.__slideEditor = {
          engine: engine,
          export: function() {
            const slides = document.querySelectorAll('.slide');
            const clone = document.createElement('div');
            slides.forEach(slide => {
              const slideClone = slide.cloneNode(true);
              // Remove editor attributes
              slideClone.querySelectorAll('[data-editor-id]').forEach(el => {
                el.removeAttribute('data-editor-id');
                el.removeAttribute('data-editor-type');
                el.removeAttribute('data-editor-moved');
                el.classList.remove('slide-editor-editable', 'slide-editor-selected');
              });
              clone.appendChild(slideClone);
            });
            return clone.innerHTML;
          }
        };

        // Also initialize the full editor UI if available
        if (window.SlideEditor.SlideEditor) {
          const fullEditor = new SlideEditor.SlideEditor();
          fullEditor.enable({ mode: 'protected' });
          window.__openclawEditor = fullEditor;
        }

        return { success: true };
      }
      return { success: false, error: 'SlideEditor not loaded' };
    }
  });

  updateUI(true);
});

// Disable editor
document.getElementById('disableBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      if (window.__openclawEditor) {
        window.__openclawEditor.disable();
        window.__openclawEditor = null;
      }
      if (window.__slideEditor) {
        window.__slideEditor.engine.clear();
        window.__slideEditor = null;
      }
      // Remove all editor artifacts
      document.querySelectorAll('[data-editor-id]').forEach(el => {
        el.removeAttribute('data-editor-id');
        el.removeAttribute('data-editor-type');
        el.removeAttribute('data-editor-moved');
        el.classList.remove('slide-editor-editable', 'slide-editor-selected');
      });
    }
  });

  updateUI(false);
});

// Export HTML
document.getElementById('exportBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      if (window.__slideEditor && window.__slideEditor.export) {
        return window.__slideEditor.export();
      }
      // Fallback: clone and clean the body
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('[data-editor-id]').forEach(el => {
        el.removeAttribute('data-editor-id');
        el.removeAttribute('data-editor-type');
        el.removeAttribute('data-editor-moved');
        el.classList.remove('slide-editor-editable', 'slide-editor-selected');
      });
      // Remove UI elements
      clone.querySelectorAll('#slide-editor-toolbar, #slide-editor-properties, #slide-editor-navigator, #slide-editor-styles').forEach(el => el.remove());
      return clone.innerHTML;
    }
  });

  const html = results[0].result;
  const blob = new Blob([`<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Exported Presentation</title>\n<style>${document.querySelector('style')?.textContent || ''}</style>\n</head>\n<body>\n${html}\n</body>\n</html>`], { type: 'text/html' });

  const url = URL.createObjectURL(blob);
  const filename = `presentation-exported-${Date.now()}.html`;

  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });

  URL.revokeObjectURL(url);
});

// Check status on load
checkStatus();
