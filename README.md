<div align="center">

<img src="docs/assets/fully-prepared-app-logo.svg" alt="Fully Prepared parrot logo" width="128" />

# Fully Prepared

### Your AI-powered placement preparation cockpit

Practice interviews, polish your resume, and prepare for the opportunities ahead.

[![Version](https://img.shields.io/badge/version-1.0.0-17233D?style=for-the-badge)](https://github.com/Amhatre-15/Fully_Prepared/releases/tag/v1.0.0)
[![Tests](https://img.shields.io/badge/tests-76%20passing-5ED8B2?style=for-the-badge)](https://github.com/Amhatre-15/Fully_Prepared)
[![License: MIT](https://img.shields.io/badge/license-MIT-FFB86B?style=for-the-badge)](LICENSE)

</div>

## What it is

Fully Prepared is a local-first placement preparation platform for students and job seekers. It brings AI mock interviews, resume improvement, question-bank practice, document context, and personal preparation workflows into one focused desktop app.

The goal is simple: help you move from “I found a role” to “I am ready for the interview” with structured practice and practical feedback.

## Placement preparation toolkit

- **AI mock interviews** — Rehearse realistic Interview, Regular, and Mock sessions with spoken questions, answer coaching, multilingual microphone input, and local Whisper.cpp transcription.
- **Resume polishing** — Import resumes and job descriptions, review role-specific alignment, identify uncovered requirements, and create a clearer, truthful resume without inventing experience.
- **Question Bank** — Build and practice questions for common interviews, target roles, companies, and personal weak spots.
- **Placement workspace** — Keep resumes, documents, transcripts, session notes, and preparation drafts organized in one searchable local workspace.
- **Job-specific preparation** — Select a company, role, resume, and supporting documents to ground each practice session in the opportunity you are targeting.
- **Local-first AI** — Connect Ollama or another OpenAI-compatible endpoint through Electron's isolated main-process bridge; use local models when you want preparation data to stay on your device.
- **Privacy-minded defaults** — Local settings, drafts, and transcripts; API keys use Electron `safeStorage` where device encryption is available; crash diagnostics are opt-in and allowlisted.
- **Secure desktop foundation** — Context isolation, no Node integration in the renderer, validated IPC, and microphone-only media permission.

## Roadmap

The foundation is designed to grow into a complete placement companion. Planned capabilities include:

- Relevant-job discovery based on skills, resume, location, and target roles
- Job-fit scoring and preparation plans for saved opportunities
- Assisted job-application workflows with review-before-submit controls
- Application tracking, deadlines, reminders, and follow-up preparation
- More role-specific interview packs and placement analytics

Job discovery and application automation are future capabilities, not active background automation in version 1.0.

## Quick start

```powershell
npm install
npm start
```

Run the automated checks with:

```powershell
npm test
```

The test suite uses Node's built-in test runner and a local mock provider. It does not require an API key or make external requests.

## Windows portable package

After `npm install`, build the portable package with:

```powershell
npm run build:windows
```

The package is written to `dist/fully-prepared-windows-portable`. It includes Electron, application dependencies, the Whisper.cpp runtime, and applicable runtime notices. Run `Fully Prepared.exe` directly, or extract the package and run `install.ps1` for a per-user Start Menu installation.

The portable build is not code-signed, does not auto-update, and has not yet been validated on a clean Windows account. Review the release gates in [`docs/RELEASE_POLICY.md`](docs/RELEASE_POLICY.md) before redistribution.

## Project status

Version 1.0 focuses on the core placement-preparation experience: mock interviews, resume workflows, document context, and question practice. Dashboard/navigation E2E coverage is included, while clean-account installation and real CPU/GPU model inference on target hardware remain release checks. Public Windows distribution requires the publisher's trusted code-signing certificate.

More detail:

- [`docs/FEATURE_STATUS.md`](docs/FEATURE_STATUS.md) — feature readiness
- [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) — user workflows
- [`docs/PRIVACY.md`](docs/PRIVACY.md) — data handling
- [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) — security notes
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — development progress
- [`docs/THIRD_PARTY_NOTICES.md`](docs/THIRD_PARTY_NOTICES.md) — dependency notices

## Repository notes

Generated dependencies and portable build outputs are intentionally excluded from Git. The Whisper model and packaged runtime archives are excluded because GitHub's regular repository limit does not accept files larger than 100 MB. Install dependencies with `npm install` and recreate local build artifacts with the commands above.

## License

Fully Prepared is released under the [MIT License](LICENSE).

<div align="center">

Made for clearer thinking when the conversation matters.

</div>
