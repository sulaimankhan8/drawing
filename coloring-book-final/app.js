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
let historyStep = -1;
const maxHistory = 30;
const BBOX_PAD = 12;

// ===== Drawing Functions (Base Outlines) =====
function setupCtx(c) {
  c.lineWidth = 4;
  c.strokeStyle = '#1e293b';
  c.fillStyle = '#1e293b';
  c.lineCap = 'round';
  c.lineJoin = 'round';
}

function drawApple(c) {
  setupCtx(c);
  c.beginPath();
  c.arc(300, 340, 140, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 200);
  c.quadraticCurveTo(310, 180, 320, 160);
  c.stroke();

  c.beginPath();
  c.ellipse(350, 170, 40, 20, Math.PI / 4, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(260, 320, 10, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(340, 320, 10, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(300, 360, 30, 0.2 * Math.PI, 0.8 * Math.PI);
  c.stroke();
}

function drawBanana(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(200, 200);
  c.quadraticCurveTo(100, 400, 400, 450);
  c.quadraticCurveTo(450, 450, 430, 400);
  c.quadraticCurveTo(250, 380, 280, 220);
  c.closePath();
  c.stroke();
}

function drawStrawberry(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(200, 260);
  c.quadraticCurveTo(300, 500, 400, 260);
  c.quadraticCurveTo(300, 220, 200, 260);
  c.stroke();

  for (let i = 0; i < 5; i++) {
    c.save();
    c.translate(300, 240);
    c.rotate((i - 2) * 0.4);

    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-20, -40);
    c.lineTo(20, -40);
    c.closePath();
    c.stroke();

    c.restore();
  }
}

function drawGrapes(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(300, 150);
  c.lineTo(300, 250);
  c.stroke();

  c.beginPath();
  c.ellipse(
    340,
    180,
    40,
    20,
    -Math.PI / 4,
    0,
    Math.PI * 2
  );
  c.stroke();

  [
    [300, 280],
    [260, 320],
    [340, 320],
    [220, 360],
    [300, 360],
    [380, 360],
    [260, 400],
    [340, 400],
    [300, 440]
  ].forEach(p => {
    c.beginPath();
    c.arc(p[0], p[1], 35, 0, Math.PI * 2);
    c.stroke();
  });
}

function drawOrange(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 350, 120, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 230);
  c.lineTo(300, 180);
  c.stroke();

  c.beginPath();
  c.ellipse(
    340,
    170,
    40,
    15,
    -Math.PI / 4,
    0,
    Math.PI * 2
  );
  c.stroke();
}

function drawWatermelon(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 400, 200, Math.PI, 0);
  c.stroke();

  c.beginPath();
  c.moveTo(100, 400);
  c.lineTo(500, 400);
  c.stroke();

  c.beginPath();
  c.ellipse(250, 350, 10, 20, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(350, 350, 10, 20, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(300, 300, 10, 20, 0, 0, Math.PI * 2);
  c.stroke();
}

function drawCat(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 320, 120, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(220, 240);
  c.lineTo(190, 160);
  c.lineTo(270, 220);
  c.closePath();
  c.stroke();

  c.beginPath();
  c.moveTo(380, 240);
  c.lineTo(410, 160);
  c.lineTo(330, 220);
  c.closePath();
  c.stroke();

  c.beginPath();
  c.ellipse(260, 300, 12, 20, 0, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.ellipse(340, 300, 12, 20, 0, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.moveTo(300, 340);
  c.lineTo(285, 360);
  c.lineTo(315, 360);
  c.closePath();
  c.fill();
}

function drawDog(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 330, 120, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(200, 280, 40, 80, -0.2, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(400, 280, 40, 80, 0.2, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(260, 310, 12, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(340, 310, 12, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.ellipse(300, 360, 25, 15, 0, 0, Math.PI * 2);
  c.fill();
}

function drawRabbit(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(200, 200, 30, 100, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(400, 200, 30, 100, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(300, 330, 120, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(260, 310, 12, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(340, 310, 12, 0, Math.PI * 2);
  c.fill();
}

function drawBear(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(190, 190, 50, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(410, 190, 50, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(300, 330, 140, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(260, 310, 12, 18, 0, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.ellipse(340, 310, 12, 18, 0, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.ellipse(300, 370, 40, 30, 0, 0, Math.PI * 2);
  c.stroke();
}

function drawElephant(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(250, 300, 100, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(200, 380);
  c.quadraticCurveTo(150, 500, 250, 500);
  c.stroke();

  c.beginPath();
  c.arc(350, 350, 60, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(400, 320, 20, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 300);
  c.lineTo(280, 200);
  c.stroke();
}

function drawLion(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 350, 100, 0, Math.PI * 2);
  c.stroke();

  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;

    const x1 = 300 + Math.cos(a) * 100;
    const y1 = 350 + Math.sin(a) * 100;

    const x2 = 300 + Math.cos(a) * 150;
    const y2 = 350 + Math.sin(a) * 150;

    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  c.beginPath();
  c.arc(270, 340, 10, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(330, 340, 10, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(300, 380, 20, 0, Math.PI);
  c.stroke();
}

function drawCarrot(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(220, 280);
  c.lineTo(380, 280);
  c.lineTo(300, 480);
  c.closePath();
  c.stroke();

  c.beginPath();
  c.moveTo(260, 330);
  c.lineTo(280, 330);
  c.stroke();

  c.beginPath();
  c.moveTo(320, 330);
  c.lineTo(340, 330);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 280);
  c.lineTo(300, 180);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 220);
  c.quadraticCurveTo(240, 180, 230, 220);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 220);
  c.quadraticCurveTo(360, 180, 370, 220);
  c.stroke();
}

function drawBroccoli(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(250, 350);
  c.lineTo(250, 480);
  c.lineTo(350, 480);
  c.lineTo(350, 350);
  c.stroke();

  c.beginPath();
  c.arc(200, 300, 60, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(400, 300, 60, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(300, 220, 80, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(250, 280, 50, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(350, 280, 50, 0, Math.PI * 2);
  c.stroke();
}

function drawPumpkin(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(300, 350, 180, 140, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(240, 350, 50, 140, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(360, 350, 50, 140, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 210);
  c.lineTo(300, 160);
  c.stroke();

  c.beginPath();
  c.ellipse(330, 160, 30, 15, Math.PI / 4, 0, Math.PI * 2);
  c.stroke();
}

function drawMushroom(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 300, 160, Math.PI, 0);
  c.stroke();

  c.beginPath();
  c.moveTo(140, 300);
  c.lineTo(160, 450);
  c.quadraticCurveTo(300, 490, 440, 450);
  c.lineTo(460, 300);
  c.stroke();

  c.beginPath();
  c.arc(220, 230, 20, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(320, 200, 30, 0, Math.PI * 2);
  c.fill();
}

function drawPepper(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(250, 200);
  c.quadraticCurveTo(350, 250, 400, 400);
  c.quadraticCurveTo(300, 500, 200, 350);
  c.quadraticCurveTo(150, 250, 250, 200);
  c.stroke();

  c.beginPath();
  c.moveTo(250, 200);
  c.lineTo(250, 150);
  c.stroke();

  c.beginPath();
  c.ellipse(280, 140, 30, 15, 0, 0, Math.PI * 2);
  c.stroke();
}

function drawOnion(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(300, 150);
  c.quadraticCurveTo(150, 300, 300, 450);
  c.quadraticCurveTo(450, 300, 300, 150);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 150);
  c.lineTo(280, 100);

  c.moveTo(300, 150);
  c.lineTo(300, 100);

  c.moveTo(300, 150);
  c.lineTo(320, 100);

  c.stroke();
}

function drawDuck(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 350, 120, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(400, 250, 50, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(450, 250);
  c.lineTo(490, 260);
  c.lineTo(450, 280);
  c.closePath();
  c.stroke();

  c.beginPath();
  c.arc(390, 240, 8, 0, Math.PI * 2);
  c.fill();
}

function drawOwl(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(200, 200);
  c.quadraticCurveTo(300, 150, 400, 200);
  c.quadraticCurveTo(450, 350, 400, 450);
  c.quadraticCurveTo(300, 500, 200, 450);
  c.quadraticCurveTo(150, 350, 200, 200);
  c.stroke();

  c.beginPath();
  c.arc(250, 280, 50, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(350, 280, 50, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(250, 280, 15, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(350, 280, 15, 0, Math.PI * 2);
  c.fill();
}

function drawChick(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 350, 120, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(420, 350);
  c.lineTo(460, 340);
  c.lineTo(420, 370);
  c.closePath();
  c.stroke();

  c.beginPath();
  c.arc(270, 320, 10, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(330, 320, 10, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.moveTo(250, 240);
  c.lineTo(240, 200);

  c.moveTo(350, 240);
  c.lineTo(360, 200);

  c.stroke();
}

function drawSparrow(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(300, 350, 100, 120, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 230);
  c.quadraticCurveTo(350, 180, 400, 220);
  c.stroke();

  c.beginPath();
  c.arc(280, 280, 8, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.moveTo(300, 380);
  c.lineTo(350, 450);
  c.lineTo(300, 450);
  c.closePath();
  c.stroke();
}

function drawEagle(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(300, 350, 50, 100, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(250, 300);
  c.lineTo(100, 200);
  c.lineTo(150, 350);
  c.closePath();
  c.stroke();

  c.beginPath();
  c.moveTo(350, 300);
  c.lineTo(500, 200);
  c.lineTo(450, 350);
  c.closePath();
  c.stroke();

  c.beginPath();
  c.arc(300, 250, 30, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 280);
  c.lineTo(310, 300);
  c.lineTo(290, 300);
  c.closePath();
  c.stroke();
}

function drawParrot(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(300, 350, 80, 120, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(300, 230, 40, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(320, 230);
  c.lineTo(400, 220);
  c.lineTo(320, 250);
  c.closePath();
  c.stroke();

  c.beginPath();
  c.moveTo(300, 470);
  c.lineTo(250, 550);

  c.moveTo(300, 470);
  c.lineTo(350, 550);

  c.stroke();
}

function drawButterfly(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(300, 300, 10, 100, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(200, 250, 100, 80, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(400, 250, 100, 80, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(220, 380, 80, 60, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(380, 380, 80, 60, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 200);
  c.lineTo(280, 150);

  c.moveTo(300, 200);
  c.lineTo(320, 150);

  c.stroke();
}

function drawBee(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(300, 350, 100, 80, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(230, 330);
  c.lineTo(370, 330);
  c.stroke();

  c.beginPath();
  c.moveTo(220, 370);
  c.lineTo(380, 370);
  c.stroke();

  c.beginPath();
  c.ellipse(200, 280, 60, 40, -0.5, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.ellipse(400, 280, 60, 40, 0.5, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(350, 320, 8, 0, Math.PI * 2);
  c.fill();
}

function drawLadybug(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(300, 350, 120, 100, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 250);
  c.lineTo(300, 450);
  c.stroke();

  c.beginPath();
  c.arc(260, 320, 12, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(340, 320, 12, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(260, 380, 12, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(340, 380, 12, 0, Math.PI * 2);
  c.fill();
}

function drawAnt(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 200, 50, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(300, 300, 60, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(300, 420, 70, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(250, 280);
  c.lineTo(150, 250);

  c.moveTo(250, 300);
  c.lineTo(150, 320);

  c.moveTo(350, 280);
  c.lineTo(450, 250);

  c.moveTo(350, 300);
  c.lineTo(450, 320);

  c.stroke();
}

function drawSpider(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 300, 80, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(300, 200, 50, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(250, 300);
  c.lineTo(100, 250);

  c.moveTo(250, 320);
  c.lineTo(100, 320);

  c.moveTo(250, 340);
  c.lineTo(100, 390);

  c.moveTo(350, 300);
  c.lineTo(500, 250);

  c.moveTo(350, 320);
  c.lineTo(500, 320);

  c.moveTo(350, 340);
  c.lineTo(500, 390);

  c.stroke();
}

function drawGrasshopper(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(300, 400, 100, 50, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 400);
  c.lineTo(450, 200);
  c.lineTo(400, 180);
  c.lineTo(300, 350);
  c.stroke();

  c.beginPath();
  c.arc(200, 380, 50, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(220, 340);
  c.lineTo(180, 280);
  c.stroke();
}

function drawGoldfish(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(300, 350, 120, 100, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(180, 350);
  c.lineTo(100, 280);
  c.lineTo(100, 420);
  c.closePath();
  c.stroke();

  c.beginPath();
  c.arc(350, 320, 10, 0, Math.PI * 2);
  c.fill();
}

function drawShark(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(100, 350);
  c.quadraticCurveTo(200, 200, 450, 350);
  c.quadraticCurveTo(400, 450, 100, 350);
  c.stroke();

  c.beginPath();
  c.moveTo(450, 350);
  c.lineTo(500, 280);
  c.lineTo(500, 420);
  c.closePath();
  c.stroke();

  c.beginPath();
  c.moveTo(250, 230);
  c.lineTo(300, 180);
  c.lineTo(320, 230);
  c.stroke();
}

function drawPufferfish(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 350, 120, 0, Math.PI * 2);
  c.stroke();

  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;

    const x1 = 300 + Math.cos(a) * 120;
    const y1 = 350 + Math.sin(a) * 120;

    const x2 = 300 + Math.cos(a) * 150;
    const y2 = 350 + Math.sin(a) * 150;

    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  c.beginPath();
  c.arc(260, 320, 10, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(340, 320, 10, 0, Math.PI * 2);
  c.fill();
}

function drawSeahorse(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(300, 150);
  c.quadraticCurveTo(400, 200, 350, 300);
  c.quadraticCurveTo(250, 350, 300, 450);
  c.quadraticCurveTo(400, 500, 450, 450);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 150);
  c.quadraticCurveTo(200, 180, 250, 250);
  c.stroke();

  c.beginPath();
  c.arc(300, 150, 30, 0, Math.PI * 2);
  c.stroke();
}

function drawOctopus(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 300, 100, Math.PI, 0);
  c.stroke();

  c.beginPath();
  c.moveTo(200, 300);
  c.quadraticCurveTo(150, 500, 200, 450);
  c.stroke();

  c.beginPath();
  c.moveTo(240, 300);
  c.quadraticCurveTo(220, 500, 260, 450);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 300);
  c.lineTo(300, 450);
  c.stroke();

  c.beginPath();
  c.moveTo(360, 300);
  c.quadraticCurveTo(380, 500, 340, 450);
  c.stroke();

  c.beginPath();
  c.moveTo(400, 300);
  c.quadraticCurveTo(450, 500, 400, 450);
  c.stroke();

  c.beginPath();
  c.arc(260, 250, 10, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.arc(340, 250, 10, 0, Math.PI * 2);
  c.fill();
}

function drawCrab(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(300, 350, 120, 80, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(200, 300);
  c.lineTo(100, 200);
  c.arc(80, 200, 20, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(400, 300);
  c.lineTo(500, 200);
  c.arc(520, 200, 20, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(250, 430);
  c.lineTo(200, 500);

  c.moveTo(350, 430);
  c.lineTo(400, 500);

  c.stroke();
}

function drawSunflower(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 250, 60, 0, Math.PI * 2);
  c.stroke();

  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    const x = 300 + Math.cos(a) * 100;
    const y = 250 + Math.sin(a) * 100;

    c.beginPath();
    c.ellipse(x, y, 40, 20, a, 0, Math.PI * 2);
    c.stroke();
  }

  c.beginPath();
  c.moveTo(300, 310);
  c.lineTo(300, 480);
  c.stroke();

  c.beginPath();
  c.ellipse(260, 400, 40, 20, -0.5, 0, Math.PI * 2);
  c.stroke();
}

function drawTulip(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(220, 250);
  c.quadraticCurveTo(300, 100, 380, 250);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 180);
  c.lineTo(300, 250);
  c.stroke();

  c.beginPath();
  c.moveTo(250, 220);
  c.quadraticCurveTo(300, 150, 350, 220);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 250);
  c.lineTo(300, 480);
  c.stroke();

  c.beginPath();
  c.ellipse(260, 400, 40, 20, -0.5, 0, Math.PI * 2);
  c.stroke();
}

function drawRose(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 250, 80, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(300, 250, 50, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.arc(300, 250, 20, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 330);
  c.lineTo(300, 480);
  c.stroke();

  c.beginPath();
  c.ellipse(260, 400, 40, 20, -0.5, 0, Math.PI * 2);
  c.stroke();
}

function drawDaisy(c) {
  setupCtx(c);

  c.beginPath();
  c.arc(300, 250, 40, 0, Math.PI * 2);
  c.stroke();

  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    const x = 300 + Math.cos(a) * 80;
    const y = 250 + Math.sin(a) * 80;

    c.beginPath();
    c.ellipse(x, y, 40, 15, a, 0, Math.PI * 2);
    c.stroke();
  }

  c.beginPath();
  c.moveTo(300, 290);
  c.lineTo(300, 480);
  c.stroke();

  c.beginPath();
  c.ellipse(260, 400, 40, 20, -0.5, 0, Math.PI * 2);
  c.stroke();
}

function drawLotus(c) {
  setupCtx(c);

  c.beginPath();
  c.ellipse(300, 400, 150, 50, 0, 0, Math.PI * 2);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 400);
  c.quadraticCurveTo(200, 200, 300, 250);
  c.quadraticCurveTo(400, 200, 300, 400);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 400);
  c.quadraticCurveTo(150, 300, 250, 350);
  c.quadraticCurveTo(350, 300, 300, 400);
  c.stroke();

  c.beginPath();
  c.moveTo(300, 400);
  c.quadraticCurveTo(450, 300, 350, 350);
  c.quadraticCurveTo(250, 300, 300, 400);
  c.stroke();
}

function drawCactus(c) {
  setupCtx(c);

  c.beginPath();
  c.moveTo(270, 500);
  c.lineTo(270, 200);
  c.quadraticCurveTo(270, 180, 290, 180);
  c.lineTo(310, 180);
  c.quadraticCurveTo(330, 180, 330, 200);
  c.lineTo(330, 500);
  c.closePath();
  c.stroke();

  c.beginPath();
  c.moveTo(270, 300);
  c.lineTo(200, 300);
  c.quadraticCurveTo(180, 300, 180, 320);
  c.lineTo(180, 400);
  c.quadraticCurveTo(180, 420, 200, 420);
  c.lineTo(270, 420);
  c.stroke();

  c.beginPath();
  c.moveTo(330, 350);
  c.lineTo(400, 350);
  c.quadraticCurveTo(420, 350, 420, 370);
  c.lineTo(420, 430);
  c.quadraticCurveTo(420, 450, 400, 450);
  c.lineTo(330, 450);
  c.stroke();
}

// ===== SVG Stencil Pages =====
// Each stencil is a separate high-resolution SVG file.
// Keep these paths relative so they work with VS Code Live Server.

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

// ===== Navigation =====

function showHome() {
  document.getElementById('homeView').style.display = 'flex';
  document.getElementById('canvasView').style.display = 'none';
}

function showCanvas(category) {
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
    btn.style.height = '80px';
    btn.style.width = '100%';
    btn.style.fontSize = '16px';

    btn.innerHTML =
      '<i class="fas fa-upload"></i> Upload Your Image';

    btn.onclick = () =>
      document.getElementById('fileInput').click();

    thumbContainer.appendChild(btn);
    return;
  }

  coloringPages[category].forEach((page, idx) => {
    const thumb = document.createElement('canvas');

    thumb.width = 80;
    thumb.height = 80;

    thumb.className =
      'thumb-canvas' + (idx === 0 ? ' active' : '');

    thumb.title = page.name;

    const tctx = thumb.getContext('2d');

    tctx.fillStyle = 'white';
    tctx.fillRect(0, 0, 80, 80);

    if (page.src) {
      const img = new Image();

      img.onload = () => {
        tctx.imageSmoothingEnabled = true;
        tctx.imageSmoothingQuality = 'high';

        const scale = Math.min(
          80 / img.width,
          80 / img.height
        );

        const w = img.width * scale;
        const h = img.height * scale;

        tctx.drawImage(
          img,
          (80 - w) / 2,
          (80 - h) / 2,
          w,
          h
        );
      };

      img.src = page.src;
    } else if (page.draw) {
      const scale = 80 / 600;

      tctx.save();
      tctx.scale(scale, scale);

      page.draw(tctx);

      tctx.restore();
    }

    thumb.onclick = () => {
      document
        .querySelectorAll('.thumb-canvas')
        .forEach(t => t.classList.remove('active'));

      thumb.classList.add('active');

      loadColoringPage(idx);
    };

    thumbContainer.appendChild(thumb);
  });
}

// ===== Canvas Initialization =====

function initBaseCanvas() {
  baseCtx.fillStyle = 'white';
  baseCtx.fillRect(
    0,
    0,
    baseCanvas.width,
    baseCanvas.height
  );

  baseCtx.lineCap = 'round';
  baseCtx.lineJoin = 'round';
}

async function loadColoringPage(index) {
  currentPageIndex = index;

  initBaseCanvas();
  setupCtx(baseCtx);

  const page = coloringPages[currentCategory][index];

  if (page.src) {
    try {
      const img = await loadStencilImage(page.src);

      const scale = Math.min(
        baseCanvas.width / img.width,
        baseCanvas.height / img.height
      );

      const w = img.width * scale;
      const h = img.height * scale;

      const x = (baseCanvas.width - w) / 2;
      const y = (baseCanvas.height - h) / 2;

      baseCtx.imageSmoothingEnabled = true;
      baseCtx.imageSmoothingQuality = 'high';

      baseCtx.drawImage(
        img,
        x,
        y,
        w,
        h
      );
    } catch (err) {
      console.error(
        'Failed to load stencil:',
        page.src,
        err
      );

      showToast('Could not load this stencil');
    }
  } else if (page.draw) {
    page.draw(baseCtx);
  }

  objects = [];
  selectedObj = null;

  renderCanvas();
  saveState();
}

function loadStencilImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);

    img.onerror = () =>
      reject(new Error(`Unable to load ${src}`));

    img.src = src;
  });
}

function loadBlankCanvas() {
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
  if (
    currentPageIndex >= 0 &&
    currentCategory !== 'yourimage'
  ) {
    loadColoringPage(currentPageIndex);
  } else if (
    currentPageIndex === -2 &&
    currentUploadedImage
  ) {
    initBaseCanvas();

    const scale = Math.min(
      baseCanvas.width / currentUploadedImage.width,
      baseCanvas.height / currentUploadedImage.height
    );

    const w = currentUploadedImage.width * scale;
    const h = currentUploadedImage.height * scale;

    const x = (baseCanvas.width - w) / 2;
    const y = (baseCanvas.height - h) / 2;

    baseCtx.imageSmoothingEnabled = true;
    baseCtx.imageSmoothingQuality = 'high';

    baseCtx.drawImage(
      currentUploadedImage,
      x,
      y,
      w,
      h
    );

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
  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.drawImage(
    baseCanvas,
    0,
    0
  );

  objects.forEach(obj => {
    ctx.save();

    if (obj.type === 'sticker') {
      ctx.font = `${obj.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText(
        obj.val,
        obj.x,
        obj.y
      );
    } else if (obj.type === 'shape') {
      ctx.fillStyle = obj.color;

      ctx.beginPath();

      if (obj.val === 'circle') {
        ctx.arc(
          obj.x,
          obj.y,
          obj.size / 2,
          0,
          Math.PI * 2
        );
      } else if (obj.val === 'square') {
        ctx.rect(
          obj.x - obj.size / 2,
          obj.y - obj.size / 2,
          obj.size,
          obj.size
        );
      } else if (obj.val === 'triangle') {
        ctx.moveTo(
          obj.x,
          obj.y - obj.size / 2
        );

        ctx.lineTo(
          obj.x - obj.size / 2,
          obj.y + obj.size / 2
        );

        ctx.lineTo(
          obj.x + obj.size / 2,
          obj.y + obj.size / 2
        );

        ctx.closePath();
      } else if (obj.val === 'star') {
        drawStar(
          ctx,
          obj.x,
          obj.y,
          5,
          obj.size / 2,
          obj.size / 4
        );
      }

      ctx.fill();
    }

    ctx.restore();
  });

  if (selectedObj) {
    ctx.save();

    const half =
      selectedObj.size / 2 + BBOX_PAD;

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    ctx.strokeRect(
      selectedObj.x - half,
      selectedObj.y - half,
      half * 2,
      half * 2
    );

    ctx.setLineDash([]);

    ctx.fillStyle = '#ffffff';

    const handles = getHandles(selectedObj);

    handles.forEach(h => {
      ctx.beginPath();

      ctx.rect(
        h.x - 6,
        h.y - 6,
        12,
        12
      );

      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }
}

function getHandles(obj) {
  const half =
    obj.size / 2 + BBOX_PAD;

  return [
    {
      x: obj.x - half,
      y: obj.y - half,
      name: 'tl'
    },
    {
      x: obj.x + half,
      y: obj.y - half,
      name: 'tr'
    },
    {
      x: obj.x - half,
      y: obj.y + half,
      name: 'bl'
    },
    {
      x: obj.x + half,
      y: obj.y + half,
      name: 'br'
    }
  ];
}

function drawStar(
  ctx,
  cx,
  cy,
  spikes,
  outerRadius,
  innerRadius
) {
  let rot = Math.PI / 2 * 3;

  let x = cx;
  let y = cy;

  const step = Math.PI / spikes;

  ctx.beginPath();

  ctx.moveTo(
    cx,
    cy - outerRadius
  );

  for (let i = 0; i < spikes; i++) {
    x =
      cx +
      Math.cos(rot) *
      outerRadius;

    y =
      cy +
      Math.sin(rot) *
      outerRadius;

    ctx.lineTo(x, y);

    rot += step;

    x =
      cx +
      Math.cos(rot) *
      innerRadius;

    y =
      cy +
      Math.sin(rot) *
      innerRadius;

    ctx.lineTo(x, y);

    rot += step;
  }

  ctx.lineTo(
    cx,
    cy - outerRadius
  );

  ctx.closePath();
}

// ===== Tools & Colors =====

const colors = [
  '#ff0000',
  '#ff4500',
  '#ffa500',
  '#ffff00',
  '#9acd32',
  '#228b22',
  '#008000',
  '#20b2aa',
  '#00ffff',
  '#0000ff',
  '#4169e1',
  '#800080',
  '#ff1493',
  '#ffc0cb',
  '#000000',
  '#808080',
  '#ffffff',
  '#8b4513'
];

const colorGrid =
  document.getElementById('colorGrid');

colors.forEach(color => {
  const swatch =
    document.createElement('div');

  swatch.className =
    'color-swatch' +
    (color === state.color
      ? ' active'
      : '');

  swatch.style.background = color;

  swatch.onclick = () => {
    state.color = color;

    document
      .querySelectorAll('.color-swatch')
      .forEach(s =>
        s.classList.remove('active')
      );

    swatch.classList.add('active');

    if (
      selectedObj &&
      selectedObj.type === 'shape'
    ) {
      selectedObj.color = color;

      renderCanvas();
      saveState();
    }
  };

  colorGrid.appendChild(swatch);
});

const shapeOptions = [
  {
    val: 'circle',
    icon: 'fa-circle'
  },
  {
    val: 'square',
    icon: 'fa-square'
  },
  {
    val: 'triangle',
    icon: 'fa-play'
  },
  {
    val: 'star',
    icon: 'fa-star'
  }
];

const shapeGrid =
  document.getElementById('shapeGrid');

shapeOptions.forEach(s => {
  const item =
    document.createElement('div');

  item.className =
    'obj-item' +
    (s.val === state.currentShape
      ? ' active'
      : '');

  item.innerHTML =
    `<i class="fas ${s.icon}" style="transform: ${
      s.val === 'triangle'
        ? 'rotate(-90deg)'
        : 'none'
    };"></i>`;

  item.onclick = () => {
    state.currentShape = s.val;

    document
      .querySelectorAll(
        '#shapeGrid .obj-item'
      )
      .forEach(o =>
        o.classList.remove('active')
      );

    item.classList.add('active');
  };

  shapeGrid.appendChild(item);
});

const stickerOptions = [
  '⭐',
  '❤️',
  '🔥',
  '💎',
  '🌈',
  '☀️',
  '🌙',
  '🎈',
  '🌸',
  '🐱',
  '🦄',
  '🐝'
];

const stickerGrid =
  document.getElementById('stickerGrid');

stickerOptions.forEach(s => {
  const item =
    document.createElement('div');

  item.className =
    'obj-item' +
    (s === state.currentSticker
      ? ' active'
      : '');

  item.textContent = s;

  item.onclick = () => {
    state.currentSticker = s;

    document
      .querySelectorAll(
        '#stickerGrid .obj-item'
      )
      .forEach(o =>
        o.classList.remove('active')
      );

    item.classList.add('active');
  };

  stickerGrid.appendChild(item);
});

function setTool(toolName) {
  state.tool = toolName;

  // Remove active state from all tools
  document
    .querySelectorAll('.tool-btn')
    .forEach(button => {
      button.classList.remove('active');
    });

  // Activate selected tool
  const toolButton = document.querySelector(
    `[data-tool="${toolName}"]`
  );

  if (toolButton) {
    toolButton.classList.add('active');
  }

  // Show/hide tool-specific panels
  document.getElementById('shapesPanel').style.display =
    state.tool === 'shape' ? 'block' : 'none';

  document.getElementById('stickersPanel').style.display =
    state.tool === 'sticker' ? 'block' : 'none';

  // Update size label depending on selected tool
  const sizeLabel = document.getElementById('sizeLabel');

  if (state.tool === 'eraser') {
    sizeLabel.textContent = 'Eraser Size';
  } else if (state.tool === 'brush') {
    sizeLabel.textContent = 'Brush Size';
  } else if (state.tool === 'pencil') {
    sizeLabel.textContent = 'Pencil Size';
  } else if (state.tool === 'shape') {
    sizeLabel.textContent = 'Shape Size';
  } else if (state.tool === 'sticker') {
    sizeLabel.textContent = 'Sticker Size';
  } else if (state.tool === 'text') {
    sizeLabel.textContent = 'Text Size';
  } else {
    sizeLabel.textContent = 'Brush Size';
  }

  // Match the cursor to the actual tool
  // ===== Tool Cursors =====

const toolCursors = {
  fill: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 viewBox=%220 0 32 32%22%3E%3Cpath fill=%22%23000000%22 d=%22M8 4h12v5h4v7h-4v8H8V4zm3 3v14h6V7h-6zm9 5v4h2v-4h-2z%22/%3E%3C/svg%3E") 4 4, auto',

  pencil: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 viewBox=%220 0 32 32%22%3E%3Cpath fill=%22%23000000%22 d=%22M5 23l4 4 17-17-4-4L5 23zm-1 6l6-2-4-4-2 6zM24 4l4 4 1-1-4-4-1 1z%22/%3E%3C/svg%3E") 2 30, auto',

  brush: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 viewBox=%220 0 32 32%22%3E%3Cpath fill=%22%23000000%22 d=%22M20 4l8 8-11 11-5-5L23 7l-3-3zM10 20c-5 0-7 3-7 6 0 1 1 2 2 2 4 0 7-2 7-7l-2-1z%22/%3E%3C/svg%3E") 2 30, auto',

  eraser: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 viewBox=%220 0 32 32%22%3E%3Cpath fill=%22%23000000%22 d=%22M6 20L19 7l7 7-13 13H7l-4-4 3-3zm3 5h4l10-10-4-4L9 21l-2 2 2 2z%22/%3E%3C/svg%3E") 2 30, auto',

  text: 'text',
  shape: 'crosshair',
  sticker: 'copy',
  select: 'default'
};

canvas.style.cursor =
  toolCursors[state.tool] || 'default';

}

document
  .querySelectorAll('.tool-btn')
  .forEach(btn => {
    btn.addEventListener(
      'click',
      () => setTool(btn.dataset.tool)
    );
  });

function updateSize(val) {
  state.size = parseInt(val);

  document.getElementById(
    'sizeValue'
  ).textContent =
    val + 'px';

  if (
    selectedObj &&
    state.tool === 'select'
  ) {
    selectedObj.size =
      parseInt(val);

    renderCanvas();
  }
}

// ===== Interaction Logic =====

function getPos(e) {
  const rect =
    canvas.getBoundingClientRect();

  const scaleX =
    canvas.width / rect.width;

  const scaleY =
    canvas.height / rect.height;

  if (
    e.touches &&
    e.touches.length > 0
  ) {
    return {
      x:
        (
          e.touches[0].clientX -
          rect.left
        ) * scaleX,

      y:
        (
          e.touches[0].clientY -
          rect.top
        ) * scaleY
    };
  }

  return {
    x:
      (
        e.clientX -
        rect.left
      ) * scaleX,

    y:
      (
        e.clientY -
        rect.top
      ) * scaleY
  };
}

function getObjectAt(x, y) {
  for (
    let i = objects.length - 1;
    i >= 0;
    i--
  ) {
    const obj = objects[i];

    const half =
      obj.size / 2 +
      BBOX_PAD;

    if (
      x > obj.x - half &&
      x < obj.x + half &&
      y > obj.y - half &&
      y < obj.y + half
    ) {
      return obj;
    }
  }

  return null;
}

function getHandleAt(x, y) {
  if (!selectedObj) {
    return null;
  }

  const handles =
    getHandles(selectedObj);

  for (const h of handles) {
    if (
      Math.abs(x - h.x) < 10 &&
      Math.abs(y - h.y) < 10
    ) {
      return h.name;
    }
  }

  return null;
}

function startDrawing(e) {
  e.preventDefault();

  const pos = getPos(e);

  if (state.tool === 'select') {
    const handle =
      getHandleAt(
        pos.x,
        pos.y
      );

    if (handle) {
      state.isResizing = true;
      state.activeHandle = handle;
      return;
    }

    const hit =
      getObjectAt(
        pos.x,
        pos.y
      );

    if (hit) {
      selectedObj = hit;

      state.isDragging = true;

      dragOffsetX =
        pos.x - hit.x;

      dragOffsetY =
        pos.y - hit.y;

      document.getElementById(
        'sizeSlider'
      ).value = hit.size;

      document.getElementById(
        'sizeValue'
      ).textContent =
        hit.size + 'px';

      document.getElementById(
        'sizeLabel'
      ).textContent =
        'Resize Selected';
    } else {
      selectedObj = null;

      document.getElementById(
        'sizeLabel'
      ).textContent =
        'Object Size';
    }

    renderCanvas();
    return;
  }

  if (state.tool === 'fill') {
    floodFill(
      baseCtx,
      Math.floor(pos.x),
      Math.floor(pos.y),
      state.color
    );

    renderCanvas();
    saveState();

    return;
  }

  if (state.tool === 'text') {
    const text =
      prompt('Enter text:');

    if (text) {
      baseCtx.font =
        `bold ${
          20 + state.size * 2
        }px sans-serif`;

      baseCtx.fillStyle =
        state.color;

      baseCtx.textAlign =
        'center';

      baseCtx.textBaseline =
        'middle';

      baseCtx.fillText(
        text,
        pos.x,
        pos.y
      );

      renderCanvas();
      saveState();
    }

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

    renderCanvas();
    saveState();

    setTool('select');

    document.getElementById(
      'sizeSlider'
    ).value = newObj.size;

    document.getElementById(
      'sizeValue'
    ).textContent =
      newObj.size + 'px';

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

    renderCanvas();
    saveState();

    setTool('select');

    document.getElementById(
      'sizeSlider'
    ).value = newObj.size;

    document.getElementById(
      'sizeValue'
    ).textContent =
      newObj.size + 'px';

    return;
  }

  state.isDrawing = true;

  state.lastX = pos.x;
  state.lastY = pos.y;

  baseCtx.beginPath();

  baseCtx.arc(
    pos.x,
    pos.y,
    state.size / 2,
    0,
    Math.PI * 2
  );

  baseCtx.fillStyle =
    state.tool === 'eraser'
      ? 'white'
      : state.color;

  baseCtx.fill();

  renderCanvas();
}

function draw(e) {
  if (
    state.tool === 'select' &&
    !state.isDragging &&
    !state.isResizing
  ) {
    const pos = getPos(e);

    const handle =
      getHandleAt(
        pos.x,
        pos.y
      );

    if (
      handle === 'tl' ||
      handle === 'br'
    ) {
      canvas.style.cursor =
        'nwse-resize';
    } else if (
      handle === 'tr' ||
      handle === 'bl'
    ) {
      canvas.style.cursor =
        'nesw-resize';
    } else if (
      getObjectAt(
        pos.x,
        pos.y
      )
    ) {
      canvas.style.cursor =
        'move';
    } else {
      canvas.style.cursor =
        'default';
    }
  }

  if (
    !state.isDrawing &&
    !state.isDragging &&
    !state.isResizing
  ) {
    return;
  }

  e.preventDefault();

  const pos = getPos(e);

  if (
    state.isResizing &&
    selectedObj
  ) {
    let fixedX;
    let fixedY;

    const half =
      selectedObj.size / 2 +
      BBOX_PAD;

    if (
      state.activeHandle === 'tl'
    ) {
      fixedX =
        selectedObj.x + half;

      fixedY =
        selectedObj.y + half;
    } else if (
      state.activeHandle === 'tr'
    ) {
      fixedX =
        selectedObj.x - half;

      fixedY =
        selectedObj.y + half;
    } else if (
      state.activeHandle === 'bl'
    ) {
      fixedX =
        selectedObj.x + half;

      fixedY =
        selectedObj.y - half;
    } else if (
      state.activeHandle === 'br'
    ) {
      fixedX =
        selectedObj.x - half;

      fixedY =
        selectedObj.y - half;
    }

    const dx =
      Math.abs(
        pos.x - fixedX
      );

    const dy =
      Math.abs(
        pos.y - fixedY
      );

    let newSize =
      Math.max(dx, dy) -
      BBOX_PAD * 2;

    newSize =
      Math.max(
        20,
        newSize
      );

    const dirX =
      fixedX > selectedObj.x
        ? -1
        : 1;

    const dirY =
      fixedY > selectedObj.y
        ? -1
        : 1;

    selectedObj.size =
      newSize;

    selectedObj.x =
      fixedX +
      dirX *
        (
          newSize / 2 +
          BBOX_PAD
        );

    selectedObj.y =
      fixedY +
      dirY *
        (
          newSize / 2 +
          BBOX_PAD
        );

    document.getElementById(
      'sizeSlider'
    ).value = newSize;

    document.getElementById(
      'sizeValue'
    ).textContent =
      Math.round(newSize) +
      'px';

    renderCanvas();

    return;
  }

  if (
    state.isDragging &&
    selectedObj
  ) {
    selectedObj.x =
      pos.x -
      dragOffsetX;

    selectedObj.y =
      pos.y -
      dragOffsetY;

    renderCanvas();

    return;
  }

  if (state.isDrawing) {
    baseCtx.beginPath();

    baseCtx.moveTo(
      state.lastX,
      state.lastY
    );

    baseCtx.lineTo(
      pos.x,
      pos.y
    );

    baseCtx.lineWidth =
      state.size;

    if (
      state.tool === 'eraser'
    ) {
      baseCtx.strokeStyle =
        'white';
    } else if (
      state.tool === 'brush'
    ) {
      baseCtx.strokeStyle =
        state.color;

      baseCtx.globalAlpha =
        0.6;
    } else {
      baseCtx.strokeStyle =
        state.color;
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

  if (state.isDragging) {
    state.isDragging = false;
    saveState();
  }

  if (state.isResizing) {
    state.isResizing = false;
    state.activeHandle = null;
    saveState();
  }
}

function deleteSelected() {
  if (selectedObj) {
    objects =
      objects.filter(
        o => o !== selectedObj
      );

    selectedObj = null;

    renderCanvas();
    saveState();

    showToast(
      'Object deleted'
    );
  }
}

// ===== Flood Fill =====

function floodFill(
  targetCtx,
  startX,
  startY,
  fillColor
) {
  const imageData =
    targetCtx.getImageData(
      0,
      0,
      targetCtx.canvas.width,
      targetCtx.canvas.height
    );

  const data =
    imageData.data;

  const width =
    targetCtx.canvas.width;

  const targetIdx =
    (
      startY * width +
      startX
    ) * 4;

  const targetR =
    data[targetIdx];

  const targetG =
    data[targetIdx + 1];

  const targetB =
    data[targetIdx + 2];

  const fillRGB =
    hexToRgb(fillColor);

  if (!fillRGB) {
    return;
  }

  if (
    targetR === fillRGB.r &&
    targetG === fillRGB.g &&
    targetB === fillRGB.b
  ) {
    return;
  }

  const stack = [
    [startX, startY]
  ];

  const tolerance = 32;

  while (stack.length > 0) {
    const [x, y] =
      stack.pop();

    if (
      x < 0 ||
      x >= width ||
      y < 0 ||
      y >= targetCtx.canvas.height
    ) {
      continue;
    }

    const idx =
      (y * width + x) * 4;

    if (
      Math.abs(
        data[idx] - targetR
      ) > tolerance ||
      Math.abs(
        data[idx + 1] -
        targetG
      ) > tolerance ||
      Math.abs(
        data[idx + 2] -
        targetB
      ) > tolerance
    ) {
      continue;
    }

    data[idx] =
      fillRGB.r;

    data[idx + 1] =
      fillRGB.g;

    data[idx + 2] =
      fillRGB.b;

    data[idx + 3] =
      255;

    stack.push([
      x + 1,
      y
    ]);

    stack.push([
      x - 1,
      y
    ]);

    stack.push([
      x,
      y + 1
    ]);

    stack.push([
      x,
      y - 1
    ]);
  }

  targetCtx.putImageData(
    imageData,
    0,
    0
  );
}

function hexToRgb(hex) {
  const result =
    /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
      hex
    );

  return result
    ? {
        r: parseInt(
          result[1],
          16
        ),
        g: parseInt(
          result[2],
          16
        ),
        b: parseInt(
          result[3],
          16
        )
      }
    : null;
}

// ===== Image Upload =====

document
  .getElementById('fileInput')
  .addEventListener(
    'change',
    function (e) {
      const file =
        e.target.files[0];

      if (!file) {
        return;
      }

      const reader =
        new FileReader();

      reader.onload =
        function (event) {
          const img =
            new Image();

          img.onload =
            function () {
              currentUploadedImage =
                img;

              currentPageIndex =
                -2;

              initBaseCanvas();

              const scale =
                Math.min(
                  baseCanvas.width /
                    img.width,
                  baseCanvas.height /
                    img.height
                );

              const w =
                img.width *
                scale;

              const h =
                img.height *
                scale;

              const x =
                (
                  baseCanvas.width -
                  w
                ) / 2;

              const y =
                (
                  baseCanvas.height -
                  h
                ) / 2;

              baseCtx.imageSmoothingEnabled =
                true;

              baseCtx.imageSmoothingQuality =
                'high';

              baseCtx.drawImage(
                img,
                x,
                y,
                w,
                h
              );

              objects = [];
              selectedObj = null;

              renderCanvas();
              saveState();

              showToast(
                'Image loaded! Start coloring.'
              );
            };

          img.src =
            event.target.result;
        };

      reader.readAsDataURL(file);

      e.target.value = '';
    }
  );

// ===== History & Actions =====

function saveState() {
  if (
    historyStep <
    history.length - 1
  ) {
    history =
      history.slice(
        0,
        historyStep + 1
      );
  }

  history.push({
    base:
      baseCanvas.toDataURL(),

    objs:
      JSON.parse(
        JSON.stringify(objects)
      )
  });

  if (
    history.length >
    maxHistory
  ) {
    history.shift();
  } else {
    historyStep++;
  }
}

function undo() {
  if (historyStep > 0) {
    historyStep--;

    restoreState(
      history[historyStep]
    );

    showToast('Undone');
  }
}

function restoreState(stateObj) {
  const img =
    new Image();

  img.onload =
    function () {
      baseCtx.clearRect(
        0,
        0,
        baseCanvas.width,
        baseCanvas.height
      );

      baseCtx.drawImage(
        img,
        0,
        0
      );

      objects =
        JSON.parse(
          JSON.stringify(
            stateObj.objs
          )
        );

      selectedObj = null;

      renderCanvas();
    };

  img.src =
    stateObj.base;
}

function downloadPNG() {
  const tempSelected =
    selectedObj;

  selectedObj = null;

  renderCanvas();

  const link =
    document.createElement(
      'a'
    );

  link.download =
    `coloring-masterpiece-${Date.now()}.png`;

  link.href =
    canvas.toDataURL(
      'image/png'
    );

  link.click();

  showToast(
    'Saved to your device!'
  );

  selectedObj =
    tempSelected;

  renderCanvas();
}

function printCanvas() {
  const tempSelected =
    selectedObj;

  selectedObj = null;

  renderCanvas();

  const dataUrl =
    canvas.toDataURL(
      'image/png'
    );

  let windowContent =
    '<!DOCTYPE html><html><head><title>Print Coloring Masterpiece</title>';

  windowContent +=
    '<style>@page { size: auto; margin: 0mm; } body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; } img { max-width: 100%; max-height: 100vh; }</style>';

  windowContent +=
    '</head><body>';

  windowContent +=
    `<img src="${dataUrl}" onload="window.print();window.close()">`;

  windowContent +=
    '</body></html>';

  const printWin =
    window.open(
      '',
      '',
      'width=800,height=600'
    );

  if (printWin) {
    printWin.document.open();
    printWin.document.write(
      windowContent
    );
    printWin.document.close();
  }

  selectedObj =
    tempSelected;

  renderCanvas();
}

// ===== Toast =====

function showToast(msg) {
  const toast =
    document.getElementById(
      'toast'
    );

  if (!toast) {
    return;
  }

  toast.textContent =
    msg;

  toast.classList.add(
    'show'
  );

  clearTimeout(
    window.toastTimeout
  );

  window.toastTimeout =
    setTimeout(
      () =>
        toast.classList.remove(
          'show'
        ),
      2500
    );
}

// ===== Event Listeners =====

canvas.addEventListener(
  'mousedown',
  startDrawing
);

canvas.addEventListener(
  'mousemove',
  draw
);

canvas.addEventListener(
  'mouseup',
  stopDrawing
);

canvas.addEventListener(
  'mouseout',
  stopDrawing
);

canvas.addEventListener(
  'touchstart',
  startDrawing,
  { passive: false }
);

canvas.addEventListener(
  'touchmove',
  draw,
  { passive: false }
);

canvas.addEventListener(
  'touchend',
  stopDrawing
);

document.addEventListener(
  'keydown',
  e => {
    if (
      e.ctrlKey ||
      e.metaKey
    ) {
      if (
        e.key === 'z'
      ) {
        e.preventDefault();
        undo();
      }
    }

    if (
      (
        e.key === 'Delete' ||
        e.key === 'Backspace'
      ) &&
      state.tool === 'select' &&
      selectedObj
    ) {
      e.preventDefault();
      deleteSelected();
    }
  }
);

// ===== Initialization =====

initBaseCanvas();
saveState();

// ===== Explicit UI Wiring =====
// Works reliably with VS Code Live Server.

document
  .querySelectorAll(
    '.category-card[data-category]'
  )
  .forEach(card => {
    card.addEventListener(
      'click',
      () =>
        showCanvas(
          card.dataset.category
        )
    );
  });

document
  .getElementById('homeBtn')
  ?.addEventListener(
    'click',
    showHome
  );

document
  .getElementById('undoBtn')
  ?.addEventListener(
    'click',
    undo
  );

document
  .getElementById('resetBtn')
  ?.addEventListener(
    'click',
    resetCanvas
  );

document
  .getElementById('blankBtn')
  ?.addEventListener(
    'click',
    loadBlankCanvas
  );

document
  .getElementById('printBtn')
  ?.addEventListener(
    'click',
    printCanvas
  );

document
  .getElementById('saveBtn')
  ?.addEventListener(
    'click',
    downloadPNG
  );

document
  .getElementById('deleteBtn')
  ?.addEventListener(
    'click',
    deleteSelected
  );

document
  .getElementById('sizeSlider')
  ?.addEventListener(
    'input',
    e =>
      updateSize(
        e.target.value
      )
  );