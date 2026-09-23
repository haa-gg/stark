document.addEventListener('DOMContentLoaded', async () => {
  console.log("%cThanks for running a killer game, Augie!", "color: #007acc; font-weight: bold; font-size: 16px; font-family: sans-serif;");
  
  const settingsView = document.getElementById('settings-view');
  const chatView = document.getElementById('chat-view');
  
  const closeSettingsBtn = document.getElementById('close-settings');
  const themeToggle = document.getElementById('theme-toggle');

  const providerStack = document.getElementById('provider-stack');
  const tokenMeterContainer = document.getElementById('token-meter-container');
  const localWizardContainer = document.getElementById('local-wizard-container');
  const launchLocalWizardBtn = document.getElementById('launch-local-wizard-btn');
  const localWizardModal = document.getElementById('local-wizard-modal');
  const closeWizardBtn = document.getElementById('close-wizard-btn');
  const testLocalConnBtn = document.getElementById('test-local-conn-btn');
  const localConnStatus = document.getElementById('local-conn-status');

  // Drag and Drop & Accordion Logic
  if (providerStack) {
    let draggedBox = null;

    providerStack.addEventListener('dragstart', (e) => {
      const box = e.target.closest('.provider-box');
      if (box) {
        draggedBox = box;
        box.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    providerStack.addEventListener('dragend', (e) => {
      const box = e.target.closest('.provider-box');
      if (box) {
        box.style.opacity = '1';
        draggedBox = null;
      }
    });

    providerStack.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(providerStack, e.clientY);
      const currentBox = e.target.closest('.provider-box');
      
      // visual feedback
      document.querySelectorAll('.provider-box').forEach(b => b.classList.remove('drag-over'));
      if (currentBox && currentBox !== draggedBox) {
        currentBox.classList.add('drag-over');
      }

      if (draggedBox) {
        if (afterElement == null) {
          providerStack.appendChild(draggedBox);
        } else {
          providerStack.insertBefore(draggedBox, afterElement);
        }
      }
    });

    providerStack.addEventListener('drop', (e) => {
      document.querySelectorAll('.provider-box').forEach(b => b.classList.remove('drag-over'));
    });

    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.provider-box:not([style*="opacity: 0.5"])')];
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Clicks for arrows and edit buttons
    providerStack.addEventListener('click', (e) => {
      const box = e.target.closest('.provider-box');
      if (!box) return;

      if (e.target.classList.contains('up')) {
        if (box.previousElementSibling) {
          providerStack.insertBefore(box, box.previousElementSibling);
        }
      } else if (e.target.classList.contains('down')) {
        if (box.nextElementSibling) {
          providerStack.insertBefore(box.nextElementSibling, box);
        }
      } else if (e.target.closest('.provider-edit-btn')) {
        const body = box.querySelector('.provider-body');
        if (body) {
          body.classList.toggle('hidden');
        }
      }
    });
  }


  const apiKeyInput = document.getElementById('api-key');
  const toggleApiKeyBtn = document.getElementById('toggle-api-key');
  const toggleFallbackApiKeyBtn = document.getElementById('toggle-fallback-api-key');
  const notesUrlsContainer = document.getElementById('notes-urls-container');
  const addNotesUrlBtn = document.getElementById('add-notes-url-btn');
  const pbUrlsInput = document.getElementById('pb-urls');

  if (addNotesUrlBtn && notesUrlsContainer) {
    addNotesUrlBtn.addEventListener('click', () => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.gap = '5px';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'notes-url-input';
      input.placeholder = 'https://docs.google.com/document/d/...';
      input.style.flexGrow = '1';
      
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✖';
      removeBtn.style.padding = '5px 10px';
      removeBtn.style.fontSize = '12px';
      removeBtn.title = 'Remove Google Doc';
      removeBtn.addEventListener('click', () => wrapper.remove());
      
      wrapper.appendChild(input);
      wrapper.appendChild(removeBtn);
      notesUrlsContainer.appendChild(wrapper);
    });
  }
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
    { id: "campaign", label: "Notes" },
    { id: "chars", label: "Characters" }
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

  const data = await chrome.storage.local.get(['apiKey', 'notesUrl', 'pbUrls', 'lightMode', 'routingMode', 'providerOrder', 'providerConfigs', 'apiProvider', 'fallbackApiKey', 'baseUrl', 'modelId']);
  
  // Migrate legacy single-provider settings to providerStack config if it doesn't exist
  if (!data.providerOrder) {
    data.providerOrder = ['gemini', 'openrouter', 'groq', 'local'];
    // Try to slot the old active provider first
    if (data.apiProvider && data.apiProvider !== 'gemini' && data.apiProvider !== 'custom') {
      const fam = data.apiProvider.startsWith('groq') ? 'groq' : data.apiProvider;
      data.providerOrder = data.providerOrder.filter(p => p !== fam);
      data.providerOrder.unshift(fam);
    }
  }
  if (!data.providerConfigs) {
    data.providerConfigs = {
      openrouter: { key: '', model: 'nvidia/nemotron-3.5-lightning:free' },
      groq: { key: '', model: 'llama-3.3-70b-versatile' },
      local: { url: 'http://localhost:1234/v1/chat/completions', model: 'local-model' }
    };
    
    // Attempt legacy migration
    const legacyKey = typeof data.fallbackApiKey === 'object' ? data.fallbackApiKey : { groq: data.fallbackApiKey, openrouter: data.fallbackApiKey };
    if (legacyKey && legacyKey.groq) data.providerConfigs.groq.key = legacyKey.groq;
    if (legacyKey && legacyKey.openrouter) data.providerConfigs.openrouter.key = legacyKey.openrouter;
    
    if (data.apiProvider === 'local') {
      if (data.baseUrl) data.providerConfigs.local.url = data.baseUrl;
      if (data.modelId) data.providerConfigs.local.model = data.modelId;
    } else if (data.apiProvider && data.apiProvider.startsWith('groq') && data.modelId) {
      data.providerConfigs.groq.model = data.modelId;
    }
  }
  
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
  }

  if (data.notesUrl) {
    const urls = data.notesUrl.split('\n').filter(u => u.trim().length > 0);
    const inputs = document.querySelectorAll('.notes-url-input');
    if (urls.length > 0 && inputs.length > 0) {
      inputs[0].value = urls[0];
      for (let i = 1; i < urls.length; i++) {
        addNotesUrlBtn.click();
        const newInputs = document.querySelectorAll('.notes-url-input');
        newInputs[newInputs.length - 1].value = urls[i];
      }
    }
  }

  if (providerStack && data.providerOrder) {
    // Reorder DOM to match providerOrder
    data.providerOrder.forEach(providerId => {
      const box = providerStack.querySelector(`.provider-box[data-provider="${providerId}"]`);
      if (box) providerStack.appendChild(box);
    });
    // Populate configs
    if (data.providerConfigs.openrouter) {
      const keyEl = document.getElementById('key-openrouter');
      const modEl = document.getElementById('model-openrouter');
      if(keyEl) keyEl.value = data.providerConfigs.openrouter.key || '';
      if(modEl) modEl.value = data.providerConfigs.openrouter.model || '';
    }
    if (data.providerConfigs.groq) {
      const keyEl = document.getElementById('key-groq');
      const modEl = document.getElementById('model-groq');
      if(keyEl) keyEl.value = data.providerConfigs.groq.key || '';
      if(modEl) modEl.value = data.providerConfigs.groq.model || '';
    }
    if (data.providerConfigs.local) {
      const urlEl = document.getElementById('url-local');
      const modEl = document.getElementById('model-local');
      if(urlEl) urlEl.value = data.providerConfigs.local.url || '';
      if(modEl) modEl.value = data.providerConfigs.local.model || '';
    }
  }

  pbUrlsInput.value = data.pbUrls || '';

  if (data.apiKey) {
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
    const currentOrder = Array.from(document.querySelectorAll('.provider-box')).map(box => box.dataset.provider);
    const newConfigs = {
      openrouter: {
        key: document.getElementById('key-openrouter') ? document.getElementById('key-openrouter').value.trim() : '',
        model: document.getElementById('model-openrouter') ? document.getElementById('model-openrouter').value.trim() : ''
      },
      groq: {
        key: document.getElementById('key-groq') ? document.getElementById('key-groq').value.trim() : '',
        model: document.getElementById('model-groq') ? document.getElementById('model-groq').value.trim() : ''
      },
      local: {
        url: document.getElementById('url-local') ? document.getElementById('url-local').value.trim() : '',
        model: document.getElementById('model-local') ? document.getElementById('model-local').value.trim() : ''
      }
    };

    chrome.storage.local.set({
      apiKey: apiKeyInput.value.trim(),
      providerOrder: currentOrder,
      providerConfigs: newConfigs,
      notesUrl: Array.from(document.querySelectorAll('.notes-url-input')).map(i => i.value.trim()).filter(v => v).join('\n'),
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
    settingsView.classList.add('hidden');
    chatView.classList.remove('hidden');
    applyRoutingUI();
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
      const urls = data.notesUrl.split('\n').map(u => u.trim()).filter(u => u);
      if (urls.length > 0) {
        try {
          const token = await getStoredToken();
          const docPromises = urls.map(async (url, index) => {
            const docIdMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
            if (!docIdMatch?.[1]) return '';
            const docId = docIdMatch[1];
            
            if (token) {
              const res = await fetch(
                `https://docs.googleapis.com/v1/documents/${docId}?includeTabsContent=true`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              );
              if (res.status === 401) {
                chrome.storage.local.remove(['googleToken', 'googleTokenExpiry']);
                updateAuthUI(false);
                throw new Error('Google token expired. Please reconnect in settings.');
              }
              if (!res.ok) throw new Error(`Docs API error ${res.status} for doc ${index + 1}`);
              const doc = await res.json();
              const extracted = extractTextFromTabs(doc.tabs);
              return `--- Document ${index + 1} ---\n` + (extracted.trim() || 'No content found.');
            } else {
              const res = await fetch(
                `https://docs.google.com/document/d/${docId}/export?format=txt`
              );
              const text = await res.text();
              const docText = text.trim().startsWith('<!DOCTYPE') ? 'Could not read doc. Connect your Google Account for full access.' : text;
              return `--- Document ${index + 1} ---\n` + docText;
            }
          });
          
          const results = await Promise.all(docPromises);
          tempNotes = results.filter(t => t).join('\n\n') || "No content found in any document.";
        } catch (e) {
          console.error('Error fetching notes:', e);
          tempNotes = 'Failed to load campaign notes: ' + e.message;
        }
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
    if (role === 'model' && typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
      div.innerHTML = DOMPurify.sanitize(marked.parse(text));
    } else {
      div.textContent = text;
    }
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

  async function routeQuestion(text, data) {
    const prompt = `You are a routing agent for a Pathfinder 2e assistant.
The user asked: "${text}"
Determine which data sources are needed. Select ALL that apply (it is very common to need multiple).
Output a JSON array of required sources from this list:
- "core": For basic mechanics, classes, spells, etc.
- "apg": For Advanced Player's Guide classes (Investigator, Oracle, Swashbuckler, Witch), feats, etc.
- "gm_core": For GM rules, encounter building, hazards, monsters, etc.
- "campaign": For campaign notes, current story, etc.
- "chars": For player character sheets and stats, etc.
Example: ["core", "campaign", "chars"]`;

    const order = data.providerOrder || ['gemini'];
    const configs = data.providerConfigs || {};
    let content = null;

    for (let i = 0; i < order.length; i++) {
      const provider = order[i];
      try {
        if (provider === 'gemini') {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${data.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            }),
            signal: AbortSignal.timeout(10000)
          });
          const json = await res.json();
          if (json.error) throw new Error(json.error.message);
          content = json.candidates[0].content.parts[0].text;
          break;
        } else {
          const config = configs[provider] || {};
          const baseUrl = provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' :
                          provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' :
                          config.url || 'http://localhost:1234/v1/chat/completions';
          
          const res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.key || ''}` },
            body: JSON.stringify({
              model: config.model || '',
              messages: [{ role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(10000)
          });
          const json = await res.json();
          if (json.error) throw new Error(json.error.message || json.error);
          content = json.choices[0].message.content;
          break;
        }
      } catch (e) {
        console.warn(`Router Provider ${provider} failed. Cascading...`);
      }
    }

    try {
      return JSON.parse(content);
    } catch(e) {
      return ["core", "apg", "gm_core", "campaign", "chars"]; // fallback to everything
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

    const data = await chrome.storage.local.get(['apiKey', 'providerOrder', 'providerConfigs', 'routingMode']);
    if (!data.apiKey && (!data.providerOrder || data.providerOrder[0] === 'gemini')) {
      loadingDiv.textContent = "Error: API Key is missing. Please configure settings.";
      chatInput.disabled = false;
      sendBtn.disabled = false;
      return;
    }

    try {
      let route = ["core", "apg", "gm_core", "campaign", "chars"]; // default all
      const mode = data.routingMode || "smart";

      if (mode === "smart") {
        loadingDiv.textContent = 'Thinking... (analyzing question)';
        route = await routeQuestion(text, data);
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
      if (route.includes("campaign") || route.includes("chars")) {
        const contexts = await fetchContexts();
        if (route.includes("campaign")) notesText = contexts.notesText;
        if (route.includes("chars")) charactersText = contexts.charactersText;
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
CRITICAL INSTRUCTION: Do NOT use any emojis in your responses. Keep the tone serious and professional.
The context below contains extracted relevant paragraphs from Pathfinder 2e rulebooks, the campaign notes, and the players' character sheets.

--- CAMPAIGN NOTES ---
${notesText}

--- CHARACTER SHEETS ---
${charactersText}

--- RELEVANT RULEBOOK EXCERPTS ---
${relevantRules}
`;

      let answer = "";
      
      const order = data.providerOrder || ['gemini'];
      const configs = data.providerConfigs || {};
      let lastError = null;

      for (let i = 0; i < order.length; i++) {
        const provider = order[i];
        let providerName = provider === 'gemini' ? 'Gemini' : 
                           provider === 'openrouter' ? 'OpenRouter' : 
                           provider === 'groq' ? 'Groq' : 
                           provider === 'local' ? 'Local LLM' : 'Unknown Provider';

        if (provider === 'gemini') {
          tokenMeterContainer.style.display = 'block';
        } else {
          tokenMeterContainer.style.display = 'none';
        }

        try {
          if (provider === 'gemini') {
            loadingDiv.textContent = 'Thinking... (calling Gemini)';
            const reqBody = {
              system_instruction: { parts: { text: systemInstruction } },
              contents: conversationHistory
            };
            
            let json;
            let delay = 2000;
            let retries = 3;

            while (retries > 0) {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000);

              let res;
              try {
                res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${data.apiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(reqBody),
                  signal: controller.signal
                });
              } finally {
                clearTimeout(timeoutId);
              }
              
              json = await res.json();
              
              if (json.error && json.error.code === 503) {
                retries--;
                if (retries === 0) throw new Error("Google API is experiencing high demand.");
                loadingDiv.textContent = `High demand on Google's servers. Retrying in ${delay / 1000}s...`;
                await new Promise(r => setTimeout(r, delay));
                delay *= 2; 
              } else if (json.error) {
                throw new Error(json.error.message || JSON.stringify(json.error));
              } else {
                answer = json.candidates[0].content.parts[0].text;
                if (json.usageMetadata && json.usageMetadata.totalTokenCount) {
                  updateTokenMeter(json.usageMetadata.totalTokenCount);
                }
                break; 
              }
            }
          } else {
            // OpenAI Format (Groq, OpenRouter, Local)
            const config = configs[provider] || {};
            const baseUrl = provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' :
                            provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' :
                            config.url || 'http://localhost:1234/v1/chat/completions';
            const apiKey = config.key || '';
            const modelId = config.model || '';

            if (provider === 'local' && baseUrl) {
              fetch(baseUrl.replace('/chat/completions', '/models'), { signal: AbortSignal.timeout(1500) })
                .then(r => r.json())
                .then(d => {
                  if (d && d.data && d.data[0] && loadingDiv.textContent.includes('Thinking')) {
                    loadingDiv.textContent = `Thinking... (calling Local LLM: ${d.data[0].id})`;
                  }
                }).catch(() => {});
            }

            loadingDiv.textContent = `Thinking... (calling ${providerName})`;
            
            const openaiMessages = [ { role: 'system', content: systemInstruction } ];
            for (const msg of conversationHistory) {
               openaiMessages.push({
                 role: msg.role === 'model' ? 'assistant' : 'user',
                 content: msg.parts[0].text
               });
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            let res;
            try {
              res = await fetch(baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                  model: modelId,
                  messages: openaiMessages
                }),
                signal: controller.signal
              });
            } finally {
              clearTimeout(timeoutId);
            }
            
            const json = await res.json();
            if (json.error) {
               let errMsg = json.error.message || JSON.stringify(json.error);
               if (json.error.metadata && json.error.metadata.raw) {
                  errMsg += ` (Upstream details: ${json.error.metadata.raw})`;
               }
               throw new Error(errMsg);
            }
            answer = json.choices[0].message.content;
          }

          // If we successfully got an answer, stop the cascade loop
          if (answer) {
             lastError = null;
             break;
          }
        } catch (e) {
          lastError = e;
          console.warn(`Provider ${provider} failed: ${e.message}. Cascading to next...`);
        }
      }

      if (lastError && !answer) {
        throw lastError;
      } // <-- Added missing closing brace
      // Trim excessive linebreaks to improve text flow
      answer = answer.replace(/\n{3,}/g, '\n\n').trim();
      
      if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        loadingDiv.innerHTML = DOMPurify.sanitize(marked.parse(answer));
      } else {
        loadingDiv.textContent = answer;
      }
      
      conversationHistory.push({ role: 'model', parts: [{ text: answer }] });
      if (conversationHistory.length > 4) {
        conversationHistory.shift();
      }
      
    } catch (e) {
      console.error(e);
      if (e.name === 'AbortError') {
        loadingDiv.textContent = "Error: The request timed out. The AI provider's servers are likely overloaded or down.";
      } else {
        loadingDiv.textContent = "Error: " + e.message;
      }
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

  // --- Local Wizard Logic ---
  if (launchLocalWizardBtn && localWizardModal && closeWizardBtn && testLocalConnBtn && localConnStatus) {
    launchLocalWizardBtn.addEventListener('click', () => {
      localWizardModal.classList.remove('hidden');
      localConnStatus.textContent = 'Waiting to test...';
      localConnStatus.style.color = '#aaa';
    });

    closeWizardBtn.addEventListener('click', () => {
      localWizardModal.classList.add('hidden');
    });

    testLocalConnBtn.addEventListener('click', async () => {
      testLocalConnBtn.disabled = true;
      localConnStatus.textContent = 'Pinging localhost servers...';
      localConnStatus.style.color = '#fff';

      try {
        let models = [];
        let connectedServer = '';
        
        // Try LM Studio first (default port 1234)
        try {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 2000);
          const lmRes = await fetch('http://localhost:1234/v1/models', { signal: controller.signal });
          clearTimeout(tid);
          const lmData = await lmRes.json();
          if (lmData && lmData.data && lmData.data.length > 0) {
            models = lmData.data.map(m => m.id);
            connectedServer = 'LM Studio';
          }
        } catch(e) {}

        // If LM Studio failed, try Ollama (default port 11434)
        if (models.length === 0) {
          try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 2000);
            const olRes = await fetch('http://localhost:11434/v1/models', { signal: controller.signal });
            clearTimeout(tid);
            const olData = await olRes.json();
            if (olData && olData.data && olData.data.length > 0) {
              models = olData.data.map(m => m.id);
              connectedServer = 'Ollama';
            }
          } catch(e) {}
        }

        if (models.length > 0) {
          localConnStatus.textContent = `✅ Connected to ${connectedServer}! Active model: ${models[0]}`;
          localConnStatus.style.color = 'var(--meter-safe)';
        } else {
          localConnStatus.textContent = `❌ Connection failed. Ensure the server is started and CORS is enabled in settings.`;
          localConnStatus.style.color = 'var(--meter-danger)';
        }
      } catch (err) {
        localConnStatus.textContent = `❌ Error: ${err.message}`;
        localConnStatus.style.color = 'var(--meter-danger)';
      } finally {
        testLocalConnBtn.disabled = false;
      }
    });
  }
});

