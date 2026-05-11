import {
  IMG_W, IMG_H, NAME_X_PCT, NAME_Y_PCT,
  FONT_SIZE_DEFAULT, FONT_SIZE_MIN, FONT_FACE, FONT_COLOR, LINE_WIDTH,
  DOM
} from './config.js';

export const bgImg = new Image();
let ctx = null;

export function initCanvas() {
  ctx = DOM.previewCanvas.getContext('2d');
  DOM.previewCanvas.width = IMG_W;
  DOM.previewCanvas.height = IMG_H;

  // Load diploma image from backend
  fetch('/diploma-image')
    .then(res => res.blob())
    .then(blob => {
      bgImg.src = URL.createObjectURL(blob);
    })
    .catch(err => console.error('Failed to load diploma image:', err));

  bgImg.onload = () => drawPreview();
}

export function calcFontSize(text) {
  let size = FONT_SIZE_DEFAULT;
  ctx.font = `${size}px ${FONT_FACE}`;
  while (ctx.measureText(text).width > LINE_WIDTH && size > FONT_SIZE_MIN) {
    size--;
    ctx.font = `${size}px ${FONT_FACE}`;
  }
  return size;
}

export function drawPreview() {
  if (!ctx || !bgImg.complete) return;

  ctx.clearRect(0, 0, IMG_W, IMG_H);
  ctx.drawImage(bgImg, 0, 0, IMG_W, IMG_H);

  const name = DOM.nameInput.value.trim();
  if (!name) return;

  const size = calcFontSize(name);
  const x = (NAME_X_PCT / 100) * IMG_W;
  const y = (NAME_Y_PCT / 100) * IMG_H;

  ctx.save();
  ctx.fillStyle = FONT_COLOR;
  ctx.font = `${size}px ${FONT_FACE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, x, y);
  ctx.restore();
}

export function truncateToLimit(text) {
  ctx.font = `${FONT_SIZE_MIN}px ${FONT_FACE}`;
  if (ctx.measureText(text).width <= LINE_WIDTH) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    ctx.font = `${FONT_SIZE_MIN}px ${FONT_FACE}`;
    if (ctx.measureText(text.slice(0, mid)).width <= LINE_WIDTH) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo);
}

export function setupNameInputValidation() {
  DOM.nameInput.addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;

    const projected = DOM.nameInput.value + e.key;
    ctx.font = `${FONT_SIZE_MIN}px ${FONT_FACE}`;
    if (ctx.measureText(projected.trim()).width > LINE_WIDTH) {
      e.preventDefault();
    }
  });

  DOM.nameInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const combined = DOM.nameInput.value.slice(0, DOM.nameInput.selectionStart)
      + pasted
      + DOM.nameInput.value.slice(DOM.nameInput.selectionEnd);
    DOM.nameInput.value = truncateToLimit(combined);
    DOM.nameInput.dispatchEvent(new Event('input'));
  });

  DOM.nameInput.addEventListener('input', drawPreview);
}
