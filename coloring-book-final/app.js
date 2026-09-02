// ===== State Management =====
const state = {
  tool: 'fill',
  color: '#ef4444',
  size: 10,
  isDrawing: false,
  lastX: 0,
  lastY: 0,
  currentShape: 'circle',
  currentSticker: '⭐',
  isDragging: false,
  isResizing: false,
  activeHandle: null,
  audioMuted: false
};

const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Offscreen canvas for base drawing (raster)
const baseCanvas = document.createElement('canvas');
baseCanvas.width = canvas.width;
baseCanvas.height = canvas.height;
const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });

// Objects array for stickers and shapes (vector)
let objects = [];
let selectedObj = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let currentCategory = 'fruits';
let currentPageIndex = -1;
let currentUploadedImage = null;

let history = [];
let redoStack = [];
let historyStep = -1;
const maxHistory = 35;
const BBOX_PAD = 12;
let mouseCanvasPos = null;

// ===== Web Audio SFX Synthesizer =====
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSfx(type) {
  if (state.audioMuted) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'fill') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.16);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'undo' || type === 'redo') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'undo' ? 500 : 300, now);
      osc.frequency.linearRampToValueAtTime(type === 'undo' ? 300 : 500, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'delete') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {
    console.warn('Audio SFX error', e);
  }
}

// ===== Drawing Helper =====
function setupCtx(c) {
  c.lineWidth = 4;
  c.strokeStyle = '#1e293b';
  c.fillStyle = '#1e293b';
  c.lineCap = 'round';
  c.lineJoin = 'round';
}

// ===== SVG Stencil Pages =====
const coloringPages = {
  fruits: [
    { name: 'Apple', src: 'assets/stencils/fruits/apple.svg' },
    { name: 'Banana', src: 'assets/stencils/fruits/banana.svg' },
    { name: 'Grapes', src: 'assets/stencils/fruits/grapes.svg' },
    { name: 'Mango', src: 'assets/stencils/fruits/mango.svg' },
    { name: 'Strawberry', src: 'assets/stencils/fruits/strawberry.svg' },
    { name: 'Watermelon', src: 'assets/stencils/fruits/watermelon.svg' }
  ],
  animals: [
    { name: 'Elephant', src: 'assets/stencils/animals/elephant.svg' },
    { name: 'Giraffe', src: 'assets/stencils/animals/giraffe.svg' },
    { name: 'Lion', src: 'assets/stencils/animals/lion.svg' },
    { name: 'Panda', src: 'assets/stencils/animals/panda.svg' },
    { name: 'Rabbit', src: 'assets/stencils/animals/rabbit.svg' },
    { name: 'Zebra', src: 'assets/stencils/animals/zebra.svg' }
  ],
  vegetables: [
    { name: 'Broccoli', src: 'assets/stencils/vegetables/broccoli.svg' },
    { name: 'Capsicum', src: 'assets/stencils/vegetables/capsicum.svg' },
    { name: 'Carrot', src: 'assets/stencils/vegetables/carrot.svg' },
    { name: 'Potato', src: 'assets/stencils/vegetables/potato.svg' },
    { name: 'Pumpkin', src: 'assets/stencils/vegetables/pumpkin.svg' },
    { name: 'Tomato', src: 'assets/stencils/vegetables/tomato.svg' }
  ],
  birds: [
    { name: 'Duck', src: 'assets/stencils/birds/duck.svg' },
    { name: 'Eagle', src: 'assets/stencils/birds/eagle.svg' },
    { name: 'Owl', src: 'assets/stencils/birds/owl.svg' },
    { name: 'Parrot', src: 'assets/stencils/birds/parrot.svg' },
    { name: 'Peacock', src: 'assets/stencils/birds/peacock.svg' },
    { name: 'Penguin', src: 'assets/stencils/birds/penguin.svg' }
  ],
  insects: [
    { name: 'Ant', src: 'assets/stencils/insects/ant.svg' },
    { name: 'Bee', src: 'assets/stencils/insects/bee.svg' },
    { name: 'Butterfly', src: 'assets/stencils/insects/butterfly.svg' },
    { name: 'Dragonfly', src: 'assets/stencils/insects/dragonfly.svg' },
    { name: 'Grasshopper', src: 'assets/stencils/insects/grasshopper.svg' },
    { name: 'Ladybug', src: 'assets/stencils/insects/ladybug.svg' }
  ],
  fish: [
    { name: 'Clownfish', src: 'assets/stencils/fish/clownfish.svg' },
    { name: 'Dolphin', src: 'assets/stencils/fish/dolphin.svg' },
    { name: 'Goldfish', src: 'assets/stencils/fish/goldfish.svg' },
    { name: 'Octopus', src: 'assets/stencils/fish/octopus.svg' },
    { name: 'Seahorse', src: 'assets/stencils/fish/seahorse.svg' },
    { name: 'Shark', src: 'assets/stencils/fish/shark.svg' }
  ],
  flowers: [
    { name: 'Daisy', src: 'assets/stencils/flowers/daisy.svg' },
    { name: 'Hibiscus', src: 'assets/stencils/flowers/hibiscus.svg' },
    { name: 'Lotus', src: 'assets/stencils/flowers/lotus.svg' },
    { name: 'Rose', src: 'assets/stencils/flowers/rose.svg' },
    { name: 'Sunflower', src: 'assets/stencils/flowers/sunflower.svg' },
    { name: 'Tulip', src: 'assets/stencils/flowers/tulip.svg' }
  ],
  vehicles: [
    { name: 'Car', src: 'assets/stencils/vehicles/car.svg' },
    { name: 'Bike', src: 'assets/stencils/vehicles/bike.svg' },
    { name: 'Airplane', src: 'assets/stencils/vehicles/airplane.svg' },
    { name: 'Boat', src: 'assets/stencils/vehicles/boat.svg' },
    { name: 'Truck', src: 'assets/stencils/vehicles/truck.svg' },
    { name: 'Train', src: 'assets/stencils/vehicles/train.svg' }
  ]
};

