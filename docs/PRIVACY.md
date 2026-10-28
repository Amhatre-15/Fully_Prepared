# Privacy and local data

Fully Prepared is designed to work without an account, subscription, or bundled cloud service. It does not silently upload your library or transcript. Your selected model endpoint and speech mode determine whether data leaves the device.

## What is stored on this device

- App settings, onboarding name, theme, drafts, session metadata, and transcripts are stored in the Electron profile (primarily `localStorage`).
- Session setup includes a transcript-saving choice. When turned off, message text is omitted from persisted active/completed session records; session metadata still remains so the history card can be shown.
- Imported PDF, DOCX, and TXT files are parsed in the Electron main process. Extracted text and file metadata are stored in the local IndexedDB library; the app does not execute imported files.
- Question Bank notes, resume drafts, and headshot crops are stored locally in IndexedDB or browser storage.
- Renderer error event names are recorded only when local crash capture is enabled. Up to 50 event names are kept locally; raw error messages are not stored.
- A saved provider API key is stored using Electron `safeStorage` when device encryption is available. The app refuses to save a new key when encryption is unavailable. An API key saved by an older version may need migration; the app reports if it could not move it to encrypted storage.

## Model and speech data flow

- **Local-only model mode:** enabled by default and enforced in Electron's main process for model discovery and chat. Only loopback endpoints (`localhost`, `127.0.0.0/8`, and `::1`) are allowed, and local-only requests reject redirects. Turning this off requires an explicit confirmation; then the configured provider may receive job descriptions, selected resume/document excerpts, and interview prompts.
- **Local model endpoint:** when configured to a service on this computer (for example Ollama at `127.0.0.1`), prompts are sent to that local service. A custom endpoint may point elsewhere; verify its host before use.
- **Hosted/OpenAI-compatible endpoint:** the question, job description, selected resume/document excerpts, and answer context needed for the request are sent to the endpoint you configured. The provider's own retention and privacy policy applies. Do not include information you do not want that provider to receive.
- **AI resume-summary drafting:** only the bounded resume facts entered in the summary/experience/education/skills fields are sent to the currently selected model. This feature is opt-in, and generated text is shown separately until you choose to apply it. Local-only mode still restricts the model endpoint to loopback; hosted endpoints receive those facts.
- **Scanned-PDF OCR:** PDF pages and English OCR run on this device with the bundled Tesseract.js runtime and language data. No external OCR service is used. OCR text is saved in the local library and may later be sent to the model endpoint you choose when you use it as session context.
- **AI headshots:** optional image-to-image generation sends the photo and style prompt only to a loopback Stable Diffusion WebUI endpoint on this device. The app blocks hosted image endpoints. The generated result is stored only when you choose Save.
- **Crash reports:** disabled by default. When enabled, crash metadata (process type, exit reason, exit code, app version, and time) is saved locally and limited to 20 crash files. Reports are never uploaded. Export is a user-initiated save action; delete all local data removes these reports.
- **Job-link import:** after you enter a URL and choose Import, the app requests that public HTTPS page from your computer to read its job metadata. The page is reviewed in an editable dialog and is not added to the form until you confirm. The URL/page is not sent to an AI provider by the import action; if you later use a model, the confirmed job description may be included in that model request.
- **Whisper.cpp speech mode:** audio capture starts only after you activate the visible recording control. The recording indicator/status is shown while capturing, tracks stop when recording stops, and the audio is sent to the configured loopback Whisper endpoint on this device for transcription. The app does not continuously capture microphone audio.
- **Browser speech-recognition mode:** recognition behavior and processing location are determined by the installed browser/runtime. It may use a remote speech service; choose local Whisper mode if that is not acceptable.
- **System speech output:** interviewer speech uses the operating system's speech synthesis and does not require uploading the generated text from this app.
- **Local Piper/Kokoro output:** if selected, the question text is sent to the loopback endpoint you configured and audio is returned to this device. The app rejects non-loopback hosts. The separate TTS service may have its own model-download behavior; see [local speech output setup](SPEECH_OUTPUT.md).

The operating system may show its own microphone permission prompt. You can revoke the permission in Windows Settings at any time. Audio capture starts only after you activate the recording control and stops when you stop recording or disconnect the interview.

## Deleting data

Use the in-app remove/delete actions for individual library items and sessions. **Settings → Local data → Delete all local data** clears saved sessions and preferences, both local IndexedDB databases (including imported documents, question-bank notes, and headshots), and the encrypted provider API key. The action requires confirmation and cannot be undone. This does not remove the application itself.

## Limitations

This document describes the current app behavior, not a legal guarantee or a substitute for the privacy policy of a model or speech provider you configure. Review the endpoint and its terms before sending sensitive data.
