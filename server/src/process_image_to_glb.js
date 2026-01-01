// server/src/process_image_to_glb.js
const fs = require('fs');
const path = require('path');
const { NodeIO } = require('@gltf-transform/core');
const { createCanvas, loadImage } = require('canvas');

async function createTexturedGLB(imagePath, outPath) {
  const io = new NodeIO();

  const templatePath = path.join(__dirname, 'templates', 'head_template.glb');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Template GLB not found at ' + templatePath);
  }

  // read the template GLB (await)
  const doc = await io.read(templatePath);

  // load uploaded image into canvas
  const img = await loadImage(imagePath);
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // draw cover (center-crop) into square canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const imgAR = img.width / img.height;
  let drawW = size, drawH = size, dx = 0, dy = 0;
  if (imgAR > 1) { // wide
    drawH = size;
    drawW = Math.round(size * imgAR);
    dx = Math.round((size - drawW) / 2);
  } else {
    drawW = size;
    drawH = Math.round(size / imgAR);
    dy = Math.round((size - drawH) / 2);
  }
  ctx.drawImage(img, dx, dy, drawW, drawH);

  // hologram tint + subtle scanlines
  ctx.fillStyle = 'rgba(30,160,255,0.18)';
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffffff';
  for (let y = 0; y < size; y += 6) ctx.fillRect(0, y, size, 1);
  ctx.globalAlpha = 1.0;

  const pngBuffer = canvas.toBuffer('image/png');

  // get document root & materials
  const root = doc.getRoot ? doc.getRoot() : (doc.root || null);
  if (!root) throw new Error('Could not access document root');
  const mats = typeof root.listMaterials === 'function' ? root.listMaterials() : (root.materials || []);
  if (!mats || mats.length === 0) throw new Error('No materials found in template GLB');

  // create glTF-Transform texture from buffer
  const texture = doc.createTexture('userTexture').setMimeType('image/png').setImage(pngBuffer);

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

  // Attempt to set the texture on the first material that accepts it
  let replaced = false;
  for (const mat of mats) {
    try {
      if (setBaseColorTextureOnMaterial(mat, texture)) {
        // tweak material appearance
        try {
          if (typeof mat.setRoughnessFactor === 'function') mat.setRoughnessFactor(0.25);
          if (typeof mat.setMetallicFactor === 'function') mat.setMetallicFactor(0.05);
          if (typeof mat.setEmissiveFactor === 'function') mat.setEmissiveFactor([0.08, 0.3, 0.9]);
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
