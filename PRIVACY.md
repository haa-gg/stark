# Privacy Policy for Stark AI

*Last updated: October 23, 2026*

**Stark AI** ("Stark", "we", "our") is a browser extension designed to assist tabletop roleplayers running Pathfinder 2e campaigns with rules lookups, campaign notes search, and character sheet integration.

We are committed to user privacy. Stark operates under a strict **local-first** and **minimal-data** model.

---

## 1. Information We Access and How It Is Used

Stark operates within your browser and only accesses data necessary to provide its core features:

- **AI Provider API Keys**: If you choose to use cloud AI providers (such as Google Gemini, OpenRouter, or Groq), your API keys are stored locally on your device via Chrome's `storage.sync` or `storage.local` API. They are never transmitted to our servers or any third parties other than the AI provider you select.
- **Google Docs (Campaign Notes)**: If you connect your Google account to sync campaign notes, Stark requests read-only access (`documents.readonly`) via Google's official OAuth flow (`chrome.identity`). Stark retrieves the text content of the Google Docs URLs you specify solely to build the context for answering your campaign questions.
- **Pathbuilder 2e Character Data**: If you provide Pathbuilder 2e public export URLs, Stark fetches character stats and spells solely to answer character-specific gameplay questions.
- **Local Language Models**: If you use local models (such as Ollama or LM Studio), your queries and data remain entirely on your local machine (`localhost`).

---

## 2. Data Storage and Retention

- **No Remote Tracking or Analytics**: Stark does not run analytics, telemetry, or user tracking scripts.
- **Local Storage**: All user settings, campaign names, document URLs, and API keys reside within Chrome's local extension storage on your device.
- **Session Data**: Chat history and retrieved document context are held in local memory during your browser session and can be cleared at any time.

---

## 3. Third-Party Services and AI Providers

When you ask a question in Stark:
- The necessary context (relevant rules excerpts, campaign note snippets, and character info) is sent directly to your selected AI provider (e.g., Google Generative AI, OpenRouter, Groq, or your local machine) to generate a response.
- Your interactions with third-party AI providers are subject to their respective privacy policies and terms of service.
- Stark complies with the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

---

## 4. Data Sharing and Sale

Stark **does not sell, rent, trade, or transfer** your personal data or content to any third parties for advertising or commercial purposes.

---

## 5. Security

Authentication with Google uses Google's secure OAuth 2.0 WebAuthFlow. Stark never receives or stores your Google password.

---

## 6. Contact and Inquiries

If you have questions or feedback regarding this Privacy Policy, please open an issue on GitHub:
- **Repository**: [https://github.com/haa-gg/stark](https://github.com/haa-gg/stark)
