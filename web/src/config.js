// Global Configuration for Holopad

export const CONFIG = {
    // Payment Configuration
    // REPLACE WITH YOUR ACTUAL UPI ID (e.g., 'yourname@oksbi', 'yourbusiness@icici')
    UPI_ID: '9256507216@ptyes', 
    UPI_NAME: 'Holopad Developer',
    
    // Pricing (in Tokens)
    COST_SAVE_EXPORT: 50,
    COST_MARKET_LIST: 100,
    COST_MEG_CHAT: 1,
    
    // Token Packs (for Paywall)
    PACK_BASIC: { tokens: 50, price_inr: 100 },
    PACK_PRO: { tokens: 300, price_inr: 500 },
    
    // Developer Settings
    DEV_MODE_CLICKS: 5, // Number of clicks to toggle dev mode
    DEV_PASSWORD: 'admin'
};
