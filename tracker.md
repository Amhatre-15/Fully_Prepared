# Fully Prepared implementation tracker

This is the living checklist for the independent Fully Prepared desktop app. The target is a free, local-first, user-configurable product with similar workflows to the observed ParakeetAI experience, using original code, branding, visuals, and prompts.

Progress snapshot (2026-10-21): 153 of 154 tracked items complete (99.4%). The remaining item is signing a public release with the publisher's trusted certificate, which is not present in this workspace. Current verification: 76 automated tests pass; the Electron dashboard/navigation E2E passes; Windows portable packaging is being refreshed with offline OCR and local headshot generation. See the latest verification details below.

## Product foundations

- [x] Electron desktop shell
- [x] Fully Prepared branding and dashboard layout
- [x] White dashboard with sidebar navigation
- [x] Free-first positioning with no credits or subscriptions
- [x] Local model settings screen
- [x] Ollama endpoint connection test
- [x] Ollama installed-model discovery
- [x] OpenAI-compatible/custom endpoint fields
- [x] Persist all app settings safely and validate malformed values
- [x] Add app-level error notifications and logging
- [x] Add first-run onboarding
- [x] Add keyboard shortcuts and accessibility labels

## Dashboard and navigation

- [x] Call Sessions dashboard
- [x] Create Session action
- [x] Preparation-page navigation and destinations
- [x] Session filters: All, Interview, Regular, Mock
- [x] Search sessions by role or company
- [x] Sort sessions
- [x] Session cards with type and duration, alongside current local metadata
- [x] Local session cards with date, status, and transcript action
- [x] Session actions menu
- [x] Trust/announcement card dismissal state
- [x] Theme preference with real light/dark styling

## Create session: details

- [x] Two-step mock interview shell
- [x] Company field
- [x] Offline company autocomplete with domains
- [x] Job description field
- [x] Paste job-link entry point
- [x] Resume/document context placeholders
- [x] Interview / Regular / Mock session type selection
- [x] Public HTTPS job-link metadata parser with editable preview and explicit user confirmation
- [x] Local company suggestions use a replaceable provider contract
- [x] Resume PDF, DOCX, and TXT import, readable-text validation, and local indexing
- [x] Document import for job specs, notes, and supporting files
- [x] Multi-select context picker
- [x] Form validation and draft recovery

## Create session: preferences

- [x] Language selector shell
- [x] Ollama model selector shell
- [x] Answer preferences entry point
- [x] AI instructions entry point
- [x] Auto-generate toggle shell
- [x] Save transcript toggle shell
- [x] Populate language options and persist selection
- [x] Populate selected model from Ollama/custom provider settings
- [x] Test model before creating a session
- [x] Add/edit/remove AI instructions
- [x] Implement auto-generate behavior with an explicit consent/state indicator
- [x] Save and restore session preferences

## Answer preferences

- [x] Format / Length / Tone layout
- [x] Answer preview layout
- [x] Question type selector
- [x] Save action shell
- [x] Implement script, bullets, and concise formats
- [x] Implement short, balanced, and detailed lengths
- [x] Implement simple, professional, and conversational tones
- [x] Implement behavioral, technical, and situational templates
- [x] Use preferences in the model prompt
- [x] Allow preference changes during a live session

## Live mock interview

- [x] Live interview visual shell
- [x] Interviewer panel
- [x] Message history shell
- [x] Stop, clear, disconnect, language, and answer controls
- [x] Manual message composer shell
- [x] Request microphone permission and connect the selected input device
- [x] Push-to-talk capture and local-only Whisper.cpp transcription bridge
- [x] Bundle/manage local Whisper.cpp engine and base model with packaged assets and opt-in diagnostics startup
- [x] Interview question generation with Ollama
- [x] Spoken interviewer responses using local system speech
- [x] Stream partial browser transcription captions; submit only finalized speech text
- [x] Generate answer suggestions from transcript and job context
- [x] Manual answer submission to the model
- [x] Auto-generate mode
- [x] Pause/resume session state
- [x] Suspend audio capture, speech, timer, and answer controls while paused
- [x] Elapsed timer and session status
- [x] Audio device selector
- [x] Visible microphone connection state and privacy controls
- [x] No hidden or stealth capture behavior

## AI and model pipeline

- [x] Ollama chat request adapter
- [x] OpenAI-compatible chat adapter
- [x] Custom endpoint support through the OpenAI-compatible API contract
- [x] Model request timeout
- [x] Retry one transient connection failure and cancel the current model request from the live interview UI
- [x] Central prompt templates for interviewer, answer coach, and summarizer
- [x] Bound combined model context by a configurable character budget while preserving system instructions and newest messages
- [x] Local-only mode enforcement
- [x] User-visible model/provider and request status in the live interview header
- [x] Model response streaming
- [x] Treat job, resume, document, and transcript user-message payloads as bounded untrusted reference data when the prompt template marks a trust boundary
- [x] Add adversarial prompt-injection evaluation and safe handling of model-generated HTML/markup

## Voice pipeline

