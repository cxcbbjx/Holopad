const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

function toGrayscale(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const y = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(img, 0, 0);
  return img;
}

function sobel(gray, w, h) {
  const out = new Uint8ClampedArray(w * h);
  const data = gray.data;
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sx = 0, sy = 0, p = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const ix = (y + ky) * w + (x + kx);
          const val = data[ix * 4];
          const kk = p++;
          sx += gx[kk] * val;
          sy += gy[kk] * val;
        }
      }
      const mag = Math.min(255, Math.hypot(sx, sy) | 0);
      out[y * w + x] = mag;
    }
  }
  return out;
}

function threshold(edges, w, h, t = 80) {
  const bin = new Uint8ClampedArray(w * h);
  for (let i = 0; i < edges.length; i++) bin[i] = edges[i] > t ? 255 : 0;
  return bin;
}

function traceContours(bin, w, h, maxPoints = 3000) {
  const visited = new Uint8Array(w * h);
  const contours = [];
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (bin[idx] === 255 && !visited[idx]) {
        const points = [];
        const stack = [[x, y]];
        visited[idx] = 1;
        while (stack.length && points.length < maxPoints) {
          const [cx, cy] = stack.pop();
          points.push([cx, cy]);
          for (const [dx, dy] of dirs) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nidx = ny * w + nx;
            if (bin[nidx] === 255 && !visited[nidx]) {
              visited[nidx] = 1;
              stack.push([nx, ny]);
            }
          }
        }
        if (points.length > 40) contours.push(points);
      }
    }
  }
  return contours;
}

function fourierDescriptors(points, K = 12) {
  const N = points.length;
  const cx = points.map(p => p[0]);
  const cy = points.map(p => p[1]);
  const mx = cx.reduce((a,b)=>a+b,0)/N;
  const my = cy.reduce((a,b)=>a+b,0)/N;
  const x = cx.map(v => v - mx);
  const y = cy.map(v => v - my);
  const coeffs = [];
  for (let k = 1; k <= K; k++) {
    let aX = 0, bX = 0, aY = 0, bY = 0;
    for (let n = 0; n < N; n++) {
      const t = (2 * Math.PI * k * n) / N;
      aX += x[n] * Math.cos(t);
      bX += x[n] * Math.sin(t);
      aY += y[n] * Math.cos(t);
      bY += y[n] * Math.sin(t);
    }
    aX /= N; bX /= N; aY /= N; bY /= N;
    coeffs.push({ k, aX, bX, aY, bY });
  }
  return { center: [mx, my], coeffs };
}

async function generateFromImage(imagePath, options = {}) {
  const size = options.size || 512;
  const img = await loadImage(imagePath);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const imgAR = img.width / img.height;
  let drawW = size, drawH = size, dx = 0, dy = 0;
  if (imgAR > 1) { drawH = size; drawW = Math.round(size * imgAR); dx = Math.round((size - drawW) / 2); }
  else { drawW = size; drawH = Math.round(size / imgAR); dy = Math.round((size - drawH) / 2); }
  ctx.drawImage(img, dx, dy, drawW, drawH);
  const gray = toGrayscale(ctx, size, size);
  const edges = sobel(gray, size, size);
  const bin = threshold(edges, size, size, options.threshold || 90);
  const contours = traceContours(bin, size, size);
  const equations = contours.slice(0, options.maxContours || 8).map(c => fourierDescriptors(c, options.harmonics || 10));
  const overlay = createCanvas(size, size);
  const octx = overlay.getContext('2d');
  octx.clearRect(0,0,size,size);
  octx.globalAlpha = 0.9;
  octx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
  octx.lineWidth = 1.2;
  for (const c of contours) {
    octx.beginPath();
    for (let i = 0; i < c.length; i++) {
      const [x,y] = c[i];
      if (i === 0) octx.moveTo(x,y); else octx.lineTo(x,y);
    }
    octx.stroke();
  }
  return { equations, overlayBuffer: overlay.toBuffer('image/png') };
}

function saveEquationsJSON(equations, outDir, baseName) {
  const outPath = path.join(outDir, `${baseName}.meg.json`);
  fs.writeFileSync(outPath, JSON.stringify({ version: 1, equations }, null, 2));
  return outPath;
}

module.exports = { generateFromImage, saveEquationsJSON };
