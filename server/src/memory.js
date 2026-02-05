const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { cosineSimilarity } = require('./utils/vector_math');

// Configuration
const MEMORY_FILE = path.join(__dirname, '../data/memory_store.json');
const OLLAMA_URL = "http://localhost:11434";
const EMBEDDING_MODEL = "nomic-embed-text";

// In-memory store
let memoryStore = [];

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}

// Initialize Memory (Load from JSON)
async function initMemory() {
    try {
        if (fs.existsSync(MEMORY_FILE)) {
            const data = fs.readFileSync(MEMORY_FILE, 'utf8');
            memoryStore = JSON.parse(data);
            console.log(`[Memory] Loaded ${memoryStore.length} memories from local store.`);
        } else {
            memoryStore = [];
            fs.writeFileSync(MEMORY_FILE, JSON.stringify([]));
            console.log("[Memory] Created new local memory store.");
        }
    } catch (e) {
        console.error("[Memory] Init Error:", e.message);
        memoryStore = [];
    }
}

// Helper: Get Embedding from Ollama
async function getEmbedding(text) {
    try {
        const res = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
            model: EMBEDDING_MODEL,
            prompt: text
        });
        return res.data.embedding;
    } catch (e) {
        // If 404, model might be missing. Try to pull?
        // For now, just warn.
        if (e.response && e.response.status === 404) {
             console.warn(`[Memory] Model '${EMBEDDING_MODEL}' not found. Please run 'ollama pull ${EMBEDDING_MODEL}'`);
        } else {
             console.warn(`[Memory] Embedding Error (Ollama offline?):`, e.message);
        }
        return null;
    }
}

// Search Memory (Vector Similarity)
async function searchMemory(queryText, nResults = 3) {
    if (memoryStore.length === 0) return [];

    const queryEmbedding = await getEmbedding(queryText);
    if (!queryEmbedding) {
        // Fallback: Simple Keyword Matching if embeddings fail
        console.log("[Memory] Vector search unavailable. Using keyword match.");
        const keywords = queryText.toLowerCase().split(' ').filter(w => w.length > 3);
        return memoryStore
            .filter(m => keywords.some(k => m.text.toLowerCase().includes(k)))
            .slice(0, nResults)
            .map(m => m.text);
    }

    // Compute similarities
    const scored = memoryStore.map(mem => ({
        text: mem.text,
        score: cosineSimilarity(queryEmbedding, mem.embedding)
    }));

    // Sort descending
    scored.sort((a, b) => b.score - a.score);

    // Return top N
    return scored.slice(0, nResults).map(m => m.text);
}

// Add Memory
async function addMemory(text) {
    const embedding = await getEmbedding(text);
    // Even if embedding fails, we can store text for keyword search
    
    const newMemory = {
        id: Date.now().toString(),
        text: text,
        embedding: embedding || [], // Empty array if failed
        timestamp: Date.now()
    };

    memoryStore.push(newMemory);

    // Persist to disk
    try {
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memoryStore, null, 2));
        console.log(`[Memory] Saved: "${text.substring(0, 30)}..."`);
    } catch (e) {
        console.error("[Memory] Disk Save Error:", e.message);
    }
}

module.exports = {
    initMemory,
    searchMemory,
    addMemory
};