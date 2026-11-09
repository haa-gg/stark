// IMPORTANT: Paste your Supabase URL and Anon Key here!
const SUPABASE_URL = 'https://iepalvgkgylkjdlkaxnc.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcGFsdmdrZ3lsa2pkbGtheG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NDY4NTEsImV4cCI6MjEwNjAyMjg1MX0.ZLffHLs5kWsKniiP_d1j3v1APiBZESHgr-kp-nUx4oA';

class SupabaseService {
  constructor() {
    this.url = SUPABASE_URL.replace('/rest/v1/', '').replace(/\/$/, '');
    this.key = SUPABASE_ANON_KEY;
    this.session = null;
    
    // Automatically restore session from storage on boot
    this.sessionReady = new Promise((resolve) => {
      chrome.storage.local.get(['supabaseSession'], (res) => {
        if (res.supabaseSession) {
          this.session = res.supabaseSession;
        }
        resolve();
      });
    });
  }

  isTokenExpired(token) {
    if (!token) return true;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (!payload.exp) return false;
      return Date.now() >= (payload.exp - 60) * 1000;
    } catch (e) {
      return true;
    }
  }

  async refreshSession() {
    if (!this.session || !this.session.refresh_token) return false;
    try {
      const res = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'apikey': this.key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: this.session.refresh_token })
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.access_token) {
        this.session = {
          ...this.session,
          access_token: data.access_token,
          refresh_token: data.refresh_token || this.session.refresh_token
        };
        await new Promise((resolve) => chrome.storage.local.set({ supabaseSession: this.session }, resolve));
        return true;
      }
    } catch (e) {
      console.warn('Failed to refresh Supabase session:', e);
    }
    return false;
  }

  // Helper to make authenticated REST calls to Supabase
  async fetchApi(endpoint, options = {}) {
    await this.sessionReady;

    if (this.session && this.session.access_token && this.isTokenExpired(this.session.access_token)) {
      await this.refreshSession();
    }

    const buildHeaders = () => {
      const h = {
        'apikey': this.key,
        'Content-Type': 'application/json',
        ...options.headers
      };
      if (this.session && this.session.access_token) {
        h['Authorization'] = `Bearer ${this.session.access_token}`;
      } else {
        h['Authorization'] = `Bearer ${this.key}`;
      }
      return h;
    };

    let response = await fetch(`${this.url}${endpoint}`, {
      ...options,
      headers: buildHeaders()
    });

    if (response.status === 401 && this.session && this.session.refresh_token) {
      const refreshed = await this.refreshSession();
      if (refreshed) {
        response = await fetch(`${this.url}${endpoint}`, {
          ...options,
          headers: buildHeaders()
        });
      }
    }

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
