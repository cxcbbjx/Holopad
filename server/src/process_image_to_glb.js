// server/src/process_image_to_glb.js
const fs = require('fs');
const path = require('path');
const { NodeIO, Document } = require('@gltf-transform/core');
const { createCanvas, loadImage } = require('canvas');
const { getFaceBox } = require('./face_client');
const { getSegmentation } = require('./sam_client');

async function createTexturedGLB(imagePath, outPath, textureBufferOverride = null, opts = {}) {
  const io = new NodeIO();

  const templatePath = path.join(__dirname, 'templates', 'head_template.glb');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Template GLB not found at ' + templatePath);
  }
  // read the template GLB (await)
  const doc = await io.read(templatePath);

  // load uploaded image into canvas, then composite optional overlay
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const img = await loadImage(imagePath);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const imgAR = img.width / img.height;
  let didFaceAwareCrop = false;
  try {
    const faceProbe = await getFaceBox(imagePath);
    if (faceProbe && faceProbe.bbox) {
      let fx = faceProbe.bbox.x, fy = faceProbe.bbox.y, fw = faceProbe.bbox.w, fh = faceProbe.bbox.h;
      if (fx <= 1 && fy <= 1 && fw <= 1 && fh <= 1) {
        fx = fx * img.width; fy = fy * img.height; fw = fw * img.width; fh = fh * img.height;
      }
      const topH = Math.round(size * 0.46);
      const bottomH = size - topH;
      let sxF = Math.max(0, Math.round(fx));
      let syF = Math.max(0, Math.round(fy - fh * 0.15));
      let swF = Math.min(img.width - sxF, Math.round(fw * 1.4));
      let shF = Math.min(img.height - syF, Math.round(fh * 1.4));
      ctx.drawImage(img, sxF, syF, swF, shF, 0, 0, size, topH);
      const torsoTop = Math.round(fy + fh * 0.2);
      const sxT = 0;
      const syT = Math.max(0, torsoTop);
      const swT = img.width;
      const shT = Math.max(1, img.height - syT);
      ctx.drawImage(img, sxT, syT, swT, shT, 0, topH, size, bottomH);
      didFaceAwareCrop = true;
    }
  } catch {}
  if (!didFaceAwareCrop) {
    let drawW = size, drawH = size, dx = 0, dy = 0;
    const fit = opts.fit || 'cover';
    if (fit === 'contain') {
      if (imgAR > 1) {
        drawW = size;
        drawH = Math.round(size / imgAR);
        dy = Math.round((size - drawH) / 2);
      } else {
        drawH = size;
        drawW = Math.round(size * imgAR);
        dx = Math.round((size - drawW) / 2);
      }
    } else {
      if (imgAR > 1) {
        drawH = size;
        drawW = Math.round(size * imgAR);
        dx = Math.round((size - drawW) / 2);
      } else {
        drawW = size;
        drawH = Math.round(size / imgAR);
        dy = Math.round((size - drawH) / 2);
      }
    }
    ctx.drawImage(img, dx, dy, drawW, drawH);
  }

  try {
    const face = await getFaceBox(imagePath);
    if (face && face.bbox) {
      let fx = face.bbox.x, fy = face.bbox.y, fw = face.bbox.w, fh = face.bbox.h;
      if (fx <= 1 && fy <= 1 && fw <= 1 && fh <= 1) {
        fx = Math.round(fx * img.width);
        fy = Math.round(fy * img.height);
        fw = Math.round(fw * img.width);
        fh = Math.round(fh * img.height);
      }
      const sx = dx + Math.round(fx * (drawW / img.width));
      const sy = dy + Math.round(fy * (drawH / img.height));
      const sw = Math.max(4, Math.round(fw * (drawW / img.width)));
      const sh = Math.max(4, Math.round(fh * (drawH / img.height)));
      const roi = ctx.getImageData(sx, sy, Math.min(sw, size - sx), Math.min(sh, size - sy));
      const out = ctx.createImageData(roi.width, roi.height);
      const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
      const w = roi.width, h = roi.height;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let r = 0, g = 0, b = 0, a = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const ix = Math.min(w - 1, Math.max(0, x + kx));
              const iy = Math.min(h - 1, Math.max(0, y + ky));
              const idx = (iy * w + ix) * 4;
              const kval = k[(ky + 1) * 3 + (kx + 1)];
              r += roi.data[idx] * kval;
              g += roi.data[idx + 1] * kval;
              b += roi.data[idx + 2] * kval;
              a += roi.data[idx + 3] * (kx === 0 && ky === 0 ? 1 : 0);
            }
          }
          const oidx = (y * w + x) * 4;
          out.data[oidx] = Math.max(0, Math.min(255, r));
          out.data[oidx + 1] = Math.max(0, Math.min(255, g));
          out.data[oidx + 2] = Math.max(0, Math.min(255, b));
          out.data[oidx + 3] = Math.max(0, Math.min(255, a || 255));
        }
      }
      ctx.putImageData(out, sx, sy);
    }
  } catch {}

  try {
    const seg = await getSegmentation(imagePath);
    if (seg && seg.maskUrl) {
      const maskImg = await loadImage(seg.maskUrl);
      const mCanvas = createCanvas(size, size);
      const mCtx = mCanvas.getContext('2d');
      mCtx.drawImage(maskImg, 0, 0, size, size);
      const mData = mCtx.getImageData(0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size);
      for (let i = 0; i < mData.data.length; i += 4) {
        const alpha = mData.data[i]; 
        if (alpha < 128) {
          imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] * 0.85));
          imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] * 0.85));
          imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] * 0.85));
          const b = imgData.data[i + 2];
          imgData.data[i + 2] = Math.max(0, Math.min(255, b * 0.92));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  } catch {}

  if (textureBufferOverride) {
    const overlayImg = await loadImage(textureBufferOverride);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(overlayImg, 0, 0, size, size);
    ctx.globalAlpha = 1.0;
  }

  if (opts.applyEffects !== false) {
    ctx.fillStyle = 'rgba(30,160,255,0.18)';
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < size; y += 6) ctx.fillRect(0, y, size, 1);
    ctx.globalAlpha = 1.0;
  }

  const pngBuffer = canvas.toBuffer('image/png');

  // get document root & materials
  const root = doc.getRoot ? doc.getRoot() : (doc.root || null);
  if (!root) throw new Error('Could not access document root');
  const mats = typeof root.listMaterials === 'function' ? root.listMaterials() : (root.materials || []);
  if (!mats || mats.length === 0) throw new Error('No materials found in template GLB');

  // create glTF-Transform textures
  const texture = doc.createTexture('userTexture').setMimeType('image/png').setImage(pngBuffer);
  let emissiveTex = null;
  if (textureBufferOverride && opts.applyEffects !== false) {
    try {
      const emissiveBuf = fs.readFileSync(textureBufferOverride);
      emissiveTex = doc.createTexture('userEmissive').setMimeType('image/png').setImage(emissiveBuf);
    } catch {}
  }

  // Helper to set base color texture in multiple possible APIs
  function setBaseColorTextureOnMaterial(mat, tex) {
    // 1) Preferred: PBRMetallicRoughness API
    try {
      if (typeof mat.getPBRMetallicRoughness === 'function') {
        const pbr = mat.getPBRMetallicRoughness();
        if (pbr && typeof pbr.setBaseColorTexture === 'function') {
          pbr.setBaseColorTexture(tex);
          return true;
        }
      }
    } catch (e) { /* ignore and continue */ }

    // 2) direct material helper (some docs have setBaseColorTexture)
    try {
      if (typeof mat.setBaseColorTexture === 'function') {
        mat.setBaseColorTexture(tex);
        return true;
      }
    } catch (e) { /* ignore */ }

    // 3) older helper: getBaseColorTexture() returns a TextureInfo object that may have setTexture
    try {
      if (typeof mat.getBaseColorTexture === 'function') {
        const info = mat.getBaseColorTexture();
        if (info && typeof info.setTexture === 'function') {
          info.setTexture(tex);
          return true;
        }
      }
    } catch (e) { /* ignore */ }

    // 4) fallback: try to set pbrMetallicRoughness.baseColorTexture directly (low-level)
    try {
      if (mat.pbrMetallicRoughness && typeof mat.pbrMetallicRoughness === 'object') {
        mat.pbrMetallicRoughness.baseColorTexture = tex;
        return true;
      }
    } catch (e) { /* ignore */ }

    return false;
  }

  function setEmissiveTextureOnMaterial(mat, tex) {
    try {
      if (typeof mat.setEmissiveTexture === 'function') { mat.setEmissiveTexture(tex); return true; }
    } catch {}
    try {
      if (typeof mat.getEmissiveTexture === 'function') {
        const info = mat.getEmissiveTexture();
        if (info && typeof info.setTexture === 'function') { info.setTexture(tex); return true; }
      }
    } catch {}
    try {
      if (mat.emissiveTexture !== undefined) { mat.emissiveTexture = tex; return true; }
    } catch {}
    return false;
  }

  // Attempt to set the texture on the first material that accepts it
  let replaced = false;
  for (const mat of mats) {
    try {
      if (setBaseColorTextureOnMaterial(mat, texture)) {
        // tweak material appearance
        try {
          if (opts.applyEffects !== false) {
            if (typeof mat.setRoughnessFactor === 'function') mat.setRoughnessFactor(0.25);
            if (typeof mat.setMetallicFactor === 'function') mat.setMetallicFactor(0.05);
            if (typeof mat.setEmissiveFactor === 'function') mat.setEmissiveFactor([0.08, 0.3, 0.9]);
            if (typeof mat.setAlphaMode === 'function') mat.setAlphaMode('BLEND');
            if (typeof mat.setDoubleSided === 'function') mat.setDoubleSided(true);
            if (emissiveTex) setEmissiveTextureOnMaterial(mat, emissiveTex);
          }
        } catch (e) { /* ignore */ }
        replaced = true;
        break;
      }
    } catch (e) {
      // continue to next material
      console.warn('Material replace failed (continuing):', e.message || e);
    }
  }

  if (!replaced) {
    throw new Error('Could not attach texture to any material in template GLB (unsupported material API).');
  }

  // write out the new GLB
  await io.write(outPath, doc);
  return outPath;
}

