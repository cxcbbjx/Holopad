const fs = require('fs');
const path = require('path');

async function getSegmentation(imagePath) {
  try {
    const url = 'http://localhost:8001/segment';
    const formData = new (require('form-data'))();
    formData.append('image', fs.createReadStream(imagePath));
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    return data; // { maskUrl } expected
  } catch {
    return null;
  }
}

module.exports = { getSegmentation };