// ===== SVG Stencil Loader =====
function loadStencilImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const imgFallback = new Image();
      imgFallback.onload = () => resolve(imgFallback);
      imgFallback.onerror = err => reject(err);
      imgFallback.src = src;
    };
    img.src = src;
  });
}

// ===== Navigation =====
function showHome() {
  playSfx('click');
  document.getElementById('homeView').style.display = 'flex';
  document.getElementById('canvasView').style.display = 'none';
}

function showCanvas(category) {
  playSfx('click');
  currentCategory = category;
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('canvasView').style.display = 'flex';
  document.getElementById('categoryTitle').textContent =
    category.charAt(0).toUpperCase() + category.slice(1);

  loadThumbnails(category);

  if (category === 'yourimage') {
    currentPageIndex = -1;
    currentUploadedImage = null;
    initBaseCanvas();
    objects = [];
    selectedObj = null;
    renderCanvas();
    saveState();
    showToast('Click "Upload Your Image" below to start!');
  } else {
    loadColoringPage(0);
  }
}

function loadThumbnails(category) {
  const thumbContainer = document.getElementById('thumbnails');
  thumbContainer.innerHTML = '';

  if (category === 'yourimage') {
    const btn = document.createElement('button');
    btn.className = 'header-btn primary';
    btn.style.height = '68px';
    btn.style.width = '100%';
    btn.style.fontSize = '14px';
    btn.innerHTML = '<i class="fas fa-upload"></i> Upload Your Image';
    btn.onclick = () => { playSfx('click'); document.getElementById('fileInput').click(); };
    thumbContainer.appendChild(btn);
    return;
  }

  coloringPages[category].forEach((page, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'thumb-canvas-item' + (idx === 0 ? ' active' : '');

    const thumb = document.createElement('canvas');
    thumb.width = 68;
    thumb.height = 68;
    thumb.className = 'thumb-canvas' + (idx === 0 ? ' active' : '');
    thumb.title = page.name;

    const label = document.createElement('span');
    label.className = 'thumb-label';
    label.textContent = page.name;

    const tctx = thumb.getContext('2d');
    tctx.fillStyle = 'white';
    tctx.fillRect(0, 0, 68, 68);

    if (page.src) {
      loadStencilImage(page.src).then(img => {
        tctx.imageSmoothingEnabled = true;
        tctx.imageSmoothingQuality = 'high';
        const scale = Math.min(68 / img.width, 68 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        tctx.drawImage(img, (68 - w) / 2, (68 - h) / 2, w, h);
      }).catch(err => console.error(err));
    }

    wrapper.onclick = () => {
      playSfx('click');
      document.querySelectorAll('.thumb-canvas-item').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.thumb-canvas').forEach(t => t.classList.remove('active'));
      wrapper.classList.add('active');
      thumb.classList.add('active');
      loadColoringPage(idx);
    };

    wrapper.appendChild(thumb);
    wrapper.appendChild(label);
    thumbContainer.appendChild(wrapper);
  });
}

// ===== Canvas Initialization =====
function initBaseCanvas() {
  baseCtx.fillStyle = 'white';
  baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
  baseCtx.lineCap = 'round';
  baseCtx.lineJoin = 'round';
}

async function loadColoringPage(index) {
  currentPageIndex = index;
  initBaseCanvas();
  setupCtx(baseCtx);

  const page = coloringPages[currentCategory][index];
  if (page && page.src) {
    try {
      const img = await loadStencilImage(page.src);
      const scale = Math.min(baseCanvas.width / img.width, baseCanvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (baseCanvas.width - w) / 2;
      const y = (baseCanvas.height - h) / 2;
      baseCtx.imageSmoothingEnabled = true;
      baseCtx.imageSmoothingQuality = 'high';
      baseCtx.drawImage(img, x, y, w, h);
    } catch (err) {
      console.error('Failed to load stencil:', page.src, err);
      showToast('Could not load stencil');
    }
  }

  objects = [];
  selectedObj = null;
  history = [];
  redoStack = [];
  historyStep = -1;

  renderCanvas();
  saveState();
}

function loadBlankCanvas() {
  playSfx('click');
  currentPageIndex = -1;
  currentUploadedImage = null;
  initBaseCanvas();
  objects = [];
  selectedObj = null;
  renderCanvas();
  saveState();
  showToast('Blank canvas loaded');
}

function resetCanvas() {
  playSfx('click');
  if (currentPageIndex >= 0 && currentCategory !== 'yourimage') {
    loadColoringPage(currentPageIndex);
  } else if (currentPageIndex === -2 && currentUploadedImage) {
    initBaseCanvas();
    const scale = Math.min(baseCanvas.width / currentUploadedImage.width, baseCanvas.height / currentUploadedImage.height);
    const w = currentUploadedImage.width * scale;
    const h = currentUploadedImage.height * scale;
    const x = (baseCanvas.width - w) / 2;
    const y = (baseCanvas.height - h) / 2;
    baseCtx.imageSmoothingEnabled = true;
    baseCtx.imageSmoothingQuality = 'high';
    baseCtx.drawImage(currentUploadedImage, x, y, w, h);
    objects = [];
    selectedObj = null;
    renderCanvas();
    saveState();
  } else {
    loadBlankCanvas();
  }
}

// ===== Rendering =====
function renderCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(baseCanvas, 0, 0);

  // Render objects (shapes and stickers)
  objects.forEach(obj => {
    ctx.save();
    if (obj.type === 'sticker') {
      ctx.font = `${obj.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.val, obj.x, obj.y);
    } else if (obj.type === 'shape') {
      ctx.fillStyle = obj.color;
      ctx.beginPath();
      if (obj.val === 'circle') {
        ctx.arc(obj.x, obj.y, obj.size / 2, 0, Math.PI * 2);
      } else if (obj.val === 'square') {
        ctx.rect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
      } else if (obj.val === 'triangle') {
        ctx.moveTo(obj.x, obj.y - obj.size / 2);
        ctx.lineTo(obj.x - obj.size / 2, obj.y + obj.size / 2);
        ctx.lineTo(obj.x + obj.size / 2, obj.y + obj.size / 2);
        ctx.closePath();
      } else if (obj.val === 'star') {
        drawStar(ctx, obj.x, obj.y, 5, obj.size / 2, obj.size / 4);
      }
      ctx.fill();
    }
    ctx.restore();
  });

  // Bounding box for selected object
  const floatBar = document.getElementById('floatingObjectBar');
  const deleteBtnHeader = document.getElementById('deleteBtn');

  if (selectedObj) {
    if (deleteBtnHeader) deleteBtnHeader.style.display = 'inline-flex';
    if (floatBar) floatBar.style.display = 'flex';

    ctx.save();
    const half = selectedObj.size / 2 + BBOX_PAD;
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(selectedObj.x - half, selectedObj.y - half, half * 2, half * 2);

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(selectedObj.x - half, selectedObj.y - half, half * 2, half * 2);
    ctx.setLineDash([]);

    const handles = getHandles(selectedObj);
    handles.forEach(h => {
      ctx.beginPath();
      ctx.arc(h.x, h.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#6366f1';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    });
    ctx.restore();
  } else {
    if (deleteBtnHeader) deleteBtnHeader.style.display = 'none';
    if (floatBar) floatBar.style.display = 'none';
  }

  // Brush Cursor Ring Preview
  if (mouseCanvasPos && (state.tool === 'brush' || state.tool === 'pencil' || state.tool === 'eraser')) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(mouseCanvasPos.x, mouseCanvasPos.y, state.size / 2, 0, Math.PI * 2);
    ctx.strokeStyle = state.tool === 'eraser' ? '#ef4444' : (state.color === '#ffffff' ? '#000000' : state.color);
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.restore();
  }
}

function getHandles(obj) {
  const half = obj.size / 2 + BBOX_PAD;
  return [
    { x: obj.x - half, y: obj.y - half, name: 'tl' },
    { x: obj.x + half, y: obj.y - half, name: 'tr' },
    { x: obj.x - half, y: obj.y + half, name: 'bl' },
    { x: obj.x + half, y: obj.y + half, name: 'br' }
  ];
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// ===== Palettes & Colors =====
const palettePresets = {
  vibrant: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#1e293b', '#ffffff'],
  pastel: ['#fca5a5', '#fdba74', '#fde047', '#bef264', '#86efac', '#67e8f9', '#93c5fd', '#a5b4fc', '#c084fc', '#f472b6', '#94a3b8', '#ffffff'],
  neon: ['#ff0055', '#ff5500', '#ffcc00', '#33ff00', '#00ffcc', '#0099ff', '#9900ff', '#ff00cc', '#111111', '#ffffff', '#e0e7ff', '#fae8ff'],
  earthy: ['#78350f', '#92400e', '#b45309', '#d97706', '#65a30d', '#15803d', '#047857', '#0f766e', '#1e3a8a', '#475569', '#1e293b', '#f8fafc']
};

function renderPalette(presetName = 'vibrant') {
  const colorGrid = document.getElementById('colorGrid');
  colorGrid.innerHTML = '';
  const colors = palettePresets[presetName] || palettePresets.vibrant;

  colors.forEach(color => {
    const swatch = document.createElement('div');
    const isActive = color.toLowerCase() === state.color.toLowerCase();
    swatch.className = 'color-swatch' + (isActive ? ' active' : '');
    swatch.style.background = color;

    if (isActive) {
      swatch.innerHTML = '<i class="fas fa-check"></i>';
    }

    swatch.onclick = () => {
      setColor(color);
      playSfx('click');
    };

    colorGrid.appendChild(swatch);
  });
}

function setColor(hexColor) {
  state.color = hexColor;
  document.getElementById('customColorPicker').value = hexColor;

  document.querySelectorAll('.color-swatch').forEach(s => {
    const isActive = s.style.backgroundColor && rgbToHex(s.style.backgroundColor).toLowerCase() === hexColor.toLowerCase();
    s.classList.toggle('active', isActive);
    s.innerHTML = isActive ? '<i class="fas fa-check"></i>' : '';
  });

  const previewDot = document.getElementById('sizePreviewDot');
  if (previewDot) {
    previewDot.style.backgroundColor = hexColor;
  }

  if (selectedObj && selectedObj.type === 'shape') {
    selectedObj.color = hexColor;
    renderCanvas();
    saveState();
  }
}

function rgbToHex(rgb) {
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/\d+/g);
  if (!match) return '#000000';
  return '#' + match.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

document.querySelectorAll('.palette-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    playSfx('click');
    document.querySelectorAll('.palette-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderPalette(tab.dataset.palette);
  });
});

document.getElementById('customColorPicker')?.addEventListener('input', e => {
  setColor(e.target.value);
});

// Shapes & Stickers Options
const shapeOptions = [
  { val: 'circle', icon: 'fa-circle' },
  { val: 'square', icon: 'fa-square' },
  { val: 'triangle', icon: 'fa-play' },
  { val: 'star', icon: 'fa-star' }
];

const shapeGrid = document.getElementById('shapeGrid');
shapeOptions.forEach(s => {
  const item = document.createElement('div');
  item.className = 'obj-item' + (s.val === state.currentShape ? ' active' : '');
  item.innerHTML = `<i class="fas ${s.icon}" style="transform: ${s.val === 'triangle' ? 'rotate(-90deg)' : 'none'};"></i>`;
  item.onclick = () => {
    playSfx('click');
    state.currentShape = s.val;
    document.querySelectorAll('#shapeGrid .obj-item').forEach(o => o.classList.remove('active'));
    item.classList.add('active');
  };
  shapeGrid.appendChild(item);
});

const stickerOptions = ['⭐', '❤️', '🔥', '💎', '🌈', '☀️', '🌙', '🎈', '🌸', '🐱', '🦄', '🐝'];
const stickerGrid = document.getElementById('stickerGrid');
stickerOptions.forEach(s => {
  const item = document.createElement('div');
  item.className = 'obj-item' + (s === state.currentSticker ? ' active' : '');
  item.textContent = s;
  item.onclick = () => {
    playSfx('click');
    state.currentSticker = s;
    document.querySelectorAll('#stickerGrid .obj-item').forEach(o => o.classList.remove('active'));
    item.classList.add('active');
  };
  stickerGrid.appendChild(item);
});

// Tool Selection
function setTool(toolName) {
  playSfx('click');

  if (toolName === 'eyedropper') {
    if ('EyeDropper' in window) {
      const eyeDropper = new EyeDropper();
      eyeDropper.open().then(result => {
        setColor(result.sRGBHex);
        showToast(`Picked color: ${result.sRGBHex}`);
        playSfx('pop');
      }).catch(e => {
        console.log('EyeDropper cancelled or unsupported', e);
      });
      return;
    }
  }

  state.tool = toolName;

  document.querySelectorAll('.tool-btn').forEach(btn => {
    const isActive = btn.dataset.tool === toolName;
    btn.classList.toggle('active', isActive);
    let badge = btn.querySelector('.tool-badge');
    if (isActive && !badge) {
      badge = document.createElement('div');
      badge.className = 'tool-badge';
      btn.appendChild(badge);
    } else if (!isActive && badge) {
      badge.remove();
    }
  });

  document.getElementById('shapesPanel').style.display = state.tool === 'shape' ? 'block' : 'none';
  document.getElementById('stickersPanel').style.display = state.tool === 'sticker' ? 'block' : 'none';

  const sizeLabel = document.getElementById('sizeLabel');
  const labels = {
    eraser: 'Eraser Size', brush: 'Brush Size', pencil: 'Pencil Size',
    shape: 'Shape Size', sticker: 'Sticker Size', text: 'Text Size', select: 'Resize Selected'
  };
  sizeLabel.textContent = labels[state.tool] || 'Brush Size';

  const toolCursors = {
    fill: 'crosshair', pencil: 'crosshair', brush: 'crosshair', eraser: 'crosshair',
    text: 'text', shape: 'crosshair', sticker: 'copy', select: 'default', eyedropper: 'crosshair'
  };
  canvas.style.cursor = toolCursors[state.tool] || 'default';
  renderCanvas();
}

document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

function updateSize(val) {
  state.size = parseInt(val);
  document.getElementById('sizeValue').textContent = val + 'px';

  const previewDot = document.getElementById('sizePreviewDot');
  if (previewDot) {
    const scale = Math.min(1.8, Math.max(0.4, val / 25));
    previewDot.style.transform = `scale(${scale})`;
  }

  if (selectedObj && state.tool === 'select') {
    selectedObj.size = parseInt(val);
    renderCanvas();
  }
}

// ===== Interactive Canvas Events =====
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  if (e.touches && e.touches.length > 0) {
    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY
    };
  }
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function getObjectAt(x, y) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    const half = obj.size / 2 + BBOX_PAD;
    if (x > obj.x - half && x < obj.x + half && y > obj.y - half && y < obj.y + half) {
      return obj;
    }
  }
  return null;
}

function getHandleAt(x, y) {
  if (!selectedObj) return null;
  const handles = getHandles(selectedObj);
  for (const h of handles) {
    if (Math.abs(x - h.x) < 14 && Math.abs(y - h.y) < 14) {
      return h.name;
    }
  }
  return null;
}

function startDrawing(e) {
  e.preventDefault();
  const pos = getPos(e);

  if (state.tool === 'eyedropper') {
    try {
      const pixel = baseCtx.getImageData(Math.floor(pos.x), Math.floor(pos.y), 1, 1).data;
      const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
      setColor(hex);
      playSfx('pop');
      showToast(`Sampled color: ${hex}`);
      setTool('fill');
    } catch (err) {
      console.warn('Eyedropper pixel read error:', err);
    }
    return;
  }

  if (state.tool === 'select') {
    const handle = getHandleAt(pos.x, pos.y);
    if (handle) {
      state.isResizing = true;
      state.activeHandle = handle;
      return;
    }

    const hit = getObjectAt(pos.x, pos.y);
    if (hit) {
      selectedObj = hit;
      state.isDragging = true;
      dragOffsetX = pos.x - hit.x;
      dragOffsetY = pos.y - hit.y;

      document.getElementById('sizeSlider').value = hit.size;
      document.getElementById('sizeValue').textContent = hit.size + 'px';
      playSfx('click');
    } else {
      selectedObj = null;
    }
    renderCanvas();
    return;
  }

  if (state.tool === 'fill') {
    floodFill(baseCtx, Math.floor(pos.x), Math.floor(pos.y), state.color);
    playSfx('fill');
    renderCanvas();
    saveState();
    return;
  }

  if (state.tool === 'text') {
    openTextModal(pos.x, pos.y);
    return;
  }

  if (state.tool === 'shape') {
    const newObj = {
      type: 'shape',
      val: state.currentShape,
      x: pos.x,
      y: pos.y,
      size: state.size,
      color: state.color
    };
    objects.push(newObj);
    selectedObj = newObj;
    playSfx('pop');
    renderCanvas();
    saveState();
    setTool('select');
    return;
  }

  if (state.tool === 'sticker') {
    const newObj = {
      type: 'sticker',
      val: state.currentSticker,
      x: pos.x,
      y: pos.y,
      size: state.size
    };
    objects.push(newObj);
    selectedObj = newObj;
    playSfx('pop');
    renderCanvas();
    saveState();
    setTool('select');
    return;
  }

  state.isDrawing = true;
  state.lastX = pos.x;
  state.lastY = pos.y;

  baseCtx.beginPath();
  baseCtx.arc(pos.x, pos.y, state.size / 2, 0, Math.PI * 2);
  baseCtx.fillStyle = state.tool === 'eraser' ? 'white' : state.color;
  baseCtx.fill();

  renderCanvas();
}

function draw(e) {
  const pos = getPos(e);
  mouseCanvasPos = pos;

  if (state.tool === 'select' && !state.isDragging && !state.isResizing) {
    const handle = getHandleAt(pos.x, pos.y);
    if (handle === 'tl' || handle === 'br') canvas.style.cursor = 'nwse-resize';
    else if (handle === 'tr' || handle === 'bl') canvas.style.cursor = 'nesw-resize';
    else if (getObjectAt(pos.x, pos.y)) canvas.style.cursor = 'move';
    else canvas.style.cursor = 'default';
  }

  if (!state.isDrawing && !state.isDragging && !state.isResizing) {
    renderCanvas();
    return;
  }

  e.preventDefault();

  if (state.isResizing && selectedObj) {
    const half = selectedObj.size / 2 + BBOX_PAD;
    let fixedX = selectedObj.x + (state.activeHandle.includes('l') ? half : -half);
    let fixedY = selectedObj.y + (state.activeHandle.includes('t') ? half : -half);

    const dx = Math.abs(pos.x - fixedX);
    const dy = Math.abs(pos.y - fixedY);
    let newSize = Math.max(20, Math.max(dx, dy) - BBOX_PAD * 2);

    const dirX = fixedX > selectedObj.x ? -1 : 1;
    const dirY = fixedY > selectedObj.y ? -1 : 1;

    selectedObj.size = newSize;
    selectedObj.x = fixedX + dirX * (newSize / 2 + BBOX_PAD);
    selectedObj.y = fixedY + dirY * (newSize / 2 + BBOX_PAD);

    document.getElementById('sizeSlider').value = newSize;
    document.getElementById('sizeValue').textContent = Math.round(newSize) + 'px';
    renderCanvas();
    return;
  }

  if (state.isDragging && selectedObj) {
    selectedObj.x = pos.x - dragOffsetX;
    selectedObj.y = pos.y - dragOffsetY;
    renderCanvas();
    return;
  }

  if (state.isDrawing) {
    baseCtx.beginPath();
    baseCtx.moveTo(state.lastX, state.lastY);
    baseCtx.lineTo(pos.x, pos.y);
    baseCtx.lineWidth = state.size;

    if (state.tool === 'eraser') {
      baseCtx.strokeStyle = 'white';
    } else if (state.tool === 'brush') {
      baseCtx.strokeStyle = state.color;
      baseCtx.globalAlpha = 0.6;
    } else {
      baseCtx.strokeStyle = state.color;
      baseCtx.globalAlpha = 1.0;
    }

    baseCtx.stroke();
    baseCtx.globalAlpha = 1;

    renderCanvas();
    state.lastX = pos.x;
    state.lastY = pos.y;
  }
}

function stopDrawing() {
  if (state.isDrawing) {
    state.isDrawing = false;
    saveState();
  }
  if (state.isDragging || state.isResizing) {
    state.isDragging = false;
    state.isResizing = false;
    state.activeHandle = null;
    saveState();
  }
}

canvas.addEventListener('mouseleave', () => {
  mouseCanvasPos = null;
  stopDrawing();
  renderCanvas();
});

// ===== Text Input Modal =====
let textInsertPos = null;
function openTextModal(x, y) {
  textInsertPos = { x, y };
  const modal = document.getElementById('textModal');
  const input = document.getElementById('textModalInput');
  input.value = '';
  modal.style.display = 'flex';
  setTimeout(() => input.focus(), 50);
}

document.getElementById('textModalCancel')?.addEventListener('click', () => {
  document.getElementById('textModal').style.display = 'none';
});

document.getElementById('textModalSubmit')?.addEventListener('click', submitTextModal);
document.getElementById('textModalInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') submitTextModal();
});

function submitTextModal() {
  const input = document.getElementById('textModalInput');
  const text = input.value.trim();
  if (text && textInsertPos) {
    baseCtx.font = `bold ${20 + state.size * 2}px 'Fredoka', sans-serif`;
    baseCtx.fillStyle = state.color;
    baseCtx.textAlign = 'center';
    baseCtx.textBaseline = 'middle';
    baseCtx.fillText(text, textInsertPos.x, textInsertPos.y);
    renderCanvas();
    saveState();
    playSfx('pop');
  }
  document.getElementById('textModal').style.display = 'none';
}

// ===== Floating Bar Actions =====
function duplicateSelected() {
  if (selectedObj) {
    const clone = JSON.parse(JSON.stringify(selectedObj));
    clone.x += 20;
    clone.y += 20;
    objects.push(clone);
    selectedObj = clone;
    renderCanvas();
    saveState();
    playSfx('pop');
    showToast('Object duplicated');
  }
}

function deleteSelected() {
  if (selectedObj) {
    objects = objects.filter(o => o !== selectedObj);
    selectedObj = null;
    renderCanvas();
    saveState();
    playSfx('delete');
    showToast('Object deleted');
  }
}

document.getElementById('floatDupBtn')?.addEventListener('click', duplicateSelected);
document.getElementById('floatDelBtn')?.addEventListener('click', deleteSelected);

// ===== Ultra-Fast & Reliable Flood Fill (Queue BFS with Visited Map) =====
function floodFill(targetCtx, startX, startY, fillColor) {
  const width = targetCtx.canvas.width;
  const height = targetCtx.canvas.height;

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

  let imageData;
  try {
    imageData = targetCtx.getImageData(0, 0, width, height);
  } catch (e) {
    console.error('FloodFill getImageData error:', e);
    showToast('Local browser restriction: Please launch via Live Server or HTTP server for SVG fill');
    return;
  }

  const data = imageData.data;
  const fillRGB = hexToRgb(fillColor);
  if (!fillRGB) return;

  const startIdx = (startY * width + startX) * 4;
  const startR = data[startIdx];
  const startG = data[startIdx + 1];
  const startB = data[startIdx + 2];

  // Prevent filling dark stencil outlines (luminance threshold)
  const startLuminance = 0.299 * startR + 0.587 * startG + 0.114 * startB;
  if (startLuminance < 60) {
    showToast('Click inside an area to fill color!');
    return;
  }

  // Prevent filling exact same color
  if (Math.abs(startR - fillRGB.r) < 5 && Math.abs(startG - fillRGB.g) < 5 && Math.abs(startB - fillRGB.b) < 5) {
    return;
  }

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height * 2);
  let head = 0;
  let tail = 0;

  queue[tail++] = startX;
  queue[tail++] = startY;
  visited[startY * width + startX] = 1;

  const tolerance = 45;

  while (head < tail) {
    const x = queue[head++];
    const y = queue[head++];
    const idx = (y * width + x) * 4;

    data[idx] = fillRGB.r;
    data[idx + 1] = fillRGB.g;
    data[idx + 2] = fillRGB.b;
    data[idx + 3] = 255;

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ];

    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (!visited[nPos]) {
          visited[nPos] = 1;
          const nIdx = nPos * 4;
          const nR = data[nIdx];
          const nG = data[nIdx + 1];
          const nB = data[nIdx + 2];

          const diff = Math.abs(nR - startR) + Math.abs(nG - startG) + Math.abs(nB - startB);
          if (diff <= tolerance * 3) {
            queue[tail++] = nx;
            queue[tail++] = ny;
          }
        }
      }
    }
  }

  targetCtx.putImageData(imageData, 0, 0);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// ===== File Input =====
document.getElementById('fileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      currentUploadedImage = img;
      currentPageIndex = -2;
      initBaseCanvas();

      const scale = Math.min(baseCanvas.width / img.width, baseCanvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (baseCanvas.width - w) / 2;
      const y = (baseCanvas.height - h) / 2;

      baseCtx.imageSmoothingEnabled = true;
      baseCtx.imageSmoothingQuality = 'high';
      baseCtx.drawImage(img, x, y, w, h);

      objects = [];
      selectedObj = null;
      renderCanvas();
      saveState();
      showToast('Image loaded! Start coloring.');
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

// ===== History & Actions (Undo / Redo) =====
function updateUndoRedoUI() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) undoBtn.disabled = historyStep <= 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

function saveState() {
  if (historyStep < history.length - 1) {
    history = history.slice(0, historyStep + 1);
  }
  redoStack = [];

  history.push({
    base: baseCanvas.toDataURL(),
    objs: JSON.parse(JSON.stringify(objects))
  });

  if (history.length > maxHistory) {
    history.shift();
  } else {
    historyStep++;
  }
  updateUndoRedoUI();
}

function undo() {
  if (historyStep > 0) {
    redoStack.push(history[historyStep]);
    historyStep--;
    restoreState(history[historyStep]);
    playSfx('undo');
    showToast('Undone');
  }
}

function redo() {
  if (redoStack.length > 0) {
    const nextState = redoStack.pop();
    historyStep++;
    history[historyStep] = nextState;
    restoreState(nextState);
    playSfx('redo');
    showToast('Redone');
  }
}

function restoreState(stateObj) {
  const img = new Image();
  img.onload = function () {
    baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
    baseCtx.drawImage(img, 0, 0);
    objects = JSON.parse(JSON.stringify(stateObj.objs));
    selectedObj = null;
    renderCanvas();
    updateUndoRedoUI();
  };
  img.src = stateObj.base;
}

function downloadPNG() {
  playSfx('pop');
  const tempSelected = selectedObj;
  selectedObj = null;
  mouseCanvasPos = null;
  renderCanvas();

  const link = document.createElement('a');
  link.download = `coloring-masterpiece-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  showToast('Saved to your device!');
  selectedObj = tempSelected;
  renderCanvas();
}

function printCanvas() {
  playSfx('click');
  const tempSelected = selectedObj;
  selectedObj = null;
  mouseCanvasPos = null;
  renderCanvas();

  const dataUrl = canvas.toDataURL('image/png');
  let windowContent = '<!DOCTYPE html><html><head><title>Print Coloring Masterpiece</title>';
  windowContent += '<style>@page { size: auto; margin: 0mm; } body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; } img { max-width: 100%; max-height: 100vh; }</style>';
  windowContent += '</head><body>';
  windowContent += `<img src="${dataUrl}" onload="window.print();window.close()">`;
  windowContent += '</body></html>';

  const printWin = window.open('', '', 'width=800,height=600');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(windowContent);
    printWin.document.close();
  }
  selectedObj = tempSelected;
  renderCanvas();
}

// ===== Toast =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ===== Sound Toggle =====
function toggleAudio() {
  state.audioMuted = !state.audioMuted;
  const btns = document.querySelectorAll('.audio-btn');
  btns.forEach(btn => {
    btn.classList.toggle('muted', state.audioMuted);
    btn.innerHTML = state.audioMuted ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-high"></i>';
  });
  if (!state.audioMuted) playSfx('pop');
  showToast(state.audioMuted ? 'Sound Muted' : 'Sound Enabled');
}

document.getElementById('audioToggleBtn')?.addEventListener('click', toggleAudio);
document.getElementById('homeAudioBtn')?.addEventListener('click', toggleAudio);

// ===== Event Listeners =====
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDrawing);

// Keyboard Shortcuts
document.addEventListener('keydown', e => {
  if (document.activeElement.tagName === 'INPUT') return;

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (e.key === 'y' || e.key === 'Y') {
      e.preventDefault();
      redo();
    }
    return;
  }

  const keyMap = {
    'b': 'brush', 'B': 'brush',
    'p': 'pencil', 'P': 'pencil',
    'f': 'fill', 'F': 'fill',
    'e': 'eraser', 'E': 'eraser',
    't': 'text', 'T': 'text',
    's': 'shape', 'S': 'shape',
    'k': 'sticker', 'K': 'sticker',
    'v': 'select', 'V': 'select',
    'i': 'eyedropper', 'I': 'eyedropper'
  };

  if (keyMap[e.key]) {
    setTool(keyMap[e.key]);
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObj) {
    e.preventDefault();
    deleteSelected();
  } else if (e.key === 'Escape') {
    selectedObj = null;
    renderCanvas();
  }
});

// ===== Initialization & Wiring =====
initBaseCanvas();
renderPalette('vibrant');
updateSize(10);
saveState();

document.querySelectorAll('.category-card[data-category]').forEach(card => {
  card.addEventListener('click', () => showCanvas(card.dataset.category));
});

document.getElementById('homeBtn')?.addEventListener('click', showHome);
document.getElementById('undoBtn')?.addEventListener('click', undo);
document.getElementById('redoBtn')?.addEventListener('click', redo);
document.getElementById('resetBtn')?.addEventListener('click', resetCanvas);
document.getElementById('blankBtn')?.addEventListener('click', loadBlankCanvas);
document.getElementById('printBtn')?.addEventListener('click', printCanvas);
document.getElementById('saveBtn')?.addEventListener('click', downloadPNG);
document.getElementById('deleteBtn')?.addEventListener('click', deleteSelected);

document.getElementById('sizeSlider')?.addEventListener('input', e => updateSize(e.target.value));