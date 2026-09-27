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

  const response = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${characterId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch D&D Beyond character.");
  }
  const data = await response.json();
  const character = data.data;

  // Build markdown summary
  let md = `# ${character.name}\n`;
  
  // Basic info
  const classes = character.classes.map(c => `${c.definition.name} ${c.level}`).join(' / ');
  md += `**Class:** ${classes}\n`;
  if (character.race && character.race.fullName) {
      md += `**Race:** ${character.race.fullName}\n`;
  }
  
  md += `\n## Core Stats\n`;
  const statNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  character.stats.forEach((stat, index) => {
    md += `- **${statNames[index]}**: ${stat.value}\n`;
  });

  md += `\n## HP and AC\n`;
  md += `- **Base HP**: ${character.baseHitPoints}\n`;
  // Note: AC calculation in 5e JSON requires summing modifiers, 
  // but we provide the raw base logic for the AI to understand.

  return md;
};
