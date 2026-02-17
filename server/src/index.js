const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { generateFromImage, saveEquationsJSON } = require("./meg");
const { getSegmentation, getExtrudedGLB, getDepthHologram } = require("./sam_client");
const { createTexturedGLB, createPlaneGLB } = require("./process_image_to_glb");
const { compressGLB } = require("./compression");
const personaRoutes = require("./persona");
const { connectDB, ImageLog, User, Transaction, isConnected } = require("./db");
const { initMemory } = require("./memory");
const { spawn } = require("child_process");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use("/api", personaRoutes);

app.get("/", (req, res) => {
  res.send("Holopad backend API is running");
});

// Connect Database & Memory
connectDB();
initMemory();

// --- PAYMENTS & TOKENS ---
// Middleware to attach user
const attachUser = async (req, res, next) => {
    const deviceId = req.headers['x-device-id'] || 'unknown';
    // If developer mode requested
    const isDevMode = req.headers['x-role'] === 'developer';
    
    // OFFLINE MODE CHECK
    if (!isConnected()) {
        req.user = {
            _id: 'offline_mock_id',
            deviceId,
            role: isDevMode ? 'developer' : 'user',
            tokens: isDevMode ? 999999 : 10,
            walletBalance: 0,
            save: async () => {} // no-op
        };
        return next();
    }
    
    try {
        let user = await User.findOne({ deviceId });
        if (!user) {
            user = await User.create({ 
                deviceId, 
                role: isDevMode ? 'developer' : 'user',
                tokens: isDevMode ? 999999 : 10 
            });
        } else if (isDevMode && user.role !== 'developer') {
            user.role = 'developer';
            user.tokens = 999999;
            await user.save();
        }
        req.user = user;
        next();
    } catch (e) {
        console.error("DB Error in attachUser:", e.message);
        // Fallback to avoid crash
        req.user = { 
            role: 'user', tokens: 0, walletBalance: 0, save: async () => {} 
        };
        next();
    }
};

app.post("/api/user/init", attachUser, (req, res) => {
    res.json(req.user);
});

app.post("/api/tokens/buy", attachUser, async (req, res) => {
    // Simulate GPay success
    const { amount, tokens } = req.body;
    
    req.user.tokens += tokens;
    
    // Add Bonus Wallet Balance (10% of tokens as $)
    const bonusWallet = tokens / 10;
    req.user.walletBalance = (req.user.walletBalance || 0) + bonusWallet;
    
    await req.user.save();
    
    if (isConnected()) {
        await Transaction.create({
            userId: req.user._id,
            type: 'buy_token',
            amount: amount,
            details: `Bought ${tokens} tokens via GPay`
        });
    }
    
    res.json({ success: true, newBalance: req.user.tokens, newWallet: req.user.walletBalance });
});

app.post("/api/market/buy", attachUser, async (req, res) => {
    const { itemId, price } = req.body;
    
    // Parse price
    const numericPrice = parseFloat(price.replace('$', '')) || 0;
    
    if (req.user.role !== 'developer' && req.user.walletBalance < numericPrice) {
        return res.status(402).json({ error: "Insufficient Funds. Please Top-up." });
    }
    
    // Deduct if not free/dev
    if (req.user.role !== 'developer' && numericPrice > 0) {
        req.user.walletBalance -= numericPrice;
        await req.user.save();
    }
    
    if (isConnected()) {
        await Transaction.create({
            userId: req.user._id,
            type: 'buy_asset',
            amount: numericPrice,
            details: `Bought item ${itemId}`
        });
    }
    
    res.json({ success: true, message: "Purchase Successful" });
});

