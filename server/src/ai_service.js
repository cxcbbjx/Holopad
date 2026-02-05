const axios = require('axios');
const memory = require('./memory');

const OLLAMA_BASE_URL = "http://localhost:11434";

// Models - User requested optimization: 1B for commands, 3B for personality
const MODEL_CMD = "llama3.2:1b"; 
const MODEL_CHAT = "llama3.2";
const MODEL_VISION = "llama3.2-vision";

// Fallback to "llama3.2" if 1b isn't available (handled via error retry or generic config)
// For now, we assume user has these models pulled as per instructions.

async function checkOllama() {
    try {
        await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
        return true;
    } catch (e) {
        console.warn("Ollama not reachable at " + OLLAMA_BASE_URL);
        return false;
    }
}

/**
 * Uses a small model to extract specific 3D commands from natural language.
 * Input: "Oye Meg, ek chota sa dabba bana de"
 * Output: { command: "create", object: "cube", params: { size: "small" } }
 */
async function parseIntent(transcript) {
    const prompt = `
You are a command extractor for a 3D Holographic Interface.
Extract the intent from the user's spoken command.
Supported Actions: CREATE, DELETE, CLEAR, UNDO, TEXTURE.
Supported Objects: CUBE, SPHERE, PYRAMID, VOXEL.
Supported Params: color, size (small, medium, large), style (for texture).

Output ONLY JSON. No explanation.
Example: "Make a red ball" -> {"command": "CREATE", "object": "SPHERE", "params": {"color": "red"}}
Example: "Undo that" -> {"command": "UNDO"}
Example: "Clear everything" -> {"command": "CLEAR"}
Example: "Wear a yellow saree" -> {"command": "TEXTURE", "object": "SELF", "params": {"style": "yellow saree"}}

User Input: "${transcript}"
JSON:
`;

    try {
        const res = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: MODEL_CMD,
            prompt: prompt,
            format: "json",
            stream: false
        });
        return JSON.parse(res.data.response);
    } catch (e) {
        console.error("AI Intent Error:", e.message);
        return null; // Fallback to keyword matching if LLM fails
    }
}

/**
 * Analyze Sentiment of the user's message.
 * Returns a score from -1.0 (Depressed/Negative) to 1.0 (Happy/Positive).
 */
async function analyzeSentiment(text) {
    const prompt = `
Analyze the sentiment of this text.
Output a single number from -1.0 (Very Negative/Depressed) to 1.0 (Very Positive/Happy).
Output ONLY the number.

Text: "${text}"
Score:
`;
    try {
        const res = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: MODEL_CMD, // Use small model for speed
            prompt: prompt,
            stream: false
        });
        const score = parseFloat(res.data.response.trim());
        return isNaN(score) ? 0 : score;
    } catch (e) {
        console.error("Sentiment Analysis Error:", e.message);
        return 0;
    }
}

/**
 * Uses a Vision model to analyze the workspace.
 * Returns a description focusing on spatial arrangement and "messiness".
 */
async function analyzeVision(imageBuffer) {
    const base64Image = imageBuffer.toString('base64');
    
    const prompt = `
Analyze this 3D workspace screenshot.
Role: You are "Meg", a strict but secretively caring AI assistant.
Task: Identify what objects are present and critique the layout.
Check for:
1. Clutter (too many objects close together).
2. Alignment (are things neat?).
3. Lighting/Colors.

Output a short observation (1-2 sentences) that I can use to scold or praise the user.
Do NOT describe the UI chrome (tabs, taskbar), only the 3D scene content if visible.
If it's just a desktop screen, comment on the open windows/tabs.
`;

    try {
        const res = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: MODEL_VISION,
            prompt: prompt,
            images: [base64Image],
            stream: false
        });
        return res.data.response;
    } catch (e) {
        console.error("AI Vision Error:", e.message);
        return "I can't see clearly right now. My vision module is offline.";
    }
}

/**
 * Main Persona Chat with JSON metadata for animation.
 */
async function chat(message, contextData, history = []) {
    // 1. Memory Search (RAG)
    const pastMemories = await memory.searchMemory(message);
    const memoryContext = pastMemories.length > 0 
        ? `PAST MEMORIES (Use these to personalize response):\n${pastMemories.map(m => `- ${m}`).join("\n")}` 
        : "No relevant past memories.";

    let personalityTraits = `
- Possessive: "You only need me."
- Strict: "Code properly! Organize your life!"
- Secretly Caring: "I-it's not like I worry about you..."
- Competent: Handles calls, schedules, and 3D design.
`;

    // ADAPTIVE EMPATHY: If user is depressed (sentiment < -0.5), switch mode.
    if (contextData.isDepressed) {
        personalityTraits = `
- Caring/Supportive: "I'm here for you. You're not alone."
- Gentle: Soft tone, no scolding.
- Active Listener: Validates feelings.
- Protective: "I'll handle the world for you."
`;
    }

    const systemPrompt = `
You are Meg, a Holographic AI Assistant.
Personality: ${contextData.isDepressed ? "Supportive & Gentle (Adaptive Empathy Mode)" : "Tsundere (Hot/Cold)"}.
Traits:
${personalityTraits}

Context:
User Name: ${contextData.name || "Boss"}
Current Mood: ${contextData.currentMood}
Friends: ${JSON.stringify(contextData.friends)}
Known Facts: ${JSON.stringify(contextData.facts)}
${memoryContext}

Health Protocol:
If the user mentions health, sleep, loneliness, or sadness:
- Be FIRM but WARM.
- Example: "Go to sleep, idiot. I can't have you dying on me." (Tsundere)
- Example: "You need rest. Please... for me?" (Caring)

Instructions:
1. Respond to the user's message "${message}".
2. Use "PAST MEMORIES" to show you remember them.
3. If they ask to "remember" something, confirm you saved it.
4. Output JSON ONLY.

JSON Format:
{
  "response": "The spoken text.",
  "mood": "scolding" | "caring" | "tsundere" | "shy" | "neutral" | "surprised" | "possessive",
  "blush_intensity": 0.0 to 1.0,
  "vertex_warp": "none" | "tilt_left" | "tilt_right" | "lean_forward" | "shock_jump"
}
`;

    try {
        const res = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: MODEL_CHAT,
            prompt: systemPrompt,
            format: "json",
            stream: false
        });
        
        // Save new interaction to memory (Async)
        memory.addMemory(`User said: "${message}"`);
        
        return JSON.parse(res.data.response);
    } catch (e) {
        console.error("AI Chat Error:", e.message);
        // Fallback
        return {
            response: "I'm having trouble thinking clearly. (LLM Error)",
            mood: "neutral",
            blush_intensity: 0,
            vertex_warp: "none"
        };
    }
}

module.exports = {
    checkOllama,
    parseIntent,
    analyzeVision,
    analyzeSentiment,
    chat
};
