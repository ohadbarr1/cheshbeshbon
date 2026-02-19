/**
 * premiumService.js — Mock async API service for premium validation
 * Simulates token-based premium validation with network-like delays
 */
const PremiumService = {
    STORAGE_KEY: 'cheshbeshbon_premium_token',

    _generateToken() {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: 'user_' + Math.random().toString(36).slice(2, 10),
            plan: 'premium',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
        }));
        const sig = btoa(Math.random().toString(36).slice(2));
        return header + '.' + payload + '.' + sig;
    },

    _parseToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
            return payload;
        } catch {
            return null;
        }
    },

    async validateToken() {
        await new Promise(resolve => setTimeout(resolve, 150));
        const token = localStorage.getItem(this.STORAGE_KEY);
        if (!token) return { valid: false };
        const payload = this._parseToken(token);
        if (!payload) {
            localStorage.removeItem(this.STORAGE_KEY);
            return { valid: false };
        }
        return { valid: true, plan: payload.plan, expiresAt: payload.exp };
    },

    async activateSubscription() {
        await new Promise(resolve => setTimeout(resolve, 300));
        const token = this._generateToken();
        localStorage.setItem(this.STORAGE_KEY, token);
        return { success: true, token };
    }
};
