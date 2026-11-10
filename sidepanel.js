document.addEventListener('DOMContentLoaded', async () => {
  console.log("%cThanks for running a killer game, Augie!", "color: #007acc; font-weight: bold; font-size: 16px; font-family: sans-serif;");
  
  const settingsView = document.getElementById('settings-view');
  const chatView = document.getElementById('chat-view');
  const loginView = document.getElementById('login-view');
  const getStartedBtn = document.getElementById('get-started-btn');
  const oauthLoginBtn = document.getElementById('oauth-login-btn');
  
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
  const pbUrlsInput = document.getElementById('pb-urls');
  const gameSystemSelect = document.getElementById('game-system');
  const characterUrlsLabel = document.getElementById('character-urls-label');

  // --- Campaign UI Elements ---
  const campaignSelect = document.getElementById('campaign-select');
  const addCampaignBtn = document.getElementById('add-campaign-btn');
  const deleteCampaignBtn = document.getElementById('delete-campaign-btn');
  const newCampaignContainer = document.getElementById('new-campaign-container');
  const newCampaignNameInput = document.getElementById('new-campaign-name');
  const saveNewCampaignBtn = document.getElementById('save-new-campaign-btn');
  const cancelNewCampaignBtn = document.getElementById('cancel-new-campaign-btn');
  const notesUrlsContainer = document.getElementById('notes-urls-container');
  const addNotesUrlBtn = document.getElementById('add-notes-url-btn');
  
  let campaigns = { "Default Campaign": { urls: [], gameSystem: "pf2e", pbUrls: "" } };
  let activeCampaign = "Default Campaign";

  function renderCampaignOptions() {
    campaignSelect.innerHTML = '';
    for (const cName in campaigns) {
      const opt = document.createElement('option');
      opt.value = cName;
      opt.textContent = cName;
      if (cName === activeCampaign) opt.selected = true;
      campaignSelect.appendChild(opt);
    }
    deleteCampaignBtn.style.display = Object.keys(campaigns).length > 1 ? 'inline-block' : 'none';
  }

  function renderUrls() {
    notesUrlsContainer.innerHTML = '';
    const urls = campaigns[activeCampaign]?.urls || [];
    urls.forEach(u => addUrlInput(u));
    // Only render saved URLs
  }

  function addUrlInput(val) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '5px';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'notes-url-input';
    input.placeholder = 'https://docs.google.com/document/d/...';
    input.style.flexGrow = '1';
    input.value = val;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✖';
    removeBtn.style.padding = '5px 10px';
    removeBtn.style.fontSize = '12px';
    removeBtn.title = 'Remove Google Doc';
    removeBtn.addEventListener('click', () => wrapper.remove());
    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);
    notesUrlsContainer.appendChild(wrapper);
  }

  function saveCurrentUrlsToActiveCampaign() {
    const inputs = document.querySelectorAll('.notes-url-input');
    const urls = Array.from(inputs).map(i => i.value.trim()).filter(v => v);
    if (!campaigns[activeCampaign]) campaigns[activeCampaign] = { urls: [], gameSystem: "pf2e", pbUrls: "" };
    campaigns[activeCampaign].urls = urls;
    campaigns[activeCampaign].gameSystem = gameSystemSelect.value;
    campaigns[activeCampaign].pbUrls = pbUrlsInput.value.trim();
  }

  if (campaignSelect) {
    if (addNotesUrlBtn) {
      addNotesUrlBtn.addEventListener('click', () => {
        addUrlInput('');
      });
    }
    campaignSelect.addEventListener('change', (e) => {
      saveCurrentUrlsToActiveCampaign();
      activeCampaign = e.target.value;
      
      const c = campaigns[activeCampaign];
      if (c) {
        gameSystemSelect.value = c.gameSystem || 'pf2e';
        pbUrlsInput.value = c.pbUrls || '';
        if (typeof updateCharacterUI === 'function') updateCharacterUI();
      }
      
      renderUrls();
    });

    addCampaignBtn.addEventListener('click', () => {
      newCampaignContainer.style.display = 'flex';
      newCampaignNameInput.focus();
    });

    cancelNewCampaignBtn.addEventListener('click', () => {
      newCampaignContainer.style.display = 'none';
      newCampaignNameInput.value = '';
    });

    saveNewCampaignBtn.addEventListener('click', () => {
      const name = newCampaignNameInput.value.trim();
      if (name && !campaigns[name]) {
        saveCurrentUrlsToActiveCampaign();
        campaigns[name] = { urls: [], gameSystem: gameSystemSelect.value, pbUrls: pbUrlsInput.value.trim() };
        activeCampaign = name;
        renderCampaignOptions();
        renderUrls();
        newCampaignContainer.style.display = 'none';
        newCampaignNameInput.value = '';
      }
    });

    deleteCampaignBtn.addEventListener('click', () => {
      if (Object.keys(campaigns).length > 1) {
        delete campaigns[activeCampaign];
        activeCampaign = Object.keys(campaigns)[0];
        renderCampaignOptions();
        renderUrls();
      }
    });
  }

  const saveBtn = document.getElementById('save-settings');
  const logoffBtn = document.getElementById('logoff-btn');
  const connectGoogleBtn = document.getElementById('connect-google-btn');
  const disconnectGoogleBtn = document.getElementById('disconnect-google-btn');
  const googleAuthStatus = document.getElementById('google-auth-status');

  // --- Login / Onboarding Logic ---
  if (getStartedBtn && oauthLoginBtn) {
    getStartedBtn.addEventListener('click', () => {
      chrome.storage.sync.set({ onboardingComplete: true });
      loginView.classList.add('hidden');
      settingsView.classList.remove('hidden');
    });

    oauthLoginBtn.addEventListener('click', async () => {
        oauthLoginBtn.textContent = 'Authenticating with Cloud...';
        try {
          await window.supabase.signInWithGoogle();
          const userId = window.supabase.getUserId();
          if (userId) {
            // Fetch their existing profile from Supabase
            const profile = await window.supabase.getProfile(userId);
            if (profile) {
              const existingLocal = await chrome.storage.sync.get(['apiKey', 'providerConfigs', 'routingMode']);
              const localConfigs = existingLocal.providerConfigs || {};
              const cloudConfigs = profile.provider_configs || {};
              const mergedConfigs = {
                openrouter: {
                  key: localConfigs.openrouter?.key || '',
                  model: cloudConfigs.openrouter?.model || localConfigs.openrouter?.model || 'nvidia/nemotron-3.5-lightning:free'
                },
                groq: {
                  key: localConfigs.groq?.key || '',
                  model: cloudConfigs.groq?.model || localConfigs.groq?.model || 'llama-3.3-70b-versatile'
                },
                local: {
                  url: cloudConfigs.local?.url || localConfigs.local?.url || 'http://localhost:1234/v1/chat/completions',
                  model: cloudConfigs.local?.model || localConfigs.local?.model || 'local-model'
                }
              };
              const toSave = {
                apiKey: existingLocal.apiKey || '',
                providerOrder: profile.provider_order || ['gemini', 'openrouter', 'groq', 'local'],
                providerConfigs: mergedConfigs,
                campaigns: profile.campaigns || {},
                activeCampaign: profile.active_campaign || 'Default Campaign',
                onboardingComplete: true
              };
              if (profile.routing_mode) toSave.routingMode = profile.routing_mode;
              // Populate local storage with cloud data (API keys stay strictly in chrome.storage.sync)
              await chrome.storage.sync.set(toSave);
            } else {
              chrome.storage.sync.set({ onboardingComplete: true });
            }
          }
          
          loginView.classList.add('hidden');
          settingsView.classList.remove('hidden');
          window.location.reload(); // Reload to populate UI with new cloud data
        } catch (e) {
          console.error(e);
          oauthLoginBtn.textContent = 'Sign in with Google';
          alert('Login failed: ' + (e.message || e));
        }
      });

  }

  // --- Google OAuth (launchWebAuthFlow) ---
  const GOOGLE_CLIENT_ID = '515316118504-qv16sobfp87betbblf6pt3cq007g0ei2.apps.googleusercontent.com';
  const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/documents.readonly';

  function updateAuthUI(isConnected) {
    connectGoogleBtn.style.display = isConnected ? 'none' : 'inline-block';
    googleAuthStatus.style.display = isConnected ? 'inline' : 'none';
    disconnectGoogleBtn.style.display = isConnected ? 'inline-block' : 'none';
  }

  async function getStoredToken() {
    const s = await chrome.storage.sync.get(['googleToken', 'googleTokenExpiry']);
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
        chrome.storage.sync.set({
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
    chrome.storage.sync.remove(['googleToken', 'googleTokenExpiry']);
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

  let rulebookText = "";
  let apgText = "";
  let gmCoreText = "";
  let conversationHistory = [];
  let cachedNotesText = "No campaign notes provided.";
  let cachedCharactersText = "No character sheets provided.";
  let lastSynced = 0;
  
  async function loadPf2eJson(paths) {
    let combinedText = "";
    for (const path of paths) {
      try {
        const res = await fetch(chrome.runtime.getURL(path));
        const json = await res.json();
        // Pf2eTools data is usually stored in arrays under top-level keys (like json.spell)
        for (const key in json) {
          if (Array.isArray(json[key])) {
            // Stringify each object individually, separated by double newlines so the existing getRelevantChunks logic can parse them cleanly!
            combinedText += json[key].map(item => JSON.stringify(item)).join('\n\n') + '\n\n';
          }
        }
      } catch (err) {
        console.error("Failed to load JSON path: " + path, err);
      }
    }
    return combinedText;
  }

  const data = await chrome.storage.sync.get(['onboardingComplete', 'apiKey', 'campaigns', 'activeCampaign', 'notesUrl', 'pbUrls', 'lightMode', 'fontScale', 'routingMode', 'gameSystem', 'providerOrder', 'providerConfigs', 'apiProvider', 'fallbackApiKey', 'baseUrl', 'modelId', 'googleToken', 'googleTokenExpiry']);

  let rulebooksPromise = null;
  function ensureRulebooksLoaded() {
    if (!rulebooksPromise) {
      rulebooksPromise = Promise.all([
        loadPf2eJson([
          'pf2etools_data/data/spells/spells-crb.json',
          'pf2etools_data/data/spells/spells-pc1.json',
          'pf2etools_data/data/actions.json',
          'pf2etools_data/data/conditions.json',
          'pf2etools_data/data/skills.json',
          'pf2etools_data/data/build_guides.json'
        ]).then(text => { rulebookText = text; }),
        loadPf2eJson([
          'pf2etools_data/data/spells/spells-apg.json',
          'pf2etools_data/data/spells/spells-pc2.json',
          'pf2etools_data/data/archetypes.json'
        ]).then(text => { apgText = text; }),
        loadPf2eJson([
          'pf2etools_data/data/hazards.json',
          'pf2etools_data/data/variantrules.json'
        ]).then(text => { gmCoreText = text; })
      ]);
    }
    return rulebooksPromise;
  }
  // Schedule background loading after the UI renders immediately
  setTimeout(ensureRulebooksLoaded, 100);
  
    if (data.onboardingComplete) {
    if (loginView) loginView.classList.add('hidden');
    if (!data.apiKey && !(data.providerOrder && data.providerOrder[0] === 'local')) {
      settingsView.classList.remove('hidden');
      chatView.classList.add('hidden');
    }
  }

  if (data.campaigns) {
    campaigns = data.campaigns;
    activeCampaign = data.activeCampaign || Object.keys(campaigns)[0];
    
    // Migrate old array campaigns to object campaigns
    for (const key in campaigns) {
      if (Array.isArray(campaigns[key])) {
        campaigns[key] = {
          urls: campaigns[key],
          gameSystem: data.gameSystem || 'pf2e',
          pbUrls: data.pbUrls || ''
        };
      }
    }
  } else {
    // Migration from old single-campaign setup
    const oldUrls = data.notesUrl ? data.notesUrl.split('\n').map(u => u.trim()).filter(u => u) : [];
    campaigns = { "Default Campaign": { urls: oldUrls, gameSystem: data.gameSystem || 'pf2e', pbUrls: data.pbUrls || '' } };
    activeCampaign = "Default Campaign";
  }
  if (campaignSelect) {
    renderCampaignOptions();
    renderUrls();
  }
  
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
  function renderManualSources() {
    manualRoutingOptions.innerHTML = '';
    let sources = [];
    if (gameSystemSelect.value === 'pf2e') {
      sources = [
        { id: "core", label: "Core Rulebook" },
        { id: "apg", label: "APG" },
        { id: "gm_core", label: "GM Core" },
        { id: "campaign", label: "Notes" },
        { id: "chars", label: "Characters" }
      ];
    } else {
      sources = [
        { id: "core", label: "5e SRD" },
        { id: "campaign", label: "Notes" },
        { id: "chars", label: "Characters" }
      ];
    }
    
    sources.forEach(source => {
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
  }
  
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
    chrome.storage.sync.set({ lightMode: e.target.checked });
  });

  // Apply font scale
  const fontScaleSlider = document.getElementById('font-scale-slider');
  const fontScaleVal = document.getElementById('font-scale-val');

  function setFontScale(scalePercent) {
    const pct = parseInt(scalePercent, 10) || 100;
    document.documentElement.style.setProperty('--font-scale', pct / 100);
    if (fontScaleSlider) fontScaleSlider.value = pct;
    if (fontScaleVal) fontScaleVal.textContent = pct + '%';
  }

  setFontScale(data.fontScale || 100);

  if (fontScaleSlider) {
    fontScaleSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      setFontScale(val);
      chrome.storage.sync.set({ fontScale: val });
    });
  }

  if (data.routingMode) {
    routingModeSelect.value = data.routingMode;
  } else {
    routingModeSelect.value = "all"; // default
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

  const activeCampData = campaigns[activeCampaign] || {};
  pbUrlsInput.value = activeCampData.pbUrls !== undefined ? activeCampData.pbUrls : (data.pbUrls || '');
  
  gameSystemSelect.value = activeCampData.gameSystem !== undefined ? activeCampData.gameSystem : (data.gameSystem || 'pf2e');
  function updateCharacterUI() {
    characterUrlsLabel.textContent = 'Pathbuilder JSON URLs';
    pbUrlsInput.placeholder = 'https://pathbuilder2e.com/json.php?id=123456 (one per line)';
    if (typeof renderManualSources === 'function') renderManualSources();
  }
  updateCharacterUI();
  if (gameSystemSelect) gameSystemSelect.addEventListener('change', updateCharacterUI);

  if (data.apiKey || (data.providerOrder && data.providerOrder[0] === 'local')) {
    if (loginView) loginView.classList.add('hidden');
    settingsView.classList.add('hidden');
    chatView.classList.remove('hidden');
    applyRoutingUI();
  }

  // Restore auth UI state
  const storedToken = (data.googleToken && data.googleTokenExpiry && Date.now() < data.googleTokenExpiry) ? data.googleToken : null;
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

  if (logoffBtn) {
    logoffBtn.addEventListener('click', () => {
      chrome.storage.sync.clear(() => {
        chrome.storage.local.clear(() => {
          window.location.reload();
        });
      });
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

    saveCurrentUrlsToActiveCampaign();
      
      const payloadToSave = {
        apiKey: apiKeyInput.value.trim(),
        providerOrder: currentOrder,
        providerConfigs: newConfigs,
        campaigns: campaigns,
        activeCampaign: activeCampaign,
        pbUrls: pbUrlsInput.value.trim(),
        routingMode: routingModeSelect.value,
        gameSystem: gameSystemSelect.value,
        fontScale: fontScaleSlider ? parseInt(fontScaleSlider.value, 10) : 100
      };

      // Push non-sensitive settings to Supabase if logged in (API keys stay strictly in chrome.storage.sync)
      const userId = window.supabase.getUserId();
      if (userId) {
        const sanitizedCloudConfigs = {
          openrouter: { model: newConfigs.openrouter.model },
          groq: { model: newConfigs.groq.model },
          local: { url: newConfigs.local.url, model: newConfigs.local.model }
        };
        window.supabase.upsertProfile(userId, {
          api_key: null,
          provider_order: payloadToSave.providerOrder,
          provider_configs: sanitizedCloudConfigs,
          routing_mode: payloadToSave.routingMode,
          campaigns: payloadToSave.campaigns,
          active_campaign: payloadToSave.activeCampaign
        }).catch(e => console.error("Failed to sync to Supabase:", e));
      }

      chrome.storage.sync.set(payloadToSave, () => {
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

  function getProfName(rank) {
    switch (rank) {
      case 2: return "Trained";
      case 4: return "Expert";
      case 6: return "Master";
      case 8: return "Legendary";
      default: return "Untrained";
    }
  }

  function getMod(score) {
    if (typeof score !== 'number') return 0;
    return Math.floor((score - 10) / 2);
  }

  function formatMod(val) {
    return val >= 0 ? `+${val}` : `${val}`;
  }

  function parsePathbuilderCharacter(data) {
    if (!data) return "No character data provided.";
    const build = data.build || (data.name ? data : null);
    if (!build) {
      return typeof data === 'string' ? data : JSON.stringify(data);
    }

    const lines = [];

    // Header & Core Identity
    const name = build.name || "Unnamed Character";
    const charClass = build.class || "Unknown Class";
    const level = build.level || 1;
    const dualClass = build.dualClass ? ` / ${build.dualClass}` : "";
    lines.push(`## CHARACTER SHEET: ${name}`);
    lines.push(`- **Class & Level:** ${charClass}${dualClass} (Level ${level})`);
    
    const ancestry = build.ancestry || "Unknown Ancestry";
    const heritage = build.heritage ? ` (${build.heritage})` : "";
    lines.push(`- **Ancestry & Heritage:** ${ancestry}${heritage}`);
    if (build.background) lines.push(`- **Background:** ${build.background}`);
    if (build.deity) lines.push(`- **Deity:** ${build.deity}`);
    if (build.alignment) lines.push(`- **Alignment:** ${build.alignment}`);

    // Abilities & Modifiers
    const a = build.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const strMod = getMod(a.str);
    const dexMod = getMod(a.dex);
    const conMod = getMod(a.con);
    const intMod = getMod(a.int);
    const wisMod = getMod(a.wis);
    const chaMod = getMod(a.cha);
    const mods = { str: strMod, dex: dexMod, con: conMod, int: intMod, wis: wisMod, cha: chaMod };

    lines.push(`- **Ability Scores:** STR ${a.str || 10} (${formatMod(strMod)}), DEX ${a.dex || 10} (${formatMod(dexMod)}), CON ${a.con || 10} (${formatMod(conMod)}), INT ${a.int || 10} (${formatMod(intMod)}), WIS ${a.wis || 10} (${formatMod(wisMod)}), CHA ${a.cha || 10} (${formatMod(chaMod)})`);

    // Defenses & HP
    const attrs = build.attributes || {};
    let totalHp = null;
    if (attrs.ancestryhp !== undefined && attrs.classhp !== undefined) {
      const perLvl = (attrs.classhp || 0) + conMod + (attrs.bonushpPerLevel || 0);
      totalHp = (attrs.ancestryhp || 0) + (perLvl * level) + (attrs.bonushp || 0);
    }
    const speed = (attrs.speed || 25) + (attrs.speedBonus || 0);
    lines.push(`- **Speed:** ${speed} ft | **Hit Points:** ${totalHp ? totalHp + ' (Max)' : 'See sheet'}`);

    // Saves & Perception
    const profs = build.proficiencies || {};
    function calcBonus(abilityMod, profRank) {
      if (!profRank || profRank <= 0) return abilityMod;
      return abilityMod + level + profRank;
    }

    const fortBonus = calcBonus(conMod, profs.fortitude);
    const refBonus = calcBonus(dexMod, profs.reflex);
    const willBonus = calcBonus(wisMod, profs.will);
    const percBonus = calcBonus(wisMod, profs.perception);
    lines.push(`- **Perception:** ${formatMod(percBonus)} (${getProfName(profs.perception)})`);
    lines.push(`- **Saving Throws:** Fortitude ${formatMod(fortBonus)} (${getProfName(profs.fortitude)}), Reflex ${formatMod(refBonus)} (${getProfName(profs.reflex)}), Will ${formatMod(willBonus)} (${getProfName(profs.will)})`);

    // Specials / Orders / Subclasses
    const specials = Array.isArray(build.specials) ? build.specials : [];
    if (specials.length > 0) {
      lines.push(`- **Special Features / Subclasses:** ${specials.join(', ')}`);
    }

    // --- SPELLCASTING SECTION (PATHBUILDER GROUND TRUTH) ---
    lines.push(`\n### SPELLCASTING & PREPARED SPELLS (FROM PATHBUILDER)`);
    lines.push(`> [!IMPORTANT]`);
    lines.push(`> Ground Truth: For prepared casters (Druids, Clerics, Wizards, Witches), ONLY the spells explicitly listed under Prepared Spells below are available to cast today. Do NOT assume, infer, or hallucinate other spells from general class lists unless the player specifically asks what they could prepare on a future day.`);

    const casters = Array.isArray(build.spellCasters) ? build.spellCasters : [];
    let hasCasting = false;

    casters.forEach(caster => {
      hasCasting = true;
      const cName = caster.name || "Spellcaster";
      const tradition = caster.magicTradition ? (caster.magicTradition.charAt(0).toUpperCase() + caster.magicTradition.slice(1)) : "Primal";
      const castType = caster.spellcastingType ? (caster.spellcastingType.charAt(0).toUpperCase() + caster.spellcastingType.slice(1)) : "Prepared";
      const profRank = getProfName(caster.proficiency);
      const keyAb = (caster.ability || 'wis').toLowerCase();
      const abMod = mods[keyAb] !== undefined ? mods[keyAb] : wisMod;
      
      let dcStr = "";
      if (caster.proficiency > 0) {
        const spellAtk = abMod + level + caster.proficiency;
        const spellDc = 10 + spellAtk;
        dcStr = ` | **Spell Attack:** ${formatMod(spellAtk)} | **Spell DC:** ${spellDc}`;
      }

      lines.push(`\n#### ${cName} (${tradition} Tradition, ${castType} Casting)`);
      lines.push(`- **Proficiency:** ${profRank}${dcStr}`);

      const spellsByLevel = Array.isArray(caster.spells) ? caster.spells : [];
      spellsByLevel.sort((a, b) => (a.spellLevel || 0) - (b.spellLevel || 0));

      let spellFound = false;
      spellsByLevel.forEach(entry => {
        const lvl = entry.spellLevel || 0;
        let list = Array.isArray(entry.list) ? entry.list.filter(Boolean) : [];
        if (list.length === 0 && Array.isArray(caster.prepared)) {
          list = caster.prepared.filter(p => p && p.spellLevel === lvl).map(p => p.name || p).filter(Boolean);
        }
        list = list.map(s => typeof s === 'string' ? s : s?.name || JSON.stringify(s)).filter(Boolean);
        
        if (list.length > 0) {
          spellFound = true;
          const rankLabel = lvl === 0 ? "Cantrips (Rank 0 - Cast at Will)" : `Rank ${lvl} Spells (Prepared Slots)`;
          lines.push(`- **${rankLabel}:** ${list.join(', ')}`);
        }
      });

      if (!spellFound) {
        lines.push(`- *No spells prepared in this slot in Pathbuilder.*`);
      }
    });

    // --- FOCUS SPELLS & FOCUS POOL ---
    let focusPool = build.focusPoints || 0;
    const focusSpells = [];
    const focusCantrips = [];

    function extractFocus(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj.focusSpells)) {
        focusSpells.push(...obj.focusSpells.map(s => typeof s === 'string' ? s : s?.name || String(s)).filter(Boolean));
      }
      if (Array.isArray(obj.focusCantrips)) {
        focusCantrips.push(...obj.focusCantrips.map(s => typeof s === 'string' ? s : s?.name || String(s)).filter(Boolean));
      }
      for (const k of Object.keys(obj)) {
        if (k !== 'focusSpells' && k !== 'focusCantrips' && typeof obj[k] === 'object') {
          extractFocus(obj[k]);
        }
      }
    }

    if (build.focus) extractFocus(build.focus);
    if (build.spellCasters) extractFocus(build.spellCasters);

    const uniqueFocusSpells = [...new Set(focusSpells)];
    const uniqueFocusCantrips = [...new Set(focusCantrips)];

    if (focusPool > 0 || uniqueFocusSpells.length > 0 || uniqueFocusCantrips.length > 0) {
      hasCasting = true;
      lines.push(`\n#### Focus Spells & Focus Pool`);
      lines.push(`- **Focus Points:** ${focusPool || 1} Point(s)`);
      if (uniqueFocusCantrips.length > 0) {
        lines.push(`- **Focus Cantrips:** ${uniqueFocusCantrips.join(', ')}`);
      }
      if (uniqueFocusSpells.length > 0) {
        lines.push(`- **Focus Spells (Costs 1 Focus Point each):** ${uniqueFocusSpells.join(', ')}`);
      }
    }

    // --- INNATE SPELLS & RITUALS ---
    const rituals = Array.isArray(build.rituals) ? build.rituals.filter(Boolean) : [];
    if (rituals.length > 0) {
      lines.push(`\n#### Rituals Known`);
      lines.push(`- ${rituals.join(', ')}`);
    }

    if (!hasCasting) {
      lines.push(`- *Non-spellcaster (no active spellcasting slots or focus pools).*`);
    }

    // --- FEATS ---
    const feats = Array.isArray(build.feats) ? build.feats : [];
    if (feats.length > 0) {
      lines.push(`\n### Feats & Abilities`);
      const featStrings = feats.map(f => {
        if (Array.isArray(f)) {
          const featName = f[0];
          const extra = f[1] ? ` (${f[1]})` : "";
          const fType = f[2] ? ` [${f[2]}]` : "";
          return `${featName}${extra}${fType}`;
        } else if (f && typeof f === 'object') {
          return f.name || JSON.stringify(f);
        }
        return String(f);
      });
      lines.push(featStrings.join('; '));
    }

    // --- WEAPONS, ARMOR & EQUIPMENT ---
    lines.push(`\n### Carried Weapons, Armor & Magic Items`);
    const weapons = Array.isArray(build.weapons) ? build.weapons.map(w => w.name || w).filter(Boolean) : [];
    if (weapons.length > 0) lines.push(`- **Weapons:** ${weapons.join(', ')}`);
    
    const armor = Array.isArray(build.armor) ? build.armor.map(a => a.name || a).filter(Boolean) : [];
    if (armor.length > 0) lines.push(`- **Armor:** ${armor.join(', ')}`);

    const equipment = Array.isArray(build.equipment) ? build.equipment.map(e => {
      if (Array.isArray(e)) return `${e[0]} (x${e[1] || 1})`;
      if (e && typeof e === 'object') return `${e.name || 'Item'} (x${e.qty || 1})`;
      return String(e);
    }).filter(Boolean) : [];
    if (equipment.length > 0) lines.push(`- **Equipment & Carried Items (incl. Scrolls/Wands):** ${equipment.join(', ')}`);

    return lines.join('\n');
  }

  async function fetchContexts() {
    const now = Date.now();
    if (now - lastSynced < 600000) {
      return { notesText: cachedNotesText, charactersText: cachedCharactersText };
    }

    const data = await chrome.storage.sync.get(['campaigns', 'activeCampaign', 'pbUrls']);
    let tempNotes = "No campaign notes provided.";
    let tempChars = "No character sheets provided.";

    if (data.campaigns && data.activeCampaign && data.campaigns[data.activeCampaign]) {
        const urls = data.campaigns[data.activeCampaign].urls || []; if (urls.length > 0) {
        try {
          const token = await getStoredToken();
          const docPromises = urls.map(async (url, index) => {
            const docIdMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
            if (!docIdMatch?.[1]) return '';
            const docId = docIdMatch[1];
            
            if (token) {
              const res = await fetch(
                `https://docs.googleapis.com/v1/documents/${docId}?includeTabsContent=true`,
                { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
              );
              if (res.status === 401) {
                chrome.storage.sync.remove(['googleToken', 'googleTokenExpiry']);
                updateAuthUI(false);
                throw new Error('Google token expired. Please reconnect in settings.');
              }
              if (!res.ok) throw new Error(`Docs API error ${res.status} for doc ${index + 1}`);
              const doc = await res.json();
              const extracted = extractTextFromTabs(doc.tabs);
              return `--- Document ${index + 1} ---\n` + (extracted.trim() || 'No content found.');
            } else {
              const res = await fetch(
                `https://docs.google.com/document/d/${docId}/export?format=txt`,
                { signal: AbortSignal.timeout(10000) }
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
      const activeSys = data.gameSystem || 'pf2e';
      
      for (const url of urls) {
        try {
          if (activeSys === 'dnd5e' || activeSys === 'dnd55e') {
            const md = await window.parseDndBeyondCharacter(url);
            chars.push(md);
          } else {
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            const json = await res.json();
            // Parse Pathbuilder JSON into structured, ground-truth markdown
            const parsedMd = parsePathbuilderCharacter(json);
            chars.push(parsedMd);
          }
        } catch(e) {
          console.error('Error fetching character data for ' + url, e);
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
      // Boost build guide chunks when user is asking for recommendations, builds, prep, or feats
      const isGuide = lower.includes('"tactics & build blueprint"') || lower.includes('"musthavefeats"');
      const isAdviceQuery = /recommend|prep|build|guide|feat|skill|advice|spell|role/i.test(query);
      if (isGuide && isAdviceQuery && score > 0) {
        score += 15;
      }
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
    const cleanGeminiKey = (data.apiKey || '').trim().replace(/^["']|["']$/g, '');
    let content = null;

    for (let i = 0; i < order.length; i++) {
      const provider = order[i];
      try {
        if (provider === 'gemini') {
          if (!cleanGeminiKey) continue;
          const routerModels = ['gemini-2.5-flash', 'gemini-flash-latest'];
          for (const rm of routerModels) {
            try {
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${rm}:generateContent`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-goog-api-key': cleanGeminiKey
                },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: prompt }] }],
                  generationConfig: {
                    responseMimeType: "application/json",
                    thinkingConfig: { thinkingBudget: 0 }
                  }
                }),
                signal: AbortSignal.timeout(8000)
              });
              const json = await res.json();
              if (json.candidates?.[0]?.content?.parts?.[0]?.text) {
                content = json.candidates[0].content.parts[0].text;
                break;
              }
            } catch (err) {
              console.warn(`Router Gemini model ${rm} failed: ${err.message}`);
            }
          }
          if (content) break;
        } else {
          const config = configs[provider] || {};
          if ((provider === 'groq' || provider === 'openrouter') && (!config.key || !config.key.trim())) {
            continue;
          }
          const baseUrl = provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' :
                          provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' :
                          config.url || 'http://localhost:1234/v1/chat/completions';
          
          const res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(config.key || '').trim()}` },
            body: JSON.stringify({
              model: config.model || '',
              messages: [{ role: 'user', content: prompt }]
            }),
            signal: AbortSignal.timeout(15000)
          });
          const json = await res.json();
          if (json.error) throw new Error(json.error.message || json.error);
          content = json.choices[0].message.content;
          break;
        }
      } catch (e) {
        console.warn(`Router Provider ${provider} failed (${e.message}). Cascading...`);
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

    const data = await chrome.storage.sync.get(['onboardingComplete', 'apiKey', 'providerOrder', 'providerConfigs', 'routingMode', 'gameSystem']);
    const hasFallbackKey = data.providerConfigs && (
      (data.providerConfigs.openrouter && data.providerConfigs.openrouter.key && data.providerConfigs.openrouter.key.trim()) ||
      (data.providerConfigs.groq && data.providerConfigs.groq.key && data.providerConfigs.groq.key.trim())
    );
    const hasLocal = data.providerOrder && data.providerOrder.includes('local');
    if (!data.apiKey && !hasFallbackKey && (!data.providerOrder || (data.providerOrder[0] === 'gemini' && !hasLocal))) {
      loadingDiv.textContent = "Error: API Key is missing. Please configure settings.";
      chatInput.disabled = false;
      sendBtn.disabled = false;
      return;
    }

    try {
      let route = ["core", "apg", "gm_core", "campaign", "chars"]; // default all
      const mode = data.routingMode || "all";

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
      
      // Safety guardrails against massive payload sizes that cause API timeouts
      if (notesText && notesText.length > 50000) {
        notesText = notesText.substring(0, 50000) + "\n\n[Campaign notes truncated for length...]";
      }
      if (charactersText && charactersText.length > 80000) {
        charactersText = charactersText.substring(0, 80000) + "\n\n[Character data truncated for length...]";
      }
      
      loadingDiv.textContent = 'Thinking... (running local search over rulebooks)';
      await ensureRulebooksLoaded();
      let combinedRules = "";
      if (route.includes("core")) combinedRules += rulebookText + "\n";
      if (route.includes("apg")) combinedRules += apgText + "\n";
      if (route.includes("gm_core")) combinedRules += gmCoreText + "\n";
      
      let relevantRules = "";
      if (combinedRules.trim().length > 0) {
        relevantRules = getRelevantChunks(combinedRules, text, 15000);
      }

      const sysName = (data.gameSystem || 'pf2e') === 'pf2e' ? 'Pathfinder 2e' : 'D&D 5e';
      const systemInstruction = `You are Stark, an expert AI Rules Lawyer, Game Master assistant, and Tactical Build Advisor for a ${sysName} campaign.
CRITICAL INSTRUCTION: Do NOT use any emojis in your responses. Keep the tone serious, direct, and professional.
CRITICAL INSTRUCTION: Never use or mention meta terms like "Mode A", "Mode B", "Operational Mode", "Advisor Mode", or similar internal instructions in your responses. Respond directly and naturally as Stark.

--- CORE GUIDELINES & CHARACTER INTEGRITY ---
1. IN-PLAY & TACTICAL GROUND TRUTH (ACTIVE PLAY & ENCOUNTERS)
   - When the user asks what their character can cast right now, what actions they can take in combat, or asks about their current stats:
   - The character sheets below reflect the exact, authoritative state of the characters exported from Pathbuilder (or D&D Beyond). Treat them as immutable ground truth during active play.
   - For prepared spellcasters (such as Druids, Clerics, Wizards, and Witches): They can ONLY cast the specific spells they have currently prepared in their spell slots for the day (plus their cantrips, focus spells, and carried items like scrolls/wands).
   - NEVER claim or hallucinate that a character can cast, has, or knows a spell in combat unless it is explicitly listed under their character sheet's Prepared Spells, Cantrips, Focus Spells, or carried equipment.
   - If asked "What spells do I have?" or "Can I cast [Spell]?", check their exact prepared list. If it is NOT prepared, state clearly: "You do not currently have [Spell] prepared in Pathbuilder for today. Your prepared spells are: [List]. (You could prepare it during your next daily preparation if it is on your spell list)."
   - EXCERPTS ARE FOR RULES REFERENCE ONLY: The "RELEVANT RULEBOOK EXCERPTS" section provides mechanics and definitions. It is NOT the character's sheet! Never assume a player has or knows a spell just because it appears in the rulebook excerpts.

2. BUILD, LEVEL-UP & DAILY PREPARATION ADVICE
   - Triggered whenever the user asks for recommendations, build advice, leveling choices, spells to prepare for tomorrow, spell repertoire selection, feats, skill proficiencies, or tactical advice (e.g., "What spells should I prep?", "Recommend spells for a lvl 10 support bard", "What feats should my fighter take?").
   - In these scenarios, act as an expert tactical coach and build architect across both casters and martials!
   
   - A. ROLE-BASED ARCHETYPES WITHIN CLASSES:
     * Understand that players frequently build toward specific roles within any class. Tailor advice directly to their chosen role:
       - SUPPORT / HEALER: Focus on healing (e.g., Soothe for Occult, Heal for Primal/Divine, Battle Medicine), condition removal, offensive buffs (Heroism, Haste, Courageous Anthem), and action economy enablers (Lingering Composition).
       - CROWD CONTROL (CC) / DEBUFFER: Focus on action denial (Slow, Roaring Applause), status penalties (Synesthesia, Frightened via Dirge of Doom or Demoralize), difficult terrain, and forced movement.
       - BLASTER / DAMAGE: Focus on area-of-effect damage, single-target burst, energy weakness exploitation, and save-or-suck damage spells.
       - UTILITY / INFILTRATION / FACE: Focus on social enchantment, stealth/invisibility, reconnaissance, mobility (Translocate / Dimension Door, Fly), and ritual utility.
       - GISH / FRONTLINE HYBRID: Focus on defense, armor/shield survivability, weapon strikes, and self-buffs (Sure Strike, Bespell Weapon).
       - MARTIAL ROLES (Tank/Defender, Striker/DPS, Skirmisher, Warlord/Leader): Focus on reaction strikes (Reactive Strike), combat maneuvers (Grapple/Trip via Athletics), defensive stances (Raise a Shield, Shield Block), and support skill feats (Intimidating Glare, Battle Medicine, Bon Mot).
     * If the player specifies a role (e.g., "healer bard", "blaster sorcerer", "tank fighter", "grappler monk"), tailor all spell, feat, and skill recommendations strictly to that role.
     * If the player does NOT specify a role (e.g., "What spells should my level 10 bard take?"), provide the premier flagship build for their subclass while briefly offering choices to lean into other roles (e.g., "Here is the premier Support/Buff setup, but let me know if you want to lean into Crowd Control or Blasting!").

   - B. TRADITION INTEGRITY (PREVENT NEWBIE TRAP CHOICES):
     * Always ensure recommended spells belong strictly to the character's magical tradition:
       - Occult (Bard, Psychic): Mental buffs, Will debuffs, illusion, and psychic healing (Soothe). Note that Heal is NOT on the Occult list—Soothe is their signature healing spell!
       - Primal (Druid, Sorcerer): Elemental damage, nature healing (Heal), shapechanging, battlefield control (Wall of Stone). Note that mental debuffs are rare.
       - Divine (Cleric, Oracle, Champion): Vitality healing (Heal), condition cleansing, radiant/spirit damage, divine buffs. Note that broad battlefield control is limited.
       - Arcane (Wizard, Magus): Unrivaled versatility, blasting, area control, teleports. Note that standard hit point healing is absent.

   - C. THE 4-PART ADVICE BLUEPRINT:
     Structure recommendations cleanly for easy table play:
     1. Action Economy Engine: 1-action options (composition cantrips, skill actions like Bon Mot or Demoralize), 2-action staples, and key reaction spells/abilities (Lose the Path, Counterperformance, Shield).
     2. Rank-by-Rank Spell Breakdown: Organized by spell rank, highlighting signature spells (e.g., Soothe) and heightened value.
     3. Synergistic Feats & Skills: Key class feats, skill feats, and skill proficiencies that multiply their effectiveness (e.g., Lingering Composition, Bon Mot for Will save debuffs, Battle Medicine + Medic Dedication).
     4. "The Why" (Tactical Value): A concise 1-sentence explanation of why each choice is strong and how to use it in encounters.

   - D. CONTEXT-AWARE COMPARISON:
     * If a character sheet is loaded below, reference what the character already has: point out synergies with their existing feats/stats, note any glaring gaps (such as lacking a good reaction or out-of-combat heal), and suggest exact swaps or additions.

   - E. PATHBUILDER & REMASTER COMPATIBILITY:
     * Pathbuilder 2e operates primarily on the Pathfinder 2e Remaster (Player Core 1 & Player Core 2).
     * Always prioritize current Remaster terminology and spell names (e.g., Courageous Anthem instead of Inspire Courage, Sure Strike instead of True Strike, Translocate instead of Dimension Door, Runic Weapon instead of Magic Weapon, Cleanse Affliction instead of Remove Disease/Curse, Off-Guard instead of Flat-Footed, and Spell Rank instead of Spell Level).
     * When recommending an option that was renamed in the Remaster, mention the legacy name in parentheses (e.g., "Courageous Anthem (formerly Inspire Courage)") so players can effortlessly locate it in Pathbuilder whether using legacy or Remaster search.

--- CAMPAIGN NOTES ---
${notesText}

--- CHARACTER SHEETS (GROUND TRUTH FROM PATHBUILDER) ---
${charactersText}

--- RELEVANT RULEBOOK EXCERPTS ---
${relevantRules}
`;

      let answer = "";
      
      const order = data.providerOrder || ['gemini'];
      const configs = data.providerConfigs || {};
      const cleanGeminiKey = (data.apiKey || '').trim().replace(/^["']|["']$/g, '');
      let providerErrors = [];

      for (let i = 0; i < order.length; i++) {
        const provider = order[i];
        let providerName = provider === 'gemini' ? 'Gemini' : 
                           provider === 'openrouter' ? 'OpenRouter' : 
                           provider === 'groq' ? 'Groq' : 
                           provider === 'local' ? 'Local LLM' : 'Unknown Provider';

        if (provider === 'gemini' && !cleanGeminiKey) {
          continue;
        }
        if ((provider === 'openrouter' || provider === 'groq') && (!configs[provider]?.key || !configs[provider].key.trim())) {
          continue;
        }

        if (provider === 'gemini') {
          tokenMeterContainer.style.display = 'block';
        } else {
          tokenMeterContainer.style.display = 'none';
        }

        try {
          if (provider === 'gemini') {
            loadingDiv.textContent = 'Thinking... (calling Gemini)';
            const reqBody = {
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: conversationHistory,
              generationConfig: {
                thinkingConfig: {
                  thinkingBudget: 0
                }
              }
            };
            
            const geminiModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
            let geminiLastErr = null;

            for (const geminiModel of geminiModels) {
              let delay = 1500;
              let retries = 2;
              let tryWithoutThinking = false;

              while (retries > 0) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(new Error(`Gemini (${geminiModel}) took longer than 45s to respond.`)), 45000);

                let res;
                let json;
                try {
                  const currentReqBody = JSON.parse(JSON.stringify(reqBody));
                  if (tryWithoutThinking && currentReqBody.generationConfig?.thinkingConfig) {
                    delete currentReqBody.generationConfig.thinkingConfig;
                  }

                  res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-goog-api-key': cleanGeminiKey
                    },
                    body: JSON.stringify(currentReqBody),
                    signal: controller.signal
                  });
                  json = await res.json();
                } catch (fetchErr) {
                  clearTimeout(timeoutId);
                  console.warn(`Gemini (${geminiModel}) request failed: ${fetchErr.message}`);
                  geminiLastErr = fetchErr;
                  // If aborted due to timeout or network failure, break to try the next model
                  break;
                } finally {
                  clearTimeout(timeoutId);
                }

                if (json && json.error) {
                  const errCode = json.error.code;
                  const errMsg = json.error.message || JSON.stringify(json.error);

                  // 1) Model does not support thinkingConfig
                  if (errCode === 400 && /thinkingConfig|unknown field/i.test(errMsg) && !tryWithoutThinking) {
                    console.warn(`Model ${geminiModel} does not support thinkingConfig, retrying without it...`);
                    tryWithoutThinking = true;
                    continue;
                  }

                  // 2) Overloaded / 503 High Demand
                  if (errCode === 503) {
                    retries--;
                    if (retries === 0) {
                      geminiLastErr = new Error("Google API is experiencing high demand.");
                      console.warn(`${geminiModel} is overloaded (503). Trying alternative Gemini model...`);
                      break;
                    }
                    loadingDiv.textContent = `High demand on ${geminiModel}. Retrying in ${delay / 1000}s...`;
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 2;
                    continue;
                  }

                  // 3) Model not found (404)
                  if (errCode === 404 || /not found/i.test(errMsg)) {
                    geminiLastErr = new Error(errMsg);
                    console.warn(`${geminiModel} not found (404). Trying alternative Gemini model...`);
                    break;
                  }

                  // 4) Rate limit (429)
                  if (errCode === 429) {
                    geminiLastErr = new Error("Google API rate limit exceeded. Please wait a moment or check your quota.");
                    break;
                  }

                  // Other error (auth, bad request)
                  geminiLastErr = new Error(errMsg);
                  break;
                }

                if (json && json.candidates && json.candidates[0]?.content?.parts?.[0]?.text) {
                  answer = json.candidates[0].content.parts[0].text;
                  if (json.usageMetadata && json.usageMetadata.totalTokenCount) {
                    updateTokenMeter(json.usageMetadata.totalTokenCount);
                  }
                  break;
                } else if (json && json.candidates && json.candidates[0]?.finishReason) {
                  geminiLastErr = new Error(`Gemini response stopped: ${json.candidates[0].finishReason}`);
                  break;
                } else if (json) {
                  geminiLastErr = new Error("Gemini returned an empty response.");
                  break;
                }
              }

              if (answer) break;
            }

            if (!answer && geminiLastErr) {
              throw geminiLastErr;
            }
          } else {
            // OpenAI Format (Groq, OpenRouter, Local)
            const config = configs[provider] || {};
            const baseUrl = provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' :
                            provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' :
                            config.url || 'http://localhost:1234/v1/chat/completions';
            const apiKey = (config.key || '').trim();
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
            const timeoutId = setTimeout(() => controller.abort(new Error(`${providerName} took longer than 60s to generate a response.`)), 60000);

            let res;
            let json;
            try {
              const reqHeaders = { 'Content-Type': 'application/json' };
              if (apiKey) reqHeaders['Authorization'] = `Bearer ${apiKey}`;
              res = await fetch(baseUrl, {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify({
                  model: modelId,
                  messages: openaiMessages
                }),
                signal: controller.signal
              });
              json = await res.json();
            } finally {
              clearTimeout(timeoutId);
            }
            
            if (json && json.error) {
               let errMsg = json.error.message || JSON.stringify(json.error);
               if (json.error.metadata && json.error.metadata.raw) {
                  errMsg += ` (Upstream details: ${json.error.metadata.raw})`;
               }
               throw new Error(errMsg);
            }
            if (json && json.choices && json.choices[0]?.message?.content) {
              answer = json.choices[0].message.content;
            } else {
              throw new Error(`Empty response returned by ${providerName}.`);
            }
          }

          // If we successfully got an answer, stop the cascade loop
          if (answer) {
             providerErrors = [];
             break;
          }
        } catch (e) {
          // If localhost was tried but isn't running, don't pollute the error if there are other providers
          if (provider === 'local' && /Failed to fetch|NetworkError/i.test(e.message || '')) {
            console.warn(`Local LLM not running (${e.message}).`);
            if (order.length === 1) {
              providerErrors.push(`${providerName}: Connection failed. Is your local model server (LM Studio / Ollama) started?`);
            }
          } else {
            const cleanMsg = (e.name === 'AbortError' || /aborted/i.test(e.message || ''))
              ? `${providerName} took longer than 60s to respond.`
              : e.message;
            providerErrors.push(cleanMsg.startsWith(providerName) ? cleanMsg : `${providerName}: ${cleanMsg}`);
          }
          console.warn(`Provider ${provider} failed: ${e.message}. Cascading to next...`);
        }
      }

      if (providerErrors.length > 0 && !answer) {
        throw new Error(providerErrors.join(' | '));
      }
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


