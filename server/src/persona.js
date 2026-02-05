const express = require('express');
const router = express.Router();
const multer = require('multer');
const ai = require('./ai_service');

// Meg's Memory (User Data Store)
const USER_DATA = {
  name: "Boss",
  friends: ["Rahul", "Priya", "Amit"],
  family: ["Mom", "Dad", "Sis"],
  facts: [
    "You like coding late at night.",
    "You often forget to drink water.",
    "You are building the Holopad prototype."
  ],
  sentimentHistory: [] // Rolling window of last 10 sentiments
};

// Simple in-memory context
let context = {
  mood: "neutral",
  last_interaction: Date.now()
};

// --- NEW: Semantic Intent Endpoint ---
router.post('/command', async (req, res) => {
    const { transcript } = req.body;
    console.log(`[Meg] Analyzing Intent: "${transcript}"`);
    
    // 1. Try AI Intent Parsing (Llama 1B)
    const intent = await ai.parseIntent(transcript);
    
    if (intent) {
        res.json(intent);
    } else {
        // Fallback: If AI fails, return null so frontend can try regex or chat
        res.json({ command: null });
    }
});

// --- UPDATED: Vision Endpoint (Real Llama Vision) ---
const upload = multer({ storage: multer.memoryStorage() });

router.post('/vision', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image" });

  console.log("[Meg] Vision Analysis Started...");
  
  // 1. Analyze with Llama Vision
  const observation = await ai.analyzeVision(req.file.buffer);
  
  // 2. Generate Personality Response based on observation
  const chatResponse = await ai.chat(
      `I just saw this on your screen: "${observation}". React to it.`, 
      { 
          name: USER_DATA.name, 
          currentMood: context.mood, 
          friends: USER_DATA.friends, 
          facts: USER_DATA.facts 
      }
  );

  // Update context
  context.mood = chatResponse.mood;
  context.last_interaction = Date.now();

  res.json({
      response: chatResponse.response,
      mood: chatResponse.mood,
      blush_intensity: chatResponse.blush_intensity || 0,
      vertex_warp: chatResponse.vertex_warp || "none"
  });
});

// --- UPDATED: Chat Endpoint (Dynamic Personality) ---
router.post('/chat', async (req, res) => {
  const { message } = req.body;
  
  // Special Init Case
  if (message === "MEET_MEG_INIT") {
      context.mood = "tsundere";
      return res.json({ 
          response: "Oh, so you finally decided to visit me? I was beginning to think you forgot I existed.", 
          mood: "tsundere",
          blush_intensity: 0.3,
          vertex_warp: "tilt_left"
      });
  }

  // Check for RAG updates (Training)
  if (message.toLowerCase().includes("remember that")) {
      USER_DATA.facts.push(message);
  }

  // 1. Adaptive Empathy: Analyze Sentiment
  const sentiment = await ai.analyzeSentiment(message);
  USER_DATA.sentimentHistory.push(sentiment);
  if (USER_DATA.sentimentHistory.length > 10) USER_DATA.sentimentHistory.shift();

  // Calculate Average Sentiment
  const avgSentiment = USER_DATA.sentimentHistory.reduce((a, b) => a + b, 0) / USER_DATA.sentimentHistory.length || 0;
  const isDepressed = avgSentiment < -0.5;

  if (isDepressed) {
      console.log(`[Meg] User seems depressed (Score: ${avgSentiment.toFixed(2)}). Switching to Supportive Mode.`);
  }

  // AI Generation
  const chatResponse = await ai.chat(message, {
      name: USER_DATA.name,
      currentMood: context.mood,
      friends: USER_DATA.friends,
      facts: USER_DATA.facts,
      isDepressed: isDepressed
  });

  // Update Context
  context.mood = chatResponse.mood;
  context.last_interaction = Date.now();

  res.json({
      response: chatResponse.response, // Text for TTS
      mood: chatResponse.mood,
      blush_intensity: chatResponse.blush_intensity,
      vertex_warp: chatResponse.vertex_warp,
      voice_style: chatResponse.mood // Hint for TTS pitch/rate
  });
});

// Legacy Action Endpoint (kept for compatibility or specific buttons)
router.post('/action', (req, res) => {
    const { type, action, data } = req.body;
    let message = "";
    
    if (type === 'call') {
        // RAG Logic for Calls
        if (action === 'attend_for_me') {
            const caller = data?.caller || "Unknown";
            const friend = USER_DATA.friends.find(f => caller.includes(f));
            
            if (friend) {
                message = `Meg: "Oh, it's ${friend}. I told him you're in 'The Zone'. He knows better than to disturb you."`;
            } else {
                message = `Meg: "Some random called '${caller}'. I blocked them. You don't need distractions."`;
            }
        }
    }
    res.json({ status: 'success', message, state: 'handled' });
});

// --- NEW: Proactive "Ghost" Interaction ---
router.get('/proactive', async (req, res) => {
    console.log("[Meg] Proactive Poke Triggered");
    
    // Check if user is depressed for tone
    const avgSentiment = USER_DATA.sentimentHistory.reduce((a, b) => a + b, 0) / USER_DATA.sentimentHistory.length || 0;
    const isDepressed = avgSentiment < -0.5;

    const chatResponse = await ai.chat("User has been silent for 4 hours. Initiate conversation.", {
         name: USER_DATA.name, 
         currentMood: context.mood, 
         friends: USER_DATA.friends, 
         facts: USER_DATA.facts,
         isDepressed: isDepressed
    });

    // Update context
    context.mood = chatResponse.mood;
    context.last_interaction = Date.now();

    res.json({
        response: chatResponse.response,
        mood: chatResponse.mood,
        blush_intensity: chatResponse.blush_intensity,
        vertex_warp: chatResponse.vertex_warp
    });
});

// --- NEW: Voice Cloning Endpoint (Architecture) ---
router.post('/speak', async (req, res) => {
    // Ideally: Connects to local XTTS v2 server (e.g., http://localhost:5002/api/tts)
    // For now: Returns 501 Not Implemented so frontend can fallback to WebSpeech
    res.status(501).json({ error: "Local TTS server not connected. Use WebSpeech fallback." });
});

// --- NEW: Texture Generation Endpoint (Stable Diffusion) ---
router.post('/texture', async (req, res) => {
    const { prompt } = req.body;
    console.log(`[Meg] Generating Texture: "${prompt}"`);

    // SD WebUI Default URL
    const SD_URL = "http://127.0.0.1:7860/sdapi/v1/txt2img";

    try {
        const axios = require('axios');
        const sdRes = await axios.post(SD_URL, {
            prompt: `(anime style), ${prompt}, texture map, seamless, flat, 2d, high quality`,
            negative_prompt: "photo, realistic, 3d, shading, shadows, blurry",
            steps: 20,
            width: 512,
            height: 512,
            cfg_scale: 7
        });

        if (sdRes.data && sdRes.data.images && sdRes.data.images[0]) {
            // SD returns base64
            res.json({ image: `data:image/png;base64,${sdRes.data.images[0]}` });
        } else {
            throw new Error("No image returned from SD");
        }
    } catch (e) {
        console.error("SD Generation Error:", e.message);
        // Fallback: Return a color based on prompt if possible, or error
        res.status(500).json({ error: "Stable Diffusion offline" });
    }
});

module.exports = router;
