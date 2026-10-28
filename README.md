# Fully Prepared

Version 1.0.0

An independent desktop foundation inspired by the publicly described workflow of ParakeetAI: a visible conversation cockpit with context capture, concise guidance, notes, preparation, and export.

## Run

```powershell
npm install
npm start
```

## Current scope

- **Call Sessions** dashboard with search, Interview/Regular/Mock filters, sorting, transcript actions, export, confirmed deletion, and interrupted-session resume
- Two-step session setup with company/role, session type, multi-select local resume/document context, and local draft recovery
- Live interviewer flow with model-generated questions, system speech, answer coaching, multilingual microphone input, and a local Whisper.cpp transcription bridge
- Ollama and OpenAI-compatible model discovery/chat through Electron's isolated main-process bridge
- Local Resumes and Documents libraries, explainable job-specific resume review (including offline English OCR for scanned PDFs), Question Bank, Resume Maker, and local Headshots crop plus optional local Stable Diffusion image generation
- Optional crash diagnostics are off by default and stay on device; reports contain allowlisted event metadata only and are exported only by explicit user action
- Local settings, drafts, and transcripts; provider API keys use Electron `safeStorage` when device encryption is available
- Electron security defaults: context isolation, no Node integration in the renderer, validated IPC, and microphone-only media permission

This is a local-first product foundation, not yet a publicly signed release. Version 1 uses manual updates; there is no background updater. Dashboard/navigation E2E is covered, but clean-account installation and real CPU/GPU model inference on target hardware remain release checks. Public Windows distribution requires the publisher's trusted code-signing certificate. See [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md), [docs/PROGRESS.md](docs/PROGRESS.md), [docs/PRIVACY.md](docs/PRIVACY.md), [docs/RELEASE_POLICY.md](docs/RELEASE_POLICY.md), [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md), and [docs/PERFORMANCE_BASELINE.md](docs/PERFORMANCE_BASELINE.md).

## Checks

```powershell
npm test
```

Tests use Node's built-in test runner and a local mock provider. They do not require an API key or make external requests.

## Windows portable package

On Windows, after `npm install`, run `npm run build:windows`. The self-contained package is written to `dist/fully-prepared-windows-portable`; it includes Electron, application dependencies, the Whisper.cpp runtime and base model, and applicable runtime notices. Run `Fully Prepared.exe` directly, or extract the package and run `install.ps1` for a per-user Start Menu installation. `uninstall.ps1` removes only the installed program after an explicit typed confirmation and leaves the Electron user profile (settings and saved data) intact. Choose a different output path inside `dist` when rebuilding; the build deliberately refuses to overwrite an existing package.

This portable build has been smoke-checked for required files and notices. It is not code-signed, does not auto-update, and has not yet had the install/uninstall flow validated on a clean Windows account. Review `resources/app/docs/THIRD_PARTY_NOTICES.md` and its release gates before redistribution.

The installer supplied for ParakeetAI is retained as a reference artifact. It is not copied, patched, or executed by this project.

## License

This project is released under the [MIT License](LICENSE).

## Repository notes

Generated dependencies and portable build outputs are intentionally excluded from Git. The Whisper model and packaged runtime archives are also excluded because GitHub's regular repository limit does not accept files larger than 100 MB. Install dependencies with `npm install` and follow the Windows portable-package instructions above to recreate local build artifacts.
