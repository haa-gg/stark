# Stark AI Extension

A lightweight, local RAG-powered Chrome extension for Pathfinder 2e campaigns, built entirely on the free tier of Google Gemini 3.6 Flash.

## Installation Instructions

1. Go to the [Releases page](https://github.com/haa-gg/stark/releases).
2. Download the latest `Stark_AI_vX.X.zip` file under "Assets".
3. Extract the downloaded zip file into a folder on your computer.
4. Open Google Chrome and navigate to `chrome://extensions/`.
5. Turn on **Developer mode** (toggle switch in the top right corner).
6. Click the **Load unpacked** button in the top left.
7. Select the folder where you extracted the extension.
8. Click the Stark icon in your Chrome extensions toolbar to open the side panel!

## Features

- **Local "Poor Man's" RAG:** Pre-bundles the Pathfinder 2e Core Rulebook text and searches it locally using JavaScript regex before sending to the LLM, keeping context size incredibly small and fast.
- **Context Caching:** Automatically caches Google Docs and Pathbuilder JSONs in the browser for 10 minutes to dramatically increase response speed during active play.
- **Conversational Memory:** Maintains a rolling window of your last 4 messages so the AI remembers context in an ongoing conversation.
- **Dynamic Token Meter:** Visually tracks your Gemini token usage per query in real-time, pulling directly from the hidden `usageMetadata` API response.
- **Exponential Backoff:** If Google's free-tier servers hit capacity, the extension automatically intercepts the 503 error and retries your request intelligently until the traffic spike clears.
