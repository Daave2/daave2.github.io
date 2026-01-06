
export function initWhiteboard() {
  const container = document.querySelector("#whiteboard-container");
  const canvas = document.querySelector("#whiteboard");

  if (!canvas) {
    console.log("Whiteboard canvas not found.");
    return;
  }

  // Helper Elements
  const tools = document.querySelectorAll(".tool-button");
  const colorPicker = document.querySelector("#colorPicker");
  const brushSel = document.querySelector("#brushSize");
  const fontSel = document.querySelector("#fontSize");
  const opacitySlider = document.querySelector("#opacity");
  const eraserPreview = document.querySelector("#eraser-preview");
  const fsBtn = document.querySelector(".fullscreen-button");

  // Context & State
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let strokes = [], history = [], historyIndex = -1;
  let currentTool = "pen", drawing = false, currentStroke = null;
  let shapeStart = null; // For shape tools: {x, y}
  let dpr = window.devicePixelRatio || 1;
  let input = null; // formatting-fix

  const $ = (s) => document.querySelector(s);
  const notify = (msg) => {
    const n = $("#notification");
    if (!n) return;
    n.textContent = msg;
    n.style.display = "block";
    n.style.opacity = 1;
    setTimeout(() => {
      n.style.opacity = 0;
      setTimeout(() => n.style.display = "none", 300);
    }, 2000);
  };

  // Shape tools list
  const shapeTools = ["line", "rectangle", "circle", "arrow"];
  const isShapeTool = (tool) => shapeTools.includes(tool);

  // Theme Aware Helpers
  const themeBg = () => getComputedStyle(document.body).getPropertyValue(document.body.classList.contains("dark-mode") ? "--dark-bg-color" : "--light-bg-color").trim() || '#ffffff';

  const effectiveBg = () => {
    // Find the LAST fill operation in the stack
    const f = [...strokes].reverse().find(s => s.tool === "fill");
    return f ? f.color : themeBg();
  };

  const getOpacity = () => (opacitySlider ? parseInt(opacitySlider.value) / 100 : 1);

  // Zoom level (shared with zoom controls below)
  let zoomLevel = 1;

  const getPos = (e) => {
    const r = canvas.getBoundingClientRect();
    let cx, cy;
    if (e.touches && e.touches.length > 0) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    // Adjust for zoom - getBoundingClientRect returns scaled dimensions
    // so we need to divide by zoom to get actual canvas coordinates
    return {
      x: (cx - r.left) / zoomLevel,
      y: (cy - r.top) / zoomLevel
    };
  };

  // --- Rendering ---
  const render = (previewShape = null) => {
    if (!ctx) return;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Clear and set base background
    ctx.clearRect(0, 0, w, h);

    // Draw base background (theme default)
    ctx.fillStyle = themeBg();
    ctx.fillRect(0, 0, w, h);

    // Helper to draw a single stroke/shape
    const drawStroke = (s) => {
      if (!s) return;
      ctx.save();
      ctx.globalAlpha = s.opacity !== undefined ? s.opacity : 1;

      if (s.tool === "fill") {
        ctx.fillStyle = s.color;
        ctx.fillRect(0, 0, w, h);
      } else if (s.tool === "text") {
        ctx.fillStyle = s.c || '#000000';
        ctx.font = `${s.sz || 16}px Roboto, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        if (s.lines) s.lines.forEach((l, i) => ctx.fillText(l, s.x, s.y + (i * (s.sz || 16) * 1.2)));
      } else if (s.tool === "pen" || s.tool === "eraser") {
        if (s.p && s.p.length > 0) {
          ctx.lineJoin = ctx.lineCap = "round";
          ctx.lineWidth = s.w || 2;
          ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
          ctx.strokeStyle = s.tool === "eraser" ? "rgba(0,0,0,1)" : s.c;
          ctx.beginPath();
          if (s.p.length === 1) {
            ctx.moveTo(s.p[0].x, s.p[0].y);
            ctx.lineTo(s.p[0].x + 0.1, s.p[0].y);
          } else {
            ctx.moveTo(s.p[0].x, s.p[0].y);
            for (let i = 1; i < s.p.length; i++) ctx.lineTo(s.p[i].x, s.p[i].y);
          }
          ctx.stroke();
        }
      } else if (s.tool === "line") {
        ctx.lineJoin = ctx.lineCap = "round";
        ctx.lineWidth = s.w || 2;
        ctx.strokeStyle = s.c;
        ctx.beginPath();
        ctx.moveTo(s.start.x, s.start.y);
        ctx.lineTo(s.end.x, s.end.y);
        ctx.stroke();
      } else if (s.tool === "rectangle") {
        ctx.lineJoin = "miter";
        ctx.lineWidth = s.w || 2;
        ctx.strokeStyle = s.c;
        const rx = Math.min(s.start.x, s.end.x);
        const ry = Math.min(s.start.y, s.end.y);
        const rw = Math.abs(s.end.x - s.start.x);
        const rh = Math.abs(s.end.y - s.start.y);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (s.tool === "circle") {
        ctx.lineWidth = s.w || 2;
        ctx.strokeStyle = s.c;
        const cx = (s.start.x + s.end.x) / 2;
        const cy = (s.start.y + s.end.y) / 2;
        const rx = Math.abs(s.end.x - s.start.x) / 2;
        const ry = Math.abs(s.end.y - s.start.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.tool === "arrow") {
        ctx.lineJoin = ctx.lineCap = "round";
        ctx.lineWidth = s.w || 2;
        ctx.strokeStyle = s.c;
        ctx.fillStyle = s.c;
        // Draw line
        ctx.beginPath();
        ctx.moveTo(s.start.x, s.start.y);
        ctx.lineTo(s.end.x, s.end.y);
        ctx.stroke();
        // Draw arrowhead
        const angle = Math.atan2(s.end.y - s.start.y, s.end.x - s.start.x);
        const headLen = Math.max(10, s.w * 3);
        ctx.beginPath();
        ctx.moveTo(s.end.x, s.end.y);
        ctx.lineTo(s.end.x - headLen * Math.cos(angle - Math.PI / 6), s.end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(s.end.x - headLen * Math.cos(angle + Math.PI / 6), s.end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    // Replay all strokes
    for (const s of strokes) {
      drawStroke(s);
    }

    // Draw preview shape if provided (while dragging)
    if (previewShape) {
      drawStroke(previewShape);
    }
  };

  const resizeCanvas = () => {
    if (!canvas.parentElement) return;
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  };

  // --- Logic for Text ---
  const commitText = () => {
    if (!input) return;
    const val = input.value;
    if (val.trim()) {
      const rect = input.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      // Calculate relative position to canvas
      // input fixed/absolute position - canvas absolute position
      // All coords in client space (viewport)
      const x = (rect.left - canvasRect.left);
      const y = (rect.top - canvasRect.top);

      strokes.push({
        tool: "text",
        lines: val.split('\n'),
        x: x,
        y: y,
        sz: parseInt(input.style.fontSize),
        c: input.style.color
      });
      saveState();
      notify("Text added");
    }
    input.remove();
    input = null;
    render();
    saveLocal();
  };

  const createTextInput = (e) => {
    if (input) commitText(); // Commit existing

    const pos = getPos(e);
    input = document.createElement('textarea');
    input.style.position = 'absolute';
    input.style.zIndex = '1000';
    // Position relative to the *document* specifically where the click happened? 
    // Easier: Position absolutely on top of the canvas container.
    // The container is relative?
    // Let's use fixed or absolute based on page coords.
    const canvasRect = canvas.getBoundingClientRect();

    // Initial guess: Input top-left at click.
    input.style.left = (canvasRect.left + window.scrollX + pos.x) + 'px';
    input.style.top = (canvasRect.top + window.scrollY + pos.y) + 'px';

    input.style.background = 'rgba(255,255,255,0.95)';
    input.style.border = '2px solid var(--accent-color)';
    input.style.borderRadius = '4px';
    input.style.color = colorPicker.value || '#000000';
    input.style.fontSize = (fontSel.value || 16) + 'px';
    input.style.fontFamily = 'Roboto, sans-serif';
    input.style.minWidth = '100px';
    input.style.minHeight = '1.5em';
    input.style.padding = '4px';
    input.style.outline = 'none';

    // Events
    input.addEventListener('blur', commitText);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { input.value = ''; input.blur(); }
    });

    document.body.appendChild(input);
    setTimeout(() => input.focus(), 10);
  };

  // --- Input Handlers ---
  const start = (e) => {
    if (e.target === input) return;
    if (e.type === 'touchstart') e.preventDefault();

    const pos = getPos(e);

    if (currentTool === 'text') {
      createTextInput(e);
      return;
    }

    drawing = true;

    // For shape tools, just record start position
    if (isShapeTool(currentTool)) {
      shapeStart = pos;
      currentStroke = null;
      return;
    }

    // For pen/eraser tools
    currentStroke = {
      tool: currentTool,
      c: colorPicker.value,
      w: +brushSel.value,
      p: [pos],
      opacity: getOpacity()
    };

    // Just start path for immediate feedback
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const move = (e) => {
    if (e.type === 'touchmove') e.preventDefault();
    if (!drawing) return;

    const pos = getPos(e);

    // Shape tool preview
    if (isShapeTool(currentTool) && shapeStart) {
      const previewShape = {
        tool: currentTool,
        c: colorPicker.value,
        w: +brushSel.value,
        start: shapeStart,
        end: pos,
        opacity: getOpacity()
      };
      render(previewShape);
      return;
    }

    // Pen/eraser drawing
    if (!currentStroke) return;
    currentStroke.p.push(pos);

    // Fast render segment
    ctx.save();
    ctx.lineJoin = ctx.lineCap = "round";
    ctx.lineWidth = currentStroke.w;
    ctx.globalAlpha = currentStroke.opacity;
    ctx.globalCompositeOperation = currentTool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = currentTool === "eraser" ? "rgba(0,0,0,1)" : currentStroke.c;

    const prev = currentStroke.p[currentStroke.p.length - 2];
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();
  };

  const end = (e) => {
    if (!drawing) return;
    drawing = false;

    // Finalize shape tool
    if (isShapeTool(currentTool) && shapeStart) {
      const pos = e.changedTouches ? getPos(e.changedTouches[0]) : getPos(e);
      const shape = {
        tool: currentTool,
        c: colorPicker.value,
        w: +brushSel.value,
        start: shapeStart,
        end: pos,
        opacity: getOpacity()
      };
      strokes.push(shape);
      saveState();
      saveLocal();
      shapeStart = null;
      render();
      return;
    }

    // Finalize pen/eraser stroke
    if (currentStroke) {
      strokes.push(currentStroke);
      saveState();
      saveLocal();
    }
    currentStroke = null;
    render();
  };

  // --- Attach Listeners ---
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  document.addEventListener('mouseup', end); // Catch mouseup outside

  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  // --- Pinch to Zoom (Touch) ---
  let lastTouchDistance = 0;
  let isPinching = false;

  const getTouchDistance = (touches) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      isPinching = true;
      lastTouchDistance = getTouchDistance(e.touches);
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault();
      const newDistance = getTouchDistance(e.touches);
      const delta = newDistance - lastTouchDistance;

      // Adjust zoom based on pinch
      if (Math.abs(delta) > 5) {
        const zoomChange = delta > 0 ? 0.05 : -0.05;
        const wrap = canvas.parentElement;
        const currentScale = parseFloat(wrap?.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1);
        const newScale = Math.max(0.5, Math.min(3, currentScale + zoomChange));

        if (wrap) {
          wrap.style.transform = `scale(${newScale})`;
          wrap.style.transformOrigin = 'center center';
        }
        lastTouchDistance = newDistance;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      isPinching = false;
      lastTouchDistance = 0;
    }
  });

  // --- Tool Selection Helper ---
  const selectTool = (toolName) => {
    const btn = document.querySelector(`[data-tool="${toolName}"]`);
    if (!btn) return;

    tools.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentTool = toolName;
    updateCursor();
  };

  // --- Dynamic Cursor ---
  const updateCursor = () => {
    const canvasWrap = canvas.parentElement;
    if (!canvasWrap) return;

    // Remove all cursor classes
    canvasWrap.classList.remove('cursor-pen', 'cursor-eraser', 'cursor-text', 'cursor-shape', 'cursor-crosshair');

    // Set cursor based on tool
    switch (currentTool) {
      case 'pen':
        canvasWrap.classList.add('cursor-pen');
        break;
      case 'eraser':
        canvasWrap.classList.add('cursor-eraser');
        break;
      case 'text':
        canvasWrap.classList.add('cursor-text');
        break;
      case 'line':
      case 'rectangle':
      case 'circle':
      case 'arrow':
        canvasWrap.classList.add('cursor-crosshair');
        break;
      default:
        canvasWrap.classList.add('cursor-pen');
    }
  };

  // Tool Buttons
  tools.forEach(btn => {
    btn.addEventListener('click', () => {
      selectTool(btn.dataset.tool);
    });
  });

  // --- Keyboard Shortcuts ---
  const shortcuts = {
    'p': 'pen',
    'e': 'eraser',
    'l': 'line',
    'r': 'rectangle',
    'c': 'circle',
    'a': 'arrow',
    't': 'text'
  };

  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    const key = e.key.toLowerCase();

    // Tool shortcuts
    if (shortcuts[key]) {
      e.preventDefault();
      selectTool(shortcuts[key]);
      notify(`${shortcuts[key].charAt(0).toUpperCase() + shortcuts[key].slice(1)} tool`);
      return;
    }

    // Undo: Ctrl/Cmd + Z
    if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
      e.preventDefault();
      $(".undo-button")?.click();
      return;
    }

    // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
    if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
      e.preventDefault();
      $(".redo-button")?.click();
      return;
    }

    // Delete/Backspace to clear (with confirmation)
    if (key === 'delete' || (key === 'backspace' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      $(".clear-button")?.click();
      return;
    }

    // Save: Ctrl/Cmd + S
    if ((e.ctrlKey || e.metaKey) && key === 's') {
      e.preventDefault();
      $(".save-button")?.click();
      return;
    }

    // Grid toggle: G
    if (key === 'g') {
      e.preventDefault();
      $(".grid-button")?.click();
      return;
    }

    // Fullscreen: F
    if (key === 'f' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      $(".fullscreen-button")?.click();
      return;
    }

    // Zoom shortcuts
    if (key === '=' || key === '+') {
      e.preventDefault();
      $(".zoom-in-button")?.click();
      return;
    }
    if (key === '-') {
      e.preventDefault();
      $(".zoom-out-button")?.click();
      return;
    }
    if (key === '0') {
      e.preventDefault();
      $(".zoom-reset-button")?.click();
      return;
    }
  });

  // Initialize cursor on load
  updateCursor();

  // --- Color Swatches ---
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const color = swatch.dataset.color;
      if (color && colorPicker) {
        colorPicker.value = color;
        colorPicker.dispatchEvent(new Event('input', { bubbles: true }));
        // Update active state
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      }
    });
  });

  // --- Grid Overlay ---
  let showGrid = false;
  const gridSize = 20;

  const drawGrid = () => {
    if (!showGrid) return;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = gridSize; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = gridSize; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Wrap original render to include grid
  const originalRender = render;
  const renderWithGrid = (previewShape = null) => {
    originalRender(previewShape);
    drawGrid();
  };

  if ($(".grid-button")) $(".grid-button").onclick = () => {
    showGrid = !showGrid;
    $(".grid-button").classList.toggle('active', showGrid);
    renderWithGrid();
    notify(showGrid ? "Grid On" : "Grid Off");
  };

  // --- Zoom Controls ---
  // zoomLevel is declared at top of function for getPos access
  const minZoom = 0.5;
  const maxZoom = 3;
  const zoomStep = 0.25;

  const applyZoom = () => {
    const wrap = canvas.parentElement;
    if (wrap) {
      wrap.style.transform = `scale(${zoomLevel})`;
      wrap.style.transformOrigin = 'top left';
    }
  };

  if ($(".zoom-in-button")) $(".zoom-in-button").onclick = () => {
    if (zoomLevel < maxZoom) {
      zoomLevel = Math.min(maxZoom, zoomLevel + zoomStep);
      applyZoom();
      notify(`Zoom: ${Math.round(zoomLevel * 100)}%`);
    }
  };

  if ($(".zoom-out-button")) $(".zoom-out-button").onclick = () => {
    if (zoomLevel > minZoom) {
      zoomLevel = Math.max(minZoom, zoomLevel - zoomStep);
      applyZoom();
      notify(`Zoom: ${Math.round(zoomLevel * 100)}%`);
    }
  };

  if ($(".zoom-reset-button")) $(".zoom-reset-button").onclick = () => {
    zoomLevel = 1;
    applyZoom();
    notify("Zoom: 100%");
  };

  // Action Buttons
  if ($(".fill-button")) $(".fill-button").onclick = () => {
    strokes.push({ tool: "fill", color: colorPicker.value });
    saveState();
    saveLocal();
    render();
    notify("Background Filled");
  };

  if ($(".clear-button")) $(".clear-button").onclick = () => {
    strokes = [];
    saveState();
    saveLocal();
    render();
    notify("Cleared");
  };

  if ($(".undo-button")) $(".undo-button").onclick = () => {
    if (historyIndex > 0) {
      historyIndex--;
      const state = history[historyIndex];
      strokes = JSON.parse(JSON.stringify(state.strokes));
      render();
      saveLocal();
      notify("Undo");
    }
  };

  // Redo Button
  if ($(".redo-button")) $(".redo-button").onclick = () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      const state = history[historyIndex];
      strokes = JSON.parse(JSON.stringify(state.strokes));
      render();
      saveLocal();
      notify("Redo");
    }
  };

  if ($(".save-button")) $(".save-button").onclick = () => {
    saveLocal();
    notify("Saved to Browser");
  };

  // Load Button
  if ($(".load-button")) $(".load-button").onclick = () => {
    try {
      const raw = localStorage.getItem('whiteboardStrokes');
      if (raw) {
        strokes = JSON.parse(raw);
        saveState();
        render();
        notify("Loaded");
      } else {
        notify("Nothing saved");
      }
    } catch (e) {
      strokes = [];
      render();
      notify("Load failed");
    }
  };

  // Export PNG Button
  if ($(".export-png-button")) $(".export-png-button").onclick = () => {
    try {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      const exportWidth = canvas.clientWidth;
      const exportHeight = canvas.clientHeight;
      tempCanvas.width = exportWidth;
      tempCanvas.height = exportHeight;

      // Draw background
      tempCtx.fillStyle = effectiveBg();
      tempCtx.fillRect(0, 0, exportWidth, exportHeight);

      // Draw strokes
      strokes.forEach(s => {
        if (!s) return;
        tempCtx.globalCompositeOperation = "source-over";
        if (s.tool === "pen" || s.tool === "eraser") {
          if (!s.p || s.p.length < 1) return;
          tempCtx.lineJoin = tempCtx.lineCap = "round";
          tempCtx.lineWidth = s.w || 4;
          tempCtx.strokeStyle = s.tool === "eraser" ? "rgba(0,0,0,1)" : s.c;
          tempCtx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
          tempCtx.beginPath();
          tempCtx.moveTo(s.p[0].x, s.p[0].y);
          for (let i = 1; i < s.p.length; i++) {
            tempCtx.lineTo(s.p[i].x, s.p[i].y);
          }
          tempCtx.stroke();
        } else if (s.tool === "text") {
          tempCtx.fillStyle = s.c || '#000000';
          tempCtx.font = `${s.sz || 18}px Roboto, sans-serif`;
          tempCtx.textAlign = 'left';
          tempCtx.textBaseline = 'top';
          if (s.lines) s.lines.forEach((ln, i) => tempCtx.fillText(ln, s.x, s.y + i * (s.sz || 18) * 1.2));
        } else if (s.tool === "fill") {
          tempCtx.fillStyle = s.color;
          tempCtx.fillRect(0, 0, exportWidth, exportHeight);
        }
      });

      const a = document.createElement("a");
      a.href = tempCanvas.toDataURL("image/png");
      a.download = "morrisons-notes.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      notify("PNG Downloaded");
    } catch (e) {
      console.error("Export PNG error:", e);
      notify("Export failed");
    }
  };

  // Fullscreen Button
  if (fsBtn) fsBtn.onclick = () => {
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => notify("Fullscreen failed"));
    } else {
      document.exitFullscreen();
    }
  };

  document.addEventListener("fullscreenchange", () => {
    const full = !!document.fullscreenElement;
    if (fsBtn) {
      fsBtn.innerHTML = `<i class="fas fa-${full ? 'compress' : 'expand'}"></i>`;
    }
    setTimeout(resizeCanvas, 150);
  });

  // History & Storage
  const saveLocal = () => localStorage.setItem('whiteboardStrokes', JSON.stringify(strokes));
  const saveState = () => {
    historyIndex++;
    history = history.slice(0, historyIndex); // truncate future
    history.push({ strokes: JSON.parse(JSON.stringify(strokes)) });
  };

  // Init
  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); });

  // Load on init
  if (localStorage.whiteboardStrokes) {
    try { strokes = JSON.parse(localStorage.whiteboardStrokes); } catch (e) { strokes = []; }
    saveState();
    render();
  }
}

// Utility for internal usage
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
