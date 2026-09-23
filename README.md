# Stark AI Extension

A lightweight, local RAG-powered Chrome extension for Pathfinder 2e campaigns. It interfaces with Google Gemini, Groq, OpenRouter, and Local LLMs (via LM Studio or Ollama) to serve as a fast, intelligent Game Master assistant.

## Installation Instructions

1. Go to the [Releases page](https://github.com/haa-gg/stark/releases).
2. Download the latest `Stark_AI_vX.X.zip` file under "Assets".
3. Extract the downloaded zip file into a folder on your computer.
4. Open Google Chrome and navigate to `chrome://extensions/`.
5. Turn on **Developer mode** (toggle switch in the top right corner).
6. Click the **Load unpacked** button in the top left.
7. Select the folder where you extracted the extension.
8. Click the Stark icon in your Chrome extensions toolbar to open the side panel!

## Setup Instructions

Once installed, click the Stark icon in your extensions toolbar to open the side panel and configure the extension:

1. **AI Provider Fallback Stack:** Drag and drop your preferred AI providers (Gemini, OpenRouter, Groq, Localhost). Configure independent API keys or URLs for each by clicking their ⚙ icon. 
2. **Campaign Notes (Google Doc):** Paste the URL to your campaign notes Google Doc.
3. **Connect Google Account:** Click the "Connect Google Account" button and sign in. This securely authenticates the extension to read your private campaign notes doc (including all tabs!).
4. **Pathbuilder JSONs:** Paste the direct JSON links for your players' Pathbuilder sheets (one per line).
5. **Smart Routing:** Leave this enabled to save API tokens! Stark will intelligently determine which rulebooks and campaign notes to load for each question.

## Features

- **Cascading Fallback Routing:** Set up a hierarchy of providers. If your top provider goes down, hits a rate limit, or runs out of context space, Stark will silently and seamlessly failover to the next provider in your stack without dropping the request.
- **Provider Agnostic:** Supports Google Gemini natively, plus full OpenAI-compatible API support for Groq, OpenRouter, and Local LLMs (like LM Studio or Ollama).
- **Google Docs Integration:** Connect your Google account once to automatically pull content from your private campaign notes (including all sub-tabs) using the official Google Docs API.
- **Smart Context Routing:** Before answering, Stark asks an ultra-fast LLM router which context it needs (Player Rules, GM Rules, or Campaign Notes) so it doesn't burn tokens sending 300,000 words for every single question.
- **Local "Poor Man's" RAG:** Pre-bundles the Pathfinder 2e rulebooks (Core, APG, GM Core) and searches them locally using JavaScript regex before sending to the LLM, keeping context size incredibly small and fast.
- **Context Caching:** Automatically caches Google Docs and Pathbuilder JSONs in the browser for 10 minutes to dramatically increase response speed during active play.
- **Conversational Memory:** Maintains a rolling window of your last 4 messages so the AI remembers context in an ongoing conversation.
- **Dynamic Token Meter:** Visually tracks your Gemini token usage per query in real-time.
