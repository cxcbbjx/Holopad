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
  
  // Clear with transparent black
  ctx.clearRect(0, 0, size, size);
  
  const imgAR = img.width / img.height;
  let drawW = size, drawH = size, dx = 0, dy = 0;
  
  // Use 'contain' logic to preserve aspect ratio without cropping
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

  // Apply SAM Mask if available (Crucial for "Same Figure" cutout)
  try {
    const seg = await getSegmentation(imagePath);
    if (seg && seg.maskUrl) {
      const maskImg = await loadImage(seg.maskUrl);
      const mCanvas = createCanvas(size, size);
      const mCtx = mCanvas.getContext('2d');
      // Draw mask with same fit logic
      mCtx.drawImage(maskImg, dx, dy, drawW, drawH);
      
      const mData = mCtx.getImageData(0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size);
      
      for (let i = 0; i < mData.data.length; i += 4) {
        // Mask is white on black. White = Keep.
        const maskVal = mData.data[i]; 
        if (maskVal < 100) {
          imgData.data[i + 3] = 0; // Transparent
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  } catch (e) {
      console.log("Mask apply failed", e);
  }

  if (textureBufferOverride) {
    const overlayImg = await loadImage(textureBufferOverride);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(overlayImg, 0, 0, size, size);
    ctx.globalAlpha = 1.0;
  }
  
  // Holographic Tint (Optional)
  if (opts.applyEffects !== false) {
    const iData = ctx.getImageData(0,0,size,size);
    for(let i=0; i<iData.data.length; i+=4) {
        if(iData.data[i+3] > 0) {
            // Add blueish tint to non-transparent pixels
            iData.data[i] = Math.min(255, iData.data[i] + 20); // R
            iData.data[i+1] = Math.min(255, iData.data[i+1] + 40); // G
            iData.data[i+2] = Math.min(255, iData.data[i+2] + 80); // B
        }
    }
    ctx.putImageData(iData, 0, 0);
  }

  const pngBuffer = canvas.toBuffer('image/png');
  const tex = doc.createTexture('userTexture').setMimeType('image/png').setImage(pngBuffer);
  const mat = doc.createMaterial('userMat');
  try {
      mat.setBaseColorTexture(tex)
         .setEmissiveFactor([0.0, 0.0, 0.0])
         .setAlphaMode('BLEND')
         .setDoubleSided(true)
         .setMetallicFactor(0.1)
         .setRoughnessFactor(0.8);
  } catch (e) {
      console.warn("Material setup failed:", e);
  }
  
  // Create a mesh with aspect ratio adjustment
  const ar = drawW / drawH;
  // Base height 1.5 meters
  const meshH = 1.5;
  const meshW = meshH * ar;
  const meshD = 0.1; // 10cm thickness

  const buffer = doc.createBuffer('buffer');
  
  // Box Geometry (24 vertices for hard edges)
  // Front Face (Z+)
  const pFront = [
    -meshW/2, -meshH/2,  meshD/2, // 0: BL
     meshW/2, -meshH/2,  meshD/2, // 1: BR
     meshW/2,  meshH/2,  meshD/2, // 2: TR
    -meshW/2,  meshH/2,  meshD/2  // 3: TL
  ];
  // Back Face (Z-)
  const pBack = [
     meshW/2, -meshH/2, -meshD/2, // 4: BL (from back view)
    -meshW/2, -meshH/2, -meshD/2, // 5: BR
    -meshW/2,  meshH/2, -meshD/2, // 6: TR
     meshW/2,  meshH/2, -meshD/2  // 7: TL
  ];
  // Top Face (Y+)
  const pTop = [
    -meshW/2,  meshH/2,  meshD/2,
     meshW/2,  meshH/2,  meshD/2,
     meshW/2,  meshH/2, -meshD/2,
    -meshW/2,  meshH/2, -meshD/2
  ];
  // Bottom Face (Y-)
  const pBottom = [
    -meshW/2, -meshH/2, -meshD/2,
     meshW/2, -meshH/2, -meshD/2,
     meshW/2, -meshH/2,  meshD/2,
    -meshW/2, -meshH/2,  meshD/2
  ];
  // Right Face (X+)
  const pRight = [
     meshW/2, -meshH/2,  meshD/2,
     meshW/2, -meshH/2, -meshD/2,
     meshW/2,  meshH/2, -meshD/2,
     meshW/2,  meshH/2,  meshD/2
  ];
  // Left Face (X-)
  const pLeft = [
    -meshW/2, -meshH/2, -meshD/2,
    -meshW/2, -meshH/2,  meshD/2,
    -meshW/2,  meshH/2,  meshD/2,
    -meshW/2,  meshH/2, -meshD/2
  ];

  const positionsArr = new Float32Array([
    ...pFront, ...pBack, ...pTop, ...pBottom, ...pRight, ...pLeft
  ]);

  // UVs (Flipped Y for Front/Back to fix upside-down issue)
  // Standard GLTF: (0,1) is Top-Left? No, (0,0) is Bottom-Left. 
  // If user says it's upside down, we invert V.
  const uvFront = [
    0, 1, // BL -> Top-Left Texture
    1, 1, // BR -> Top-Right Texture
    1, 0, // TR -> Bottom-Right Texture
    0, 0  // TL -> Bottom-Left Texture
  ];
  // Back face same orientation
  const uvBack = [...uvFront];
  // Sides can just stretch the edge pixel or be blank. Let's map them to 0,0 (one pixel)
  const uvSide = [0,0, 0,0, 0,0, 0,0];

  const uvsArr = new Float32Array([
    ...uvFront, ...uvBack, ...uvSide, ...uvSide, ...uvSide, ...uvSide
  ]);

  // Indices (2 triangles per face)
  // 0,1,2, 0,2,3
  const createFaceIndices = (offset) => [
    offset, offset+1, offset+2, 
    offset, offset+2, offset+3
  ];

  const indicesArr = new Uint16Array([
    ...createFaceIndices(0),  // Front
    ...createFaceIndices(4),  // Back
    ...createFaceIndices(8),  // Top
    ...createFaceIndices(12), // Bottom
    ...createFaceIndices(16), // Right
    ...createFaceIndices(20)  // Left
  ]);

  const positions = doc.createAccessor('positions').setType('VEC3').setArray(positionsArr).setBuffer(buffer);
  const uvs = doc.createAccessor('uvs').setType('VEC2').setArray(uvsArr).setBuffer(buffer);
  const indices = doc.createAccessor('indices').setType('SCALAR').setArray(indicesArr).setBuffer(buffer);
  
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', positions)
    .setAttribute('TEXCOORD_0', uvs)
    .setIndices(indices)
    .setMaterial(mat);

  const mesh = doc.createMesh('box').addPrimitive(prim);
  const node = doc.createNode('HoloBox').setMesh(mesh);
  const scene = doc.createScene('Scene').addChild(node);
  await io.write(outPath, doc);
  return outPath;
}

module.exports.createPlaneGLB = createPlaneGLB;
