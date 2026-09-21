document.addEventListener('DOMContentLoaded', async () => {
  const settingsView = document.getElementById('settings-view');
  const chatView = document.getElementById('chat-view');
  
  const apiKeyInput = document.getElementById('api-key');
  const toggleApiKeyBtn = document.getElementById('toggle-api-key');
  const notesUrlInput = document.getElementById('notes-url');
  const pbUrlsInput = document.getElementById('pb-urls');
  const saveBtn = document.getElementById('save-settings');
  
  const openSettingsBtn = document.getElementById('open-settings');
  
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  let rulebookText = "";
  
  // Load rulebook from extension package
  fetch(chrome.runtime.getURL('rulebook.txt'))
    .then(res => res.text())
    .then(text => { rulebookText = text; })
    .catch(err => console.error("Failed to load rulebook", err));

  // Load Settings
  const data = await chrome.storage.local.get(['apiKey', 'notesUrl', 'pbUrls']);
  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
    notesUrlInput.value = data.notesUrl || '';
    pbUrlsInput.value = data.pbUrls || '';
    settingsView.classList.add('hidden');
    chatView.classList.remove('hidden');
  }

  // Toggle API Key visibility
  if (toggleApiKeyBtn) {
    toggleApiKeyBtn.addEventListener('click', () => {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleApiKeyBtn.textContent = '🙈';
      } else {
        apiKeyInput.type = 'password';
        toggleApiKeyBtn.textContent = '👁';
      }
    });
  }

  saveBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      apiKey: apiKeyInput.value.trim(),
      notesUrl: notesUrlInput.value.trim(),
      pbUrls: pbUrlsInput.value.trim()
    }, () => {
      settingsView.classList.add('hidden');
      chatView.classList.remove('hidden');
    });
  });

  openSettingsBtn.addEventListener('click', () => {
    chatView.classList.add('hidden');
    settingsView.classList.remove('hidden');
  });

  async function fetchContexts() {
    const data = await chrome.storage.local.get(['notesUrl', 'pbUrls']);
    let notesText = "No campaign notes provided.";
    let charactersText = "No character sheets provided.";

    if (data.notesUrl) {
      try {
        let fetchUrl = data.notesUrl;
        const docIdMatch = data.notesUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        if (docIdMatch && docIdMatch[1]) {
          fetchUrl = `https://docs.google.com/document/d/${docIdMatch[1]}/export?format=txt`;
        }
        const res = await fetch(fetchUrl);
        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE html>') || text.includes('<script')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'text/html');
          notesText = doc.body.innerText || doc.body.textContent;
        } else {
          notesText = text; 
        }
      } catch(e) {
        console.error("Error fetching notes", e);
        notesText = "Failed to load campaign notes.";
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
          console.error("Error fetching pathbuilder json for " + url, e);
        }
      }
      if (chars.length > 0) charactersText = chars.join('\n\n---\n\n');
    }

    return { notesText, charactersText };
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

  async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    chatInput.disabled = true;
    sendBtn.disabled = true;

    addMessage('user', text);
    chatInput.value = '';
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai';
    loadingDiv.textContent = 'Thinking... (gathering context)';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const data = await chrome.storage.local.get(['apiKey']);
    if (!data.apiKey) {
      loadingDiv.textContent = "Error: API Key is missing. Please configure settings.";
      chatInput.disabled = false;
      sendBtn.disabled = false;
      return;
    }

    try {
      loadingDiv.textContent = 'Thinking... (running local search over rulebook)';
      const { notesText, charactersText } = await fetchContexts();
      const relevantRules = getRelevantChunks(rulebookText, text, 15000);
      
      const systemInstruction = `You are Stark, an AI assistant for a Pathfinder 2e campaign. 
Do not search the internet. Only use the provided context to answer questions.
The context contains extracted relevant paragraphs from the Pathfinder 2e Core Rulebook, the campaign notes, and the players' character sheets.

--- CAMPAIGN NOTES ---
${notesText.substring(0, 20000)}

--- CHARACTER SHEETS ---
${charactersText.substring(0, 20000)}

--- RELEVANT RULEBOOK EXCERPTS ---
${relevantRules}
`;

      const reqBody = {
        system_instruction: { parts: { text: systemInstruction } },
        contents: [{ role: 'user', parts: [{ text }] }]
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
          delay *= 2; // Exponential backoff: 2s, 4s, 8s, 16s
        } else if (json.error) {
          throw new Error(json.error.message);
        } else {
          break; // Success
        }
      }

      const answer = json.candidates[0].content.parts[0].text;
      loadingDiv.textContent = answer;
    } catch (e) {
      console.error(e);
      loadingDiv.textContent = "Error: " + e.message;
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