- [x] Local speech-to-text provider interface (Whisper.cpp-compatible loopback endpoint)
- [x] First STT provider adapter: whisper.cpp `/inference` API
- [x] Bundle/manage speech server, WAV conversion, and multilingual base model for Windows development
- [x] Add UI selection for user-supplied optional speech model files (the app does not download weights)
- [x] Optional higher-capacity STT model selection with accuracy/memory tradeoff guidance
- [x] Text-to-speech provider interface with bounded queued playback and stop control
- [x] First TTS provider: installed Windows system voices through Web Speech API
- [x] Optional Piper provider via a local OpenAI-compatible Piper service (default `en_US-lessac-medium` voice)
- [x] Optional Kokoro provider via a local Kokoro-FastAPI-compatible service
- [x] Voice selection and preview
- [x] Audio playback queue
- [x] Voice model download/setup guidance
- [x] CPU/GPU capability detection with local-only device information
- [x] Offline voice diagnostics for bundled engine/model availability and local service status

## Transcripts and history

- [x] Save transcript locally
- [x] Session metadata storage
- [x] Active mock transcript persistence on this device
- [x] View saved transcript modal
- [x] Search transcript
- [x] Copy/export transcript
- [x] Delete session with confirmation
- [x] Resume an interrupted session
- [x] Session summary and follow-up actions

## Privacy and security

- [x] Explain microphone capture, transcription destination, and model data flow before first use
- [x] Explain document extraction/storage and potential model sharing before first import
- [x] Store API keys using Electron safeStorage encryption when available
- [x] Keep local model traffic local by default
- [x] Show exactly when audio or text leaves the device
- [x] Redact sensitive data in privacy-safe diagnostics; omit transcripts, documents, endpoints, and keys
- [x] Protect imported files from arbitrary execution (supported extensions only; PDF JS evaluation disabled; text-only extraction)
- [x] Provide clear data deletion controls
- [x] Add privacy policy and local-data documentation

## Packaging and sellable release

- [x] Windows portable production build with application/runtime dependencies and local speech assets
- [x] Per-user installer and explicit-confirmation uninstaller scripts; preserve user profile data
- [ ] Code signing
- [x] Auto-update strategy (manual signed-package updates documented for v1; no background updater)
- [x] Crash reporting opt-in (off by default, local allowlisted event metadata, explicit export/delete)
- [x] Version/about screen
- [x] Offline portable installation path (include Whisper binaries and multilingual base model)
- [x] First-run model setup wizard
- [x] End-to-end smoke tests (Electron dashboard and preparation navigation)
- [x] Performance harness for CPU-only and automatic-accelerator profiles (hardware inference timing remains a release validation gate)
- [x] Product documentation
- [x] Third-party notice inventory and bundled Whisper/SDL2 license notices; installer notice verification remains a release gate

## Current implementation priority

1. Obtain the publisher's trusted code-signing certificate and sign/verify final release binaries.
2. Run clean-account installer validation and record CPU-only plus accelerated Ollama timings on representative target hardware.
3. Confirm Whisper.cpp source/archive provenance and preserve all third-party notices before redistribution.

See [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md) for the audited implementation state and [docs/PROGRESS.md](docs/PROGRESS.md) for phase notes.

### Resumes and documents

- [x] Local resume and document libraries with add, search (documents), extracted-text preview, and confirmed remove
- [x] Extract readable text from PDF, DOCX, and TXT files on-device
- [x] Job-specific resume review with a transparent 100-point rubric, evidence, missing terms, and practical advice
- [x] Persist library items and the most recent review in the app's local IndexedDB store
- [x] Offline English OCR support for scanned/image-only PDFs (20-page cap)
- [x] Limited, explicit verb-synonym matching with evidence and disclosed heuristic caveat (not full semantic/context scoring)

## Question Bank

- [x] Seeded interview question library with categories and tags
- [x] Search and category filtering with useful no-results state
- [x] Custom question add/remove with validation
- [x] Save/favorite questions and keep local practice notes/status

## Resume Maker

- [x] Local draft form with contact, headline, summary, experience, education, and skills
- [x] Live text preview and local draft recovery
- [x] Download resume as text and save to the Resumes library for job-specific review
- [x] Professionally styled A4 PDF export from the local resume draft, with safe text rendering and save-location picker
- [x] Additional resume templates and PDF layout customization (Modern, Classic, Compact)
- [x] AI-assisted resume-summary drafting from supplied facts with explicit review/apply and a no-invented-claims prompt

## Headshots

- [x] Import an existing local JPEG, PNG, or WebP photo with format and size checks
- [x] Adjust a square crop and save/download a 512×512 JPEG locally
- [x] Keep multiple local versions and remove them with confirmation
- [x] Optional AI portrait generation through a user-configured local Stable Diffusion WebUI img2img service (no remote image endpoint)

## Latest completion and validation (2026-10-21)

- 153/154 checklist items complete (99.4%); publisher certificate-based code signing is the sole unchecked tracked item.
- Offline OCR for image-only PDFs uses bundled English trained data, processes at most 20 pages, and does not upload documents.
- Optional headshot generation talks only to a validated loopback Stable Diffusion WebUI endpoint; source image and result remain local.
- Crash reports are opt-in, local-only, allowlisted metadata with explicit export and deletion controls.
- Version 1 update policy is manual signed-package distribution; no silent/background updater is present.
- Verification: `npm test` — 76 passed, 1 opt-in E2E skipped; `npm run test:e2e` — passed against development and portable builds; focused OCR/headshot/crash/performance tests — 17 passed.
- Dependency audit: upgraded Electron to patched 41.10.6, eliminating high-severity Electron advisories. A moderate Mammoth → argparse → sprintf-js advisory remains; see `docs/SECURITY_AUDIT.md`.
- CPU core-workload timings and target machine details are recorded in `docs/PERFORMANCE_BASELINE.md`. Ollama was not running during this run, so actual CPU/GPU model inference and target-hardware throughput remain release validation gates.
