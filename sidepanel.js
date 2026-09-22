document.addEventListener('DOMContentLoaded', async () => {
  console.log("%cThanks for running a killer game, Augie!", "color: #007acc; font-weight: bold; font-size: 16px; font-family: sans-serif;");
  
  const settingsView = document.getElementById('settings-view');
  const chatView = document.getElementById('chat-view');
  
  const closeSettingsBtn = document.getElementById('close-settings');
  const themeToggle = document.getElementById('theme-toggle');

  const apiProviderSelect = document.getElementById('api-provider');
  const openaiSettings = document.getElementById('openai-settings');
  const baseUrlInput = document.getElementById('base-url');
  const modelIdInput = document.getElementById('model-id');
  const fallbackApiKeyInput = document.getElementById('fallback-api-key');
  const tokenMeterContainer = document.getElementById('token-meter-container');

  if (apiProviderSelect) {
    apiProviderSelect.addEventListener('change', () => {
      openaiSettings.style.display = apiProviderSelect.value === 'openai' ? 'block' : 'none';
    });
  }


  const apiKeyInput = document.getElementById('api-key');
  const toggleApiKeyBtn = document.getElementById('toggle-api-key');
  const notesUrlInput = document.getElementById('notes-url');
  const pbUrlsInput = document.getElementById('pb-urls');
  const saveBtn = document.getElementById('save-settings');
  const connectGoogleBtn = document.getElementById('connect-google-btn');
  const disconnectGoogleBtn = document.getElementById('disconnect-google-btn');
  const googleAuthStatus = document.getElementById('google-auth-status');

  // --- Google OAuth (launchWebAuthFlow) ---
  const GOOGLE_CLIENT_ID = '515316118504-qv16sobfp87betbblf6pt3cq007g0ei2.apps.googleusercontent.com';
  const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/documents.readonly';

  function updateAuthUI(isConnected) {
    connectGoogleBtn.style.display = isConnected ? 'none' : 'inline-block';
    googleAuthStatus.style.display = isConnected ? 'inline' : 'none';
    disconnectGoogleBtn.style.display = isConnected ? 'inline-block' : 'none';
  }

  async function getStoredToken() {
    const s = await chrome.storage.local.get(['googleToken', 'googleTokenExpiry']);
    if (s.googleToken && s.googleTokenExpiry && Date.now() < s.googleTokenExpiry) {
      return s.googleToken;
    }
    return null;
  }

  async function connectGoogle() {
    const redirectUri = chrome.identity.getRedirectURL();
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(GOOGLE_SCOPES)}` +
      `&prompt=consent`;

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          reject(new Error(chrome.runtime.lastError?.message || 'Auth cancelled'));
          return;
        }
        const params = new URLSearchParams(new URL(redirectUrl).hash.substring(1));
        const token = params.get('access_token');
        const expiresIn = parseInt(params.get('expires_in') || '3600');
        if (!token) { reject(new Error('No access token received')); return; }
        // Cache token, expire 60s early to avoid edge cases
        chrome.storage.local.set({
          googleToken: token,
          googleTokenExpiry: Date.now() + (expiresIn - 60) * 1000
        });
        resolve(token);
      });
    });
  }

  connectGoogleBtn.addEventListener('click', async () => {
    connectGoogleBtn.textContent = 'Connecting...';
    connectGoogleBtn.disabled = true;
    try {
      await connectGoogle();
      updateAuthUI(true);
      lastSynced = 0; // force re-sync with new token
    } catch (e) {
      console.error('Google auth error:', e);
      alert('Google sign-in failed: ' + e.message);
    } finally {
      connectGoogleBtn.textContent = '🔗 Connect Google Account';
      connectGoogleBtn.disabled = false;
    }
  });

  disconnectGoogleBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['googleToken', 'googleTokenExpiry']);
    updateAuthUI(false);
    lastSynced = 0;
  });
  // --- End OAuth ---
  
  const openSettingsBtn = document.getElementById('open-settings');
  const syncBtn = document.getElementById('sync-btn');
  const closePanelBtn = document.getElementById('close-panel');
  
  if (closePanelBtn) {
    closePanelBtn.addEventListener('click', () => window.close());
  }
  
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  
  const tokenMeterBar = document.getElementById('token-meter-bar');
  const tokenMeterText = document.getElementById('token-meter-text');

  const CONTEXT_SOURCES = [
    { id: "core", label: "Core" },
    { id: "apg", label: "APG" },
    { id: "gm_core", label: "GM Core" },
    { id: "campaign", label: "Notes" }
  ];

  let rulebookText = "";
  let apgText = "";
  let gmCoreText = "";
  let conversationHistory = [];
  let cachedNotesText = "No campaign notes provided.";
  let cachedCharactersText = "No character sheets provided.";
  let lastSynced = 0;
  
  fetch(chrome.runtime.getURL('rulebook.txt'))
    .then(res => res.text())
    .then(text => { rulebookText = text; })
    .catch(err => console.error("Failed to load rulebook", err));

  fetch(chrome.runtime.getURL('advanced_players_guide.txt'))
    .then(res => res.text())
    .then(text => { apgText = text; })
    .catch(err => console.error("Failed to load apg", err));

  fetch(chrome.runtime.getURL('gm_core.txt'))
    .then(res => res.text())
    .then(text => { gmCoreText = text; })
    .catch(err => console.error("Failed to load gm core", err));

  const data = await chrome.storage.local.get(['apiKey', 'apiProvider', 'baseUrl', 'modelId', 'notesUrl', 'pbUrls', 'lightMode', 'routingMode']);
  const routingModeSelect = document.getElementById('routing-mode');
  const manualRoutingOptions = document.getElementById('manual-routing-options');
  
  // Build manual checkboxes
  CONTEXT_SOURCES.forEach(source => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '4px';
    label.style.cursor = 'pointer';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = source.id;
    checkbox.checked = true; // default all checked
    checkbox.className = 'manual-source-cb';
    
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(source.label));
    manualRoutingOptions.appendChild(label);
  });
  
  // Apply theme
  if (data.lightMode) {
    document.body.classList.add('light-mode');
    themeToggle.checked = true;
  }

  themeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    chrome.storage.local.set({ lightMode: e.target.checked });
  });

  if (data.routingMode) {
    routingModeSelect.value = data.routingMode;
  } else {
    routingModeSelect.value = "smart"; // default
  }

  function applyRoutingUI() {
    if (routingModeSelect.value === 'manual') {
      manualRoutingOptions.style.display = 'flex';
    } else {
      manualRoutingOptions.style.display = 'none';
    }
  }

  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
    notesUrlInput.value = data.notesUrl || '';

    if (apiProviderSelect) {
      apiProviderSelect.value = data.apiProvider || 'gemini';
      baseUrlInput.value = data.baseUrl || '';
      if (fallbackApiKeyInput) fallbackApiKeyInput.value = data.fallbackApiKey || '';
      modelIdInput.value = data.modelId || '';
      openaiSettings.style.display = apiProviderSelect.value === 'openai' ? 'block' : 'none';
    }

    pbUrlsInput.value = data.pbUrls || '';
    settingsView.classList.add('hidden');
    chatView.classList.remove('hidden');
    applyRoutingUI();
  }

  // Restore auth UI state
  const storedToken = await getStoredToken();
  updateAuthUI(!!storedToken);

  if (toggleApiKeyBtn) {
    toggleApiKeyBtn.addEventListener('click', () => {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleApiKeyBtn.textContent = 'Hide';
      } else {
        apiKeyInput.type = 'password';
        toggleApiKeyBtn.textContent = 'Show';
      }
    });
  }

  saveBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      apiKey: apiKeyInput.value.trim(),
      notesUrl: notesUrlInput.value.trim(),
      pbUrls: pbUrlsInput.value.trim(),
      routingMode: routingModeSelect.value
    }, () => {
      lastSynced = 0;
      settingsView.classList.add('hidden');
      chatView.classList.remove('hidden');
      applyRoutingUI();
    });
  });

  openSettingsBtn.addEventListener('click', () => {
    chatView.classList.add('hidden');
    settingsView.classList.remove('hidden');
  });

  closeSettingsBtn.addEventListener('click', () => {
    chrome.storage.local.get(['apiKey', 'apiProvider', 'baseUrl', 'modelId', 'fallbackApiKey'], (res) => {
      if (res.apiKey) {
        settingsView.classList.add('hidden');
        chatView.classList.remove('hidden');
      } else {
        alert("Please enter a Gemini API Key to continue.");
      }
    });
  });
  
  syncBtn.addEventListener('click', async () => {
    lastSynced = 0;
    const origText = syncBtn.textContent;
    syncBtn.textContent = '...';
    await fetchContexts();
    syncBtn.textContent = origText;
  });

  // Recursively extracts plain text from a Google Docs body content array.
  function extractTextFromContent(content) {
    if (!content) return '';
    let text = '';
    for (const el of content) {
      if (el.paragraph) {
        for (const item of el.paragraph.elements || []) {
          if (item.textRun?.content) text += item.textRun.content;
        }
      } else if (el.table) {
        for (const row of el.table.tableRows || []) {
          for (const cell of row.tableCells || []) {
            text += extractTextFromContent(cell.content);
          }
        }
      } else if (el.tableOfContents) {
        text += extractTextFromContent(el.tableOfContents.content);
      }
    }
    return text;
  }

  // Recursively walks all tabs (including nested child tabs) and extracts text.
  function extractTextFromTabs(tabs) {
    if (!tabs) return '';
    let text = '';
    for (const tab of tabs) {
      const title = tab.tabProperties?.title || 'Untitled Tab';
      const body = tab.documentTab?.body?.content;
      const tabText = extractTextFromContent(body);
      if (tabText.trim()) text += `\n\n=== ${title} ===\n\n${tabText}`;
      if (tab.childTabs?.length) text += extractTextFromTabs(tab.childTabs);
    }
    return text;
  }

  async function fetchContexts() {
    const now = Date.now();
    if (now - lastSynced < 600000) {
      return { notesText: cachedNotesText, charactersText: cachedCharactersText };
    }

    const data = await chrome.storage.local.get(['notesUrl', 'pbUrls']);
    let tempNotes = "No campaign notes provided.";
    let tempChars = "No character sheets provided.";

    if (data.notesUrl) {
      try {
        const docIdMatch = data.notesUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        if (docIdMatch?.[1]) {
          const docId = docIdMatch[1];
          const token = await getStoredToken();

          if (token) {
            // --- Authenticated: use Google Docs API to fetch all tabs ---
            const res = await fetch(
              `https://docs.googleapis.com/v1/documents/${docId}?includeTabsContent=true`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.status === 401) {
              // Token expired — clear it and fall through to unauthenticated fetch
              chrome.storage.local.remove(['googleToken', 'googleTokenExpiry']);
              updateAuthUI(false);
              throw new Error('Google token expired. Please reconnect in settings.');
            }
            if (!res.ok) throw new Error(`Docs API error ${res.status}`);
            const doc = await res.json();
            // DEBUG: log response shape
            console.log('[Stark debug] doc keys:', Object.keys(doc));
            console.log('[Stark debug] tabs count:', doc.tabs?.length);
            if (doc.tabs?.[0]) {
              const t0 = doc.tabs[0];
              console.log('[Stark debug] tab[0] title:', t0.tabProperties?.title);
              console.log('[Stark debug] tab[0] has documentTab:', !!t0.documentTab);
              console.log('[Stark debug] tab[0] body content length:', t0.documentTab?.body?.content?.length);
            }
            const extracted = extractTextFromTabs(doc.tabs);
            console.log('[Stark debug] extracted text length:', extracted.length);
            tempNotes = extracted.trim() || 'No content found.';
          } else {
            // --- Unauthenticated fallback: single-tab export ---
            const res = await fetch(
              `https://docs.google.com/document/d/${docId}/export?format=txt`
            );
            const text = await res.text();
            tempNotes = text.trim().startsWith('<!DOCTYPE') ? 'Could not read doc. Connect your Google Account for full access.' : text;
          }
        }
      } catch(e) {
        console.error('Error fetching notes:', e);
        tempNotes = 'Failed to load campaign notes: ' + e.message;
      }
    }

    if (data.pbUrls) {
      const urls = data.pbUrls.split('\n').map(u => u.trim()).filter(u => u);
      let chars = [];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          const json = await res.json();
          chars.push(JSON.stringify(json, null, 2));
        } catch(e) {
          console.error('Error fetching pathbuilder json for ' + url, e);
        }
      }
      if (chars.length > 0) tempChars = chars.join('\n\n---\n\n');
    }

    cachedNotesText = tempNotes;
    cachedCharactersText = tempChars;
    lastSynced = Date.now();

    return { notesText: cachedNotesText, charactersText: cachedCharactersText };
  }

  function getRelevantChunks(text, query, maxChars = 20000) {
    const stopWords = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","is","are","was","were","it","this","that","what","how","why","who","when","where","do","does","did","can","could","would","should","my","your","his","her","our","their"]);
    const words = query.toLowerCase().match(/\b\w+\b/g) || [];
    const keywords = words.filter(w => !stopWords.has(w) && w.length > 2);
    if (keywords.length === 0) return text.substring(0, maxChars);
    const chunks = text.split(/\n\s*\n/);
    const scoredChunks = chunks.map(chunk => {
      const lower = chunk.toLowerCase();
      let score = 0;
      keywords.forEach(kw => {
        const matches = lower.match(new RegExp('\\b' + kw + '\\b', 'g'));
        if (matches) score += matches.length;
      });
      return { chunk, score };
    });
    scoredChunks.sort((a, b) => b.score - a.score);
    let result = "";
    for (const sc of scoredChunks) {
      if (sc.score === 0 && result.length > 0) continue; 
      if (result.length + sc.chunk.length > maxChars) break;
      result += sc.chunk + "\n\n";
    }
    if (!result.trim()) return text.substring(0, maxChars);
    return result;
  }

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  function updateTokenMeter(tokensUsed) {
    const maxTokens = 250000;
    const percentage = Math.min(100, (tokensUsed / maxTokens) * 100);
    tokenMeterBar.style.width = percentage + '%';
    tokenMeterText.textContent = `Tokens: ${tokensUsed.toLocaleString()} / 250,000`;
    
    if (percentage > 90) {
      tokenMeterBar.style.backgroundColor = 'var(--meter-danger)';
    } else if (percentage > 70) {
      tokenMeterBar.style.backgroundColor = 'var(--meter-warn)';
    } else {
      tokenMeterBar.style.backgroundColor = 'var(--meter-safe)';
    }
  }

  async function routeQuestion(text, apiKey, provider, baseUrl, modelId) {
    const prompt = `You are a routing agent for a Pathfinder 2e assistant.
The user asked: "${text}"
Determine which data sources are needed. Select ALL that apply (it is very common to need multiple).
Output a JSON array of required sources from this list:
- "core": For basic mechanics, classes, spells, etc.
- "apg": For Advanced Player's Guide classes (Investigator, Oracle, Swashbuckler, Witch), feats, etc.
- "gm_core": For GM rules, encounter building, hazards, monsters, etc.
- "campaign": For campaign notes, character sheets, current story, etc.
Example: ["core", "campaign"]`;

    let model = 'gemini-3.6-flash';
    let res, json, content;
    if (provider === 'openai') {
      res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      json = await res.json();
      if (json.error) throw new Error("Router error: " + (json.error.message || json.error));
      content = json.choices[0].message.content;
    } else {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      json = await res.json();
      if (json.error) throw new Error("Router error: " + json.error.message);
      content = json.candidates[0].content.parts[0].text;
    }
    
    try {
      return JSON.parse(content);
    } catch(e) {
      return ["core", "apg", "gm_core", "campaign"]; // fallback to everything
    }
  }

  async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    chatInput.disabled = true;
    sendBtn.disabled = true;

    addMessage('user', text);
    chatInput.value = '';
    
    conversationHistory.push({ role: 'user', parts: [{ text }] });
    if (conversationHistory.length > 4) {
      conversationHistory.shift(); 
    }
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai';
    loadingDiv.textContent = 'Thinking... (gathering context)';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const data = await chrome.storage.local.get(['apiKey', 'apiProvider', 'baseUrl', 'modelId', 'fallbackApiKey']);
    if (!data.apiKey) {
      loadingDiv.textContent = "Error: API Key is missing. Please configure settings.";
      chatInput.disabled = false;
      sendBtn.disabled = false;
      return;
    }

    try {
      let route = ["core", "apg", "gm_core", "campaign"]; // default all
      const routingData = await chrome.storage.local.get(['routingMode']);
      const mode = routingData.routingMode || "smart";

      if (mode === "smart") {
        loadingDiv.textContent = 'Thinking... (analyzing question)';
        route = await routeQuestion(text, data.apiProvider === 'openai' ? data.fallbackApiKey : data.apiKey, data.apiProvider, data.baseUrl, data.modelId);
        console.log('[Stark router] Smart Decided to load:', route);
      } else if (mode === "manual") {
        route = [];
        document.querySelectorAll('.manual-source-cb').forEach(cb => {
          if (cb.checked) route.push(cb.value);
        });
        console.log('[Stark router] Manual Decided to load:', route);
      } else {
        console.log('[Stark router] Load All mode selected.');
      }

      loadingDiv.textContent = 'Thinking... (gathering context)';
      
      let notesText = "No campaign notes provided.";
      let charactersText = "No character sheets provided.";
      if (route.includes("campaign")) {
        const contexts = await fetchContexts();
        notesText = contexts.notesText;
        charactersText = contexts.charactersText;
      }
      
      loadingDiv.textContent = 'Thinking... (running local search over rulebooks)';
      let combinedRules = "";
      if (route.includes("core")) combinedRules += rulebookText + "\n";
      if (route.includes("apg")) combinedRules += apgText + "\n";
      if (route.includes("gm_core")) combinedRules += gmCoreText + "\n";
      
      let relevantRules = "";
      if (combinedRules.trim().length > 0) {
        relevantRules = getRelevantChunks(combinedRules, text, 15000);
      }

      const systemInstruction = `You are Stark, an AI Game Master assistant for a Pathfinder 2e campaign. 
Use the provided context to ground your mechanics, but you are highly encouraged to synthesize this information, make logical inferences, and offer strategic advice/recommendations to the player based on Pathfinder 2e rules.
The context below contains extracted relevant paragraphs from Pathfinder 2e rulebooks, the campaign notes, and the players' character sheets.

--- CAMPAIGN NOTES ---
${notesText}

--- CHARACTER SHEETS ---
${charactersText}

--- RELEVANT RULEBOOK EXCERPTS ---
${relevantRules}
`;

      let answer = "";
      
      if (data.apiProvider === 'openai') {
        loadingDiv.textContent = 'Thinking... (calling Fallback Provider)';
        tokenMeterContainer.style.display = 'none'; // Hide meter for fallback
        
        // Convert history to OpenAI format
        const openaiMessages = [ { role: 'system', content: systemInstruction } ];
        for (const msg of conversationHistory) {
           openaiMessages.push({
             role: msg.role === 'model' ? 'assistant' : 'user',
             content: msg.parts[0].text
           });
        }

        const res = await fetch(data.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.fallbackApiKey}` },
          body: JSON.stringify({
            model: data.modelId,
            messages: openaiMessages
          })
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
        answer = json.choices[0].message.content;
      } else {
        tokenMeterContainer.style.display = 'block';
        const reqBody = {
          system_instruction: { parts: { text: systemInstruction } },
          contents: conversationHistory
        };

        loadingDiv.textContent = 'Thinking... (calling Gemini)';

        let json;
        let delay = 2000;
        let retries = 5;

        while (retries > 0) {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${data.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqBody)
          });

          json = await res.json();
          
          if (json.error && json.error.code === 503) {
            retries--;
            if (retries === 0) throw new Error("Google API is experiencing high demand and failed after 5 retries. Please try again later.");
            loadingDiv.textContent = `High demand on Google's servers. Retrying in ${delay / 1000}s...`;
            await new Promise(r => setTimeout(r, delay));
            delay *= 2; 
          } else if (json.error) {
            throw new Error(json.error.message);
          } else {
            break; 
          }
        }

        answer = json.candidates[0].content.parts[0].text;
        
        if (json.usageMetadata && json.usageMetadata.totalTokenCount) {
          updateTokenMeter(json.usageMetadata.totalTokenCount);
        }
      }
      
      loadingDiv.textContent = answer;
      
      conversationHistory.push({ role: 'model', parts: [{ text: answer }] });
      if (conversationHistory.length > 4) {
        conversationHistory.shift();
      }
      
    } catch (e) {
      console.error(e);
      loadingDiv.textContent = "Error: " + e.message;
      conversationHistory.pop();
    } finally {
      chatInput.disabled = false;
      sendBtn.disabled = false;
      chatInput.focus();
    }
  }

  sendBtn.addEventListener('click', handleSend);

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
});
