# Local interviewer speech output

The default output uses Windows-installed speech voices. Optional Piper and Kokoro providers can also be selected in **Configure model → Voice input → Question voice provider** when their local HTTP services are installed and running.

| Provider | Default endpoint | Default voice/model | Service contract |
|---|---|---|---|
| Piper | `http://127.0.0.1:5000/v1/audio/speech` | `en_US-lessac-medium` | Local Piper OpenAI-compatible HTTP server; WAV response |
| Kokoro | `http://127.0.0.1:8880/v1/audio/speech` | `af_sky` | Local Kokoro-FastAPI OpenAI-compatible speech endpoint; WAV response |

Only loopback HTTP endpoints are accepted by the app. The app does not install TTS servers or download voice/model files. Some third-party Piper server setups download a requested voice if it is not cached yet; inspect that server's configuration and preload the voice if you need a fully offline first run. Verify any third-party service before connecting it.

Use **Preview voice** to check the local connection. The selected service receives the interview question text you choose to speak. **Stop speech** cancels queued speech and stops current playback. If the service is unavailable, the interview remains usable with Windows system speech or without spoken output.

Setup references: [Piper OpenAI TTS HTTP server](https://github.com/Kamil-Krawiec/piper-tts-http-server), [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI).
