const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const SAM_BASE = process.env.SAM_BASE_URL || 'http://localhost:8001';

async function getSegmentation(imagePath) {
  try {
    const url = `${SAM_BASE}/segment`;
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));

    const res = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    return res.data;
  } catch (e) {
    console.error("SAM Service Error:", e.message);
    return null;
  }
}

async function getDepthHologram(imagePath) {
    try {
        const url = `${SAM_BASE}/to-hologram-depth`;
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));

        const res = await axios.post(url, formData, {
            headers: {
                ...formData.getHeaders()
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            validateStatus: (status) => status < 500 // Handle 4xx as valid response to check custom fields
        });

        return res.data;
    } catch (e) {
        console.error("Depth Gen Error:", e.message);
        return null;
    }
}

async function getExtrudedGLB(imagePath) {
    try {
        const url = `${SAM_BASE}/to-glb`;
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));

        const res = await axios.post(url, formData, {
            headers: {
                ...formData.getHeaders()
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            validateStatus: (status) => status < 500
        });

        return res.data;
    } catch (e) {
        console.error("Extrusion Gen Error:", e.message);
        return null;
    }
}

module.exports = { getSegmentation, getDepthHologram, getExtrudedGLB };