// Start Python SAM Service
const pythonProcess = spawn('python', ['-m', 'uvicorn', 'python.sam_service:app', '--port', '8001'], {
  cwd: path.join(__dirname, '..'),
  shell: true
});
pythonProcess.stdout.on('data', (d) => console.log(`[SAM]: ${d}`));
pythonProcess.stderr.on('data', (d) => console.error(`[SAM ERR]: ${d}`));

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Knowledge Base for RAG (Enhanced for Holopad Pro)
const KNOWLEDGE_BASE = [
  { keywords: ["help", "kaise", "how", "start"], answer: "I'm Meg. Say 'cube', 'sphere', or 'voxel' to build. Upgrade to Holopad Pro to export and sell your work!" },
  { keywords: ["meg", "who", "identity"], answer: "I am Meg, your advanced holographic assistant. I manage the Holostage environment to ensure your creations are pixel-perfect." },
  { keywords: ["stack", "uuper", "align", "smart"], answer: "I've enabled Smart Stacking. Just place objects near each other, and I'll align their normals and surfaces automatically." },
  { keywords: ["mirror", "symmetry", "same"], answer: "Activate Symmetry (X or Z) in the toolbar. It mirrors your actions in real-time—perfect for character design and architecture." },
  { keywords: ["save", "export", "download", "earning"], answer: "Exporting is a Pro feature. Upgrade to Holopad Pro to download high-fidelity OBJ files and list them on the marketplace." },
  { keywords: ["money", "earn", "sell", "pro"], answer: "To earn money, build high-quality assets and list them on the HoloMarket. Holopad Pro members earn 80% revenue share on all sales." },
  { keywords: ["voice", "speak", "talk"], answer: "I'm always listening. You can control tools, colors, and system functions just by speaking." }
];

// BERT-lite Intent Classifier (Keyword weighted)
function classifyIntent(text) {
  const t = text.toLowerCase();
  if (t.includes("create") || t.includes("banao") || t.includes("add")) return "create";
  if (t.includes("delete") || t.includes("hatao") || t.includes("remove") || t.includes("clear")) return "delete";
  if (t.includes("undo") || t.includes("wapas")) return "undo";
  if (t.includes("save") || t.includes("export")) return "export";
  return "chat";
}

