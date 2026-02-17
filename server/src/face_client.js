const fs = require('fs');
async function getFaceBox(imagePath) {
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    const res = await fetch('http://localhost:7001/face', { method: 'POST', body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    // Expect { bbox: { x, y, w, h } } in normalized [0,1] coordinates or pixels
    return data;
  } catch {
    return null;
  }
}
module.exports = { getFaceBox };
