const fs = require('fs');
const path = require('path');
async function reconstruct(imagePath, outDir, baseName) {
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    const res = await fetch('http://localhost:7000/reconstruct', { method: 'POST', body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.glbBase64) {
      const filePath = path.join(outDir, `${baseName}_self.glb`);
      fs.writeFileSync(filePath, Buffer.from(data.glbBase64, 'base64'));
      return filePath;
    }
    if (data.modelUrl) {
      const filePath = path.join(outDir, `${baseName}_self.glb`);
      const r = await fetch(data.modelUrl);
      if (!r.ok) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(filePath, buf);
      return filePath;
    }
    return null;
  } catch {
    return null;
  }
}
module.exports = { reconstruct };
