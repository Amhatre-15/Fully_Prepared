# Fully Prepared — User Guide

Fully Prepared is a free desktop interview-practice app. Your sessions, imported documents, preferences, and drafts are stored on this device. You choose the AI provider; no model or paid account is bundled.

## First launch: connect a model

1. Open **Configure model** from the sidebar.
2. Choose **Ollama (local)**, **LM Studio (local)**, or a compatible endpoint.
3. Enter the model name exactly as your provider reports it. For Ollama, use a terminal command such as `ollama list` to see installed names.
4. Set the endpoint (Ollama normally uses `http://127.0.0.1:11434`; LM Studio commonly uses `http://127.0.0.1:1234/v1`).
5. Save the settings, then use **Test connection** and select the model for your session.

Local Ollama and LM Studio requests stay on this computer. If you choose a hosted endpoint, the prompts and context you send to that provider leave the device. API keys are stored using Windows-backed Electron encryption when the OS makes it available; if encryption is unavailable, the app refuses to save the key.

## Create a mock interview

1. Choose **Create session** and enter the company and job description. Company suggestions search the built-in local directory; the lookup provider is replaceable and currently does not make a network request.
2. Optionally import a resume or supporting document and select the context relevant to this session.
3. Choose a language, model, answer style, and whether to save the transcript or opt into answer suggestions.
4. Start the session. The interviewer asks one question at a time. Use **Answer** for a model-drafted suggestion or type your response manually.
5. Connect a microphone only when you choose to record. Use Pause, Stop, and Disconnect to control the session; disconnecting stops the capture stream.

## Voice input and output

The interviewer's spoken questions use the speech voices installed with Windows. In **Configure model → Voice input**, choose a voice, preview it, and stop queued speech if needed. Voice availability and quality depend on Windows; Fully Prepared does not download or bundle a voice generator.

For speech-to-text, the app bundles a Whisper.cpp engine and base model with the Windows app. Use **Check local voice setup** to verify the local files and service. The diagnostic action can start the local speech server; the first start may take up to about a minute. Audio sent to Whisper's `127.0.0.1` loopback service stays on this computer. Browser speech recognition is an alternative whose handling depends on the browser/runtime provider.

Before the first microphone request, the app explains the audio and transcript path. A recognized transcript can still be sent to the model you selected, including a hosted model if you configured one.

## Resumes and documents

PDF, DOCX, and TXT files are extracted locally as text. Image-only PDFs are rendered in the app and processed by the bundled English Tesseract.js model, offline, for up to 20 pages per document. OCR output is labeled by source page; scan quality can affect accuracy. Executable, macro-enabled, HTML, and other unsupported file types are rejected. The app does not run imported files or use their embedded scripts.

For local AI headshots, install and run Stable Diffusion WebUI with its local API enabled (default `http://127.0.0.1:7860`). Choose a photo, set a short style, and generate. The image is sent only to the loopback service on your computer. Generated faces can change identity details; review the result carefully before use.

Resume feedback is an explainable, role-specific keyword and structure heuristic—not a hiring prediction or an ATS guarantee. Review every suggestion and keep claims truthful. AI-generated answer suggestions can be inaccurate; verify them before using them.

## Saved data and privacy

- Session metadata, transcripts (when enabled), resumes, documents, question notes, and preferences are kept in local app storage.
- Hosted AI providers receive only the prompt/context submitted for their request; check their privacy terms before using them.
- You can delete saved sessions individually or use **Settings → Delete all local data** to clear the app's local records and saved key. Deletion cannot be undone.
- The app does not provide sign-in or sync in this build. Your account name is a local display preference, not an online account.

## Troubleshooting

- **Ollama cannot connect:** start Ollama, confirm the endpoint, then test it from Configure model. The endpoint must be reachable by the desktop app.
- **No model appears:** verify the model is installed and use the exact name shown by Ollama or your provider.
- **Microphone blocked:** grant microphone access to Fully Prepared in Windows privacy settings, select an input device, and reconnect.
- **No speech voice:** install or enable a Windows speech voice, reopen the settings, and check again.
- **Whisper is unavailable:** use the local setup check. Missing bundled files require reinstalling a complete app package; the development checkout alone is not the production installer.
- **Resume score seems wrong:** the score is a transparent heuristic. Add the target job requirements and ensure the resume text was extracted correctly.
