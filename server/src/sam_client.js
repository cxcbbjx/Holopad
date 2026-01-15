const fs = require('fs');
const path = require('path');
/**
 * Attempts to call a local SAM service. If unavailable, returns null.
 * Expected response: { maskUrl } pointing to a file in server public dir.
 */
async function getSegmentation(imagePath) {
  try {
    const url = 'http://localhost:8001/segment';
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

module.exports = { getSegmentation };
