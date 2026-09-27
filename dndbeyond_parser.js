window.parseDndBeyondCharacter = async function(urlOrId) {
  let characterId = urlOrId;
  const match = String(urlOrId).match(/\/characters\/(\d+)/);
  if (match) {
    characterId = match[1];
  } else if (!isNaN(urlOrId)) {
    characterId = urlOrId;
  } else {
    throw new Error("Invalid D&D Beyond URL or ID");
  }

  // Check for open D&D Beyond tabs matching the character ID
  const tabs = await chrome.tabs.query({ url: `*://*.dndbeyond.com/characters/${characterId}*` });
  
  if (tabs.length === 0) {
     throw new Error(`D&D Beyond Cloudflare block active. Please open your character sheet (https://www.dndbeyond.com/characters/${characterId}) in a new browser tab, keep it open, and then try again! Stark will read it directly from the tab.`);
  }

  const targetTab = tabs[0];

  // Inject script to extract character data from the DOM's inline script tags
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId: targetTab.id },
    func: () => {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        if (script.textContent.includes('window.__INITIAL_STATE__')) {
          const match = script.textContent.match(/window\.__INITIAL_STATE__\s*=\s*({.*});/);
          if (match) {
             return JSON.parse(match[1]);
          }
        }
      }
      return null;
    }
  });

  const initialState = injectionResults[0].result;
  if (!initialState) {
     throw new Error("Could not find character data in the open D&D Beyond tab. Try refreshing the character sheet tab.");
  }

  // Recursively search the state object for the character data payload
  function findCharacterObj(obj) {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj.classes) && obj.baseHitPoints !== undefined && obj.name) return obj;
      for (const key of Object.keys(obj)) {
          const found = findCharacterObj(obj[key]);
          if (found) return found;
      }
      return null;
  }

  const character = findCharacterObj(initialState);
  if (!character) {
      throw new Error("Character data structure not found in the D&D Beyond tab. Their site layout may have changed.");
  }

  // Build markdown summary
  let md = `# ${character.name}\n`;
  
  // Basic info
  if (character.classes) {
      const classes = character.classes.map(c => `${c.definition.name} ${c.level}`).join(' / ');
      md += `**Class:** ${classes}\n`;
  }
  if (character.race && character.race.fullName) {
      md += `**Race:** ${character.race.fullName}\n`;
  }
  
  md += `\n## Core Stats\n`;
  const statNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  if (character.stats) {
      character.stats.forEach((stat, index) => {
        md += `- **${statNames[index]}**: ${stat.value}\n`;
      });
  }

  md += `\n## HP and AC\n`;
  md += `- **Base HP**: ${character.baseHitPoints}\n`;
  // Note: AC calculation in 5e JSON requires summing modifiers, 
  // but we provide the raw base logic for the AI to understand.

  return md;
};