app.post("/api/chat", attachUser, async (req, res) => {
  try {
    const { message, context } = req.body;
    
    // TOKEN CHECK
    if (req.user.role !== 'developer') {
        if (req.user.tokens <= 0) {
            return res.json({ 
                response: "You're out of tokens! Please top up in the Market to keep talking to me.", 
                intent: "error",
                tokens: 0
            });
        }
        req.user.tokens -= 1;
        await req.user.save();
        
          if (isConnected()) {
            try {
              await Transaction.create({
                userId: req.user._id,
                type: 'use_meg',
                amount: 1,
                details: 'Chat interaction'
              });
            } catch (e) { console.warn('Transaction log failed:', e.message); }
          }
    }

    const intent = classifyIntent(message);
    
    // RAG Retrieval
    let response = "I'm ready. Let's build something extraordinary.";
    const relevant = KNOWLEDGE_BASE.find(k => k.keywords.some(w => message.toLowerCase().includes(w)));
    if (relevant) {
      response = relevant.answer;
    } else if (intent === "chat") {
      // Fallback Persona Chat (Genius Assistant)
      const openers = [
        "Your creative space is online. What shall we build today?",
        "I've calibrated the voxel engine. Ready for your input.",
        "Symmetry systems are active. Try creating a complex structure.",
        "Remember, you can export your work to OBJ format anytime."
      ];
      response = openers[Math.floor(Math.random() * openers.length)];
    }

    return res.json({ response, intent, tokens: req.user.tokens });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});
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

// --- NEW ACTIONS ---
app.post("/api/actions/save", attachUser, async (req, res) => {
    // Fee: 50 tokens for "Save/Export"
    const COST = 50;
    if (req.user.role !== 'developer') {
      if (req.user.tokens < COST) return res.status(402).json({ error: `Need ${COST} tokens to Save/Export.` });
      req.user.tokens -= COST;
      await req.user.save();
        
      if (isConnected()) {
        try {
          await Transaction.create({
            userId: req.user._id,
            type: 'save_export',
            amount: COST,
            details: 'Exported 3D Model'
          });
        } catch (e) { console.warn('Transaction log failed:', e.message); }
      }
    }
    res.json({ success: true, tokens: req.user.tokens });
});

app.post("/api/market/list", attachUser, upload.single("model"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No model file" });
        
        // Listing Fee: 100 Tokens
        const COST = 100;
        if (req.user.role !== 'developer') {
            if (req.user.tokens < COST) return res.status(402).json({ error: `Listing requires ${COST} tokens.` });
            req.user.tokens -= COST;
            await req.user.save();
            
            if (isConnected()) {
                 await Transaction.create({
                    userId: req.user._id,
                    type: 'list_item',
                    amount: COST,
                    details: `Listed item ${req.body.name}`
                });
            }
        }
        
        const publicDir = path.join(__dirname, "public");
        const baseName = path.basename(req.file.filename, path.extname(req.file.filename)); // use timestamped name
        const finalName = `user_${baseName}`; // prefix
        
        // Move/Rename file to public (since upload goes to 'uploads' temp dir)
        const targetPath = path.join(publicDir, finalName + ".obj"); // Assuming OBJ export
        fs.renameSync(req.file.path, targetPath);
        
        // Create Metadata
        const meta = {
            name: req.body.name || "User Creation",
            price: req.body.price || "Free",
            author: "User", // In real app, store User ID
            description: "Created in Holopad Creative Space"
        };
        fs.writeFileSync(path.join(publicDir, finalName + ".market.json"), JSON.stringify(meta, null, 2));
        
        res.json({ success: true, url: `/public/${finalName}.obj` });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Marketplace Endpoint
app.get("/api/market", async (req, res) => {
  try {
    const publicDir = path.join(__dirname, "public");
    if (!fs.existsSync(publicDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(publicDir);
    const models = files
      .filter(f => f.endsWith(".glb") && !f.includes("_draco")) // Show originals or specific ones
      .map(f => {
        const baseName = f.replace(".glb", "");
        const overlay = `${baseName}_overlay.png`;
        const hasOverlay = files.includes(overlay);
        const metaPath = path.join(publicDir, `${baseName}.market.json`);
        
        let meta = {};
        if (fs.existsSync(metaPath)) {
           try { meta = JSON.parse(fs.readFileSync(metaPath)); } catch(e){}
        }
        
        // Mock Metadata
        const isMeg = f.includes("1767775805158"); // Meg's ID
        const isPremium = Math.random() > 0.7;
        
        return {
          id: baseName,
          name: meta.name || (isMeg ? "Meg (Assistant)" : `Hologram ${baseName.split('_')[1] || baseName}`),
          url: `/public/${f}`,
          thumbnail: hasOverlay ? `/public/${overlay}` : null,
          price: meta.price || (isMeg ? "Not for Sale" : (isPremium ? `$${(Math.random() * 20 + 5).toFixed(2)}` : "Free")),
          author: meta.author || (isMeg ? "System" : "User")
        };
      })
      .sort((a, b) => (b.name.includes("Meg") ? 1 : -1)); // Meg first

    res.json(models);
  } catch (e) {
    console.error("Market error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image file" });
    const imagePath = req.file.path;
    const ts = Date.now();
    const baseName = `holo_${ts}`;
    const publicDir = path.join(__dirname, "public");
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    // Save Market Metadata if provided
    if (req.body.name || req.body.price) {
        const meta = {
            name: req.body.name || "Untitled",
            price: req.body.price || "Free",
            author: req.body.author || "Anonymous",
            description: req.body.description || ""
        };
        fs.writeFileSync(path.join(publicDir, `${baseName}.market.json`), JSON.stringify(meta, null, 2));
    }

    let overlayInputPath = null;
    let overlayBufPath = null;
    let seg = null;
    try {
        seg = await getSegmentation(imagePath);
        if (seg && seg.maskUrl) {
            const url = new URL(seg.maskUrl);
            const filename = path.basename(url.pathname);
            overlayInputPath = path.join(publicDir, filename);
        }
    } catch (e) {
        console.warn("Segmentation failed, proceeding without mask");
    }

    // MONGO LOG: Start Tracking (guarded for offline mode)
    let logEntry = null;
    if (isConnected()) {
      try {
        logEntry = await ImageLog.create({
          originalName: req.file.originalname,
          path: imagePath,
          status: 'pending'
        });
      } catch (e) {
        console.warn('ImageLog create failed:', e.message);
        logEntry = { status: 'pending', save: async () => {} };
      }
    } else {
      logEntry = { status: 'pending', save: async () => {} };
    }

    try {
        const meg = await generateFromImage(overlayInputPath || imagePath, { size: 1024, harmonics: 12 });
        const eqPath = saveEquationsJSON(meg.equations, publicDir, baseName);

        overlayBufPath = path.join(publicDir, `${baseName}_overlay.png`);
        fs.writeFileSync(overlayBufPath, meg.overlayBuffer);
    } catch (err) {
        console.error("Meg Generation Failed:", err);
        logEntry.status = 'failed';
        logEntry.error = err.message;
        await logEntry.save();
    }

    const outGlb = path.join(publicDir, `${baseName}.glb`);
    
    let finalModelUrl = `/public/${baseName}.glb`;
    let useLocalGen = true;
    let generatedGlbPath = null;
    
    let depthSuccess = false;
    try {
      console.log("Attempting Depth Hologram Generation...");
      const depthGlb = await getDepthHologram(imagePath);
      
      if (depthGlb && depthGlb.hologram_type === 'extrusion') {
          console.log("[METRIC] Fallback Triggered: Depth -> Extrusion");
          throw new Error("Low Variance - Switch to Extrusion"); 
      }
      
      if (depthGlb && depthGlb.modelUrl) {
         console.log("Depth Hologram Success");
         const u = new URL(depthGlb.modelUrl);
         finalModelUrl = u.pathname;
         useLocalGen = false;
         depthSuccess = true;
         
         // Mark success in DB
         logEntry.status = 'success';
         await logEntry.save();

         generatedGlbPath = path.join(publicDir, path.basename(u.pathname));
      }
    } catch (err) {
      console.warn("Depth Hologram failed/skipped:", err.message);
      if (logEntry) {
          logEntry.status = 'fallback';
          logEntry.error = `Depth failed: ${err.message}`;
          await logEntry.save();
      }
    }

    if (!depthSuccess) {
        try {
          // Fallback to Extrusion
          console.log("Attempting Exact Extrusion...");
          const exactGlb = await getExtrudedGLB(imagePath);
          if (exactGlb && exactGlb.modelUrl) {
            console.log("Extrusion Success");
            const u = new URL(exactGlb.modelUrl);
            finalModelUrl = u.pathname; 
            useLocalGen = false;
            generatedGlbPath = path.join(publicDir, path.basename(u.pathname));
            
            // Mark as fallback success
            if (logEntry) {
                logEntry.status = 'fallback'; // Successful fallback
                await logEntry.save();
            }
          }
        } catch (err) {
          console.warn("[METRIC] Fallback Triggered: Extrusion -> Card (Reason: Service Failure)", err.message);
          if (logEntry) {
              logEntry.status = 'failed'; // Both failed
              logEntry.error = (logEntry.error || "") + ` | Extrusion failed: ${err.message}`;
              await logEntry.save();
          }
        }
    }

    if (useLocalGen) {
      console.log("Using local card generator");
      await createPlaneGLB(imagePath, outGlb, overlayBufPath, { fit: 'contain', applyEffects: true });
      generatedGlbPath = outGlb;
    }

    // COMPRESSION STEP
    if (generatedGlbPath && fs.existsSync(generatedGlbPath)) {
        const compressedPath = generatedGlbPath.replace(".glb", "_draco.glb");
        const success = await compressGLB(generatedGlbPath, compressedPath);
        if (success) {
            finalModelUrl = finalModelUrl.replace(".glb", "_draco.glb");
        }
    }

    return res.json({
      status: "ok",
      modelUrl: finalModelUrl,
      equationsUrl: `/public/${baseName}.meg.json`,
      overlayUrl: `/public/${baseName}_overlay.png`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Holopad server running on http://localhost:${PORT}`)
);
