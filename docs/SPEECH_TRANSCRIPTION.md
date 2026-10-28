# Local speech transcription

Fully Prepared captures a spoken answer and transcribes it locally with Whisper.cpp. The Windows development build includes the CPU server and multilingual `base` model. Audio stays on the device and is sent only to a loopback endpoint through Electron's main process; remote hosts are rejected. The bundled service starts on the first local transcription request, binds to `127.0.0.1`, and is stopped when the app exits.

## Recommended setup

1. No separate Whisper or FFmpeg install is needed in this Windows development checkout. The app converts recordings to 16 kHz WAV before sending them, so server-side audio conversion is not required.
2. For English and Hindi, the bundled model is multilingual `base` (`ggml-base.bin`), not `base.en` (English-only). Upstream lists it at about 142 MiB. If you prefer higher accuracy and can spare more memory/compute, the multilingual `small` model is about 466 MiB.
3. The app starts its server lazily on `127.0.0.1:8080` when a recording is sent. To run it manually for diagnostics:

   ```powershell
   .\whisper-server.exe --model .\ggml-base.bin --host 127.0.0.1 --port 8080 --no-gpu
   ```

   The server's `--convert` option requires FFmpeg to be present for the browser's WebM/Opus recording format. Do not expose the server on a public interface; it receives microphone audio.

4. In Fully Prepared, open **Configure model** → **Voice input**, select **Local Whisper.cpp server (offline)**, and set `http://127.0.0.1:8080` if using another port.
5. Start a mock interview. Press the microphone button to record an answer and press it again to stop and transcribe. The recognized text is added to the transcript and the interviewer asks a follow-up.

The language selector supports automatic detection plus English, Hindi, Spanish, French, German, Portuguese, Japanese, Korean, and Chinese. Its selection is saved locally.

## Current limitations

- The Windows development checkout contains upstream Whisper.cpp runtime files and the `base` weights in `vendor/whisper/Release`. Production packaging still needs an installer/download strategy for those roughly 160 MiB of assets.
- Local Whisper records a complete answer before transcription. Browser speech-recognition fallback shows interim captions while listening, then submits only finalized text; browser processing may use a remote service depending on the runtime.
- For the default port, the app starts the bundled server automatically. If a different endpoint/port is configured, that service must already be running.
- Browser speech recognition is an optional fallback and may depend on browser/platform services; choose the local Whisper mode for local processing.
- The main-process bridge limits uploads to 20 MB and permits only HTTP loopback endpoints.

Upstream references: [Whisper.cpp Windows support and server options](https://github.com/ggml-org/whisper.cpp), [server API and `--convert` requirement](https://github.com/ggml-org/whisper.cpp/blob/master/examples/server/README.md), and [model names/sizes](https://github.com/ggml-org/whisper.cpp/blob/master/models/README.md).
