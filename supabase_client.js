// IMPORTANT: Paste your Supabase URL and Anon Key here!
const SUPABASE_URL = 'https://iepalvgkgylkjdlkaxnc.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcGFsdmdrZ3lsa2pkbGtheG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NDY4NTEsImV4cCI6MjEwNjAyMjg1MX0.ZLffHLs5kWsKniiP_d1j3v1APiBZESHgr-kp-nUx4oA';

class SupabaseService {
  constructor() {
    this.url = SUPABASE_URL.replace('/rest/v1/', '').replace(/\/$/, '');
    this.key = SUPABASE_ANON_KEY;
    this.session = null;
    
    // Automatically restore session from storage on boot
    chrome.storage.local.get(['supabaseSession'], (res) => {
      if (res.supabaseSession) {
        this.session = res.supabaseSession;
      }
    });
  }

  // Helper to make authenticated REST calls to Supabase
  async fetchApi(endpoint, options = {}) {
    const headers = {
      'apikey': this.key,
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.session && this.session.access_token) {
      headers['Authorization'] = `Bearer ${this.session.access_token}`;
    } else {
      headers['Authorization'] = `Bearer ${this.key}`;
    }

    const response = await fetch(`${this.url}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase API Error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Some endpoints (like upsert) might return empty 204 No Content
    if (response.status === 204) return null;
    return response.json();
  }

  // 1. Sign In via Google OAuth (Using Chrome's native WebAuthFlow)
  async signInWithGoogle() {
    return new Promise((resolve, reject) => {
      const redirectUri = chrome.identity.getRedirectURL();
      const authUrl = `${this.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUri)}`;

      chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      }, (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          return reject(chrome.runtime.lastError?.message || 'Login cancelled');
        }

        // Supabase returns the tokens in the URL hash like: #access_token=...&refresh_token=...
        const hash = new URL(responseUrl).hash;
        const params = new URLSearchParams(hash.substring(1));

        if (params.has('access_token')) {
          this.session = {
            access_token: params.get('access_token'),
            refresh_token: params.get('refresh_token'),
            provider_token: params.get('provider_token') // Google's token for Docs API if needed
          };
          chrome.storage.local.set({ supabaseSession: this.session }, () => {
            resolve(this.session);
          });
        } else {
          reject('No access token found in response');
        }
      });
    });
  }

  // 2. Load User Profile from the database
  async getProfile(userId) {
    // We use the REST API: GET /rest/v1/profiles?id=eq.{userId}
    const data = await this.fetchApi(`/rest/v1/profiles?id=eq.${userId}&select=*`);
    return data && data.length > 0 ? data[0] : null;
  }

  // 3. Save User Profile to the database
  async upsertProfile(userId, profileData) {
    // We use the REST API: POST /rest/v1/profiles with UPSERT headers
    const payload = {
      id: userId,
      ...profileData
    };

    return this.fetchApi('/rest/v1/profiles?on_conflict=id', {
      method: 'POST',
      headers: {
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });
  }

  // Get current user ID by decoding the JWT
  getUserId() {
    if (!this.session || !this.session.access_token) return null;
    try {
      const base64Url = this.session.access_token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload).sub;
    } catch (e) {
      return null;
    }
  }
}

// Export a singleton instance globally for the extension to use
window.supabase = new SupabaseService();