module.exports = { createTexturedGLB };

async function createPlaneGLB(imagePath, outPath, textureBufferOverride = null, opts = {}) {
  const doc = new Document();
  const io = new NodeIO();
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const img = await loadImage(imagePath);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const imgAR = img.width / img.height;
  let drawW = size, drawH = size, dx = 0, dy = 0;
  if (imgAR > 1) {
    drawW = size;
    drawH = Math.round(size / imgAR);
    dy = Math.round((size - drawH) / 2);
  } else {
    drawH = size;
    drawW = Math.round(size * imgAR);
    dx = Math.round((size - drawW) / 2);
  }
  ctx.drawImage(img, dx, dy, drawW, drawH);
  if (textureBufferOverride) {
    const overlayImg = await loadImage(textureBufferOverride);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(overlayImg, 0, 0, size, size);
    ctx.globalAlpha = 1.0;
  }
  if (opts.applyEffects !== false) {
    ctx.fillStyle = 'rgba(30,160,255,0.14)';
    ctx.fillRect(0, 0, size, size);
  }
  const pngBuffer = canvas.toBuffer('image/png');
  const tex = doc.createTexture('userTexture').setMimeType('image/png').setImage(pngBuffer);
  const mat = doc.createMaterial('userMat');
  try {
    const pbr = mat.getPBRMetallicRoughness();
    if (pbr && typeof pbr.setBaseColorTexture === 'function') {
      pbr.setBaseColorTexture(tex);
    }
    if (typeof mat.setEmissiveFactor === 'function') mat.setEmissiveFactor([0.1, 0.35, 0.9]);
    if (typeof mat.setAlphaMode === 'function') mat.setAlphaMode('BLEND');
    if (typeof mat.setDoubleSided === 'function') mat.setDoubleSided(true);
  } catch {}
  const buffer = doc.createBuffer('buffer');
  const positions = doc.createAccessor('positions').setType('VEC3').setArray(new Float32Array([
    -0.7, -0.7, 0,
     0.7, -0.7, 0,
     0.7,  0.7, 0,
    -0.7,  0.7, 0
  ])).setBuffer(buffer);
  const uvs = doc.createAccessor('uvs').setType('VEC2').setArray(new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1
  ])).setBuffer(buffer);
  const indices = doc.createAccessor('indices').setType('SCALAR').setArray(new Uint16Array([0,1,2,0,2,3])).setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', positions).setAttribute('TEXCOORD_0', uvs).setIndices(indices).setMaterial(mat);
  const mesh = doc.createMesh('quad').addPrimitive(prim);
  const node = doc.createNode('Quad').setMesh(mesh);
  doc.getRoot().addNode(node);
  await io.write(outPath, doc);
  return outPath;
}

module.exports.createPlaneGLB = createPlaneGLB;
