const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

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
app.use("/public", express.static(path.join(__dirname, "../public")));

app.post("/api/upload", upload.single("image"), (req, res) => {
  console.log("Image received");

  return res.json({
    status: "ok",
    modelUrl: "http://localhost:5000/public/holo-plane.glb",
  });
});

app.listen(5000, () =>
  console.log("🚀 Holopad server running on http://localhost:5000")
);
