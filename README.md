# Stark AI

An AI assistant for Pathfinder 2e campaigns, built as a Chrome Extension and powered by Google's free Gemini Flash API. Stark acts as an intelligent campaign sidekick—it reads the complete Pathfinder 2e Core Rulebook, your campaign notes via Google Docs, and your group's character sheets from Pathbuilder, providing instant answers without searching the internet.

## Features

- **Side Panel Interface:** Keeps the chat open while you switch tabs.
- **Local RAG Token Optimization:** Avoids free-tier rate limits by extracting only the most relevant paragraphs from the rulebook before sending queries to Gemini.
- **Pathbuilder Integration:** Fetches stats directly from JSON exports.
- **Google Doc Integration:** Directly imports live campaign notes (bypassing HTML scripts via raw text export).

## Installation Instructions (Developer Mode)

1. Clone or download this repository to your local machine.
2. Ensure you have the `rulebook.txt` file (Pathfinder 2e Core Rulebook in plain text) located in the root of the extension folder. (Downloadable from archive.org).
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Toggle **Developer mode** on in the top right corner.
5. Click **Load unpacked** in the top left corner.
6. Select the `Stark` folder where this code is located.
7. Click the Stark extension icon in your Chrome toolbar to open the side panel!

## Configuration

When you first open Stark, you'll need to provide:
1. **Gemini API Key:** Generate a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. **Campaign Notes (Google Doc):** A link to your campaign notes. Ensure the Google Doc is shared so that "Anyone with the link can view".
3. **Pathbuilder Links:** One or more links to your players' character JSON endpoints (e.g., `https://pathbuilder2e.com/json.php?id=[build_id]`).

Hit **Save & Start** and you are ready to play!
