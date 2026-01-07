const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { generateFromImage, saveEquationsJSON } = require("./meg");
const { getSegmentation } = require("./sam_client");
const { createTexturedGLB } = require("./process_image_to_glb");

const app = express();
app.use(cors({ origin: true }));

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});

const upload = multer({ storage });

// serve public models
app.use("/public", express.static(path.join(__dirname, "public")));

app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image file" });
    const imagePath = req.file.path;
    const ts = Date.now();
    const baseName = `holo_${ts}`;
    const publicDir = path.join(__dirname, "public");
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    // optional SAM segmentation to improve overlay
    let overlayInputPath = null;
    const seg = await getSegmentation(imagePath);
    if (seg && seg.maskUrl) {
      overlayInputPath = seg.maskUrl;
    }

    const meg = await generateFromImage(overlayInputPath || imagePath, { size: 1024, harmonics: 12 });
    const eqPath = saveEquationsJSON(meg.equations, publicDir, baseName);

    const overlayBufPath = path.join(publicDir, `${baseName}_overlay.png`);
    fs.writeFileSync(overlayBufPath, meg.overlayBuffer);

    const outGlb = path.join(publicDir, `${baseName}.glb`);
    await createTexturedGLB(imagePath, outGlb, overlayBufPath, { fit: 'contain' });

    return res.json({
      status: "ok",
      modelUrl: `http://localhost:5000/public/${baseName}.glb`,
      equationsUrl: `http://localhost:5000/public/${baseName}.meg.json`,
      overlayUrl: `http://localhost:5000/public/${baseName}_overlay.png`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

app.listen(5000, () =>
  console.log("🚀 Holopad server running on http://localhost:5000")
);
