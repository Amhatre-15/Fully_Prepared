# Development progress

Updated: 2026-10-21

## Latest product foundation update — 2026-10-21

- Added bundled, offline English OCR for scanned PDFs (20 pages maximum), optional local Stable Diffusion WebUI img2img headshots, and opt-in local crash-report controls.
- Added a documented v1 manual-update policy and Windows signing workflow. No trusted publisher certificate is installed, so public release signing remains the single unchecked tracker item.
- Added repeatable CPU/automatic-accelerator benchmark profiles and recorded preparation/extraction measurements in `docs/PERFORMANCE_BASELINE.md`. Ollama was unavailable for this run, so actual model inference and device throughput have not been measured.
- `npm test`: 76 passed, 1 opt-in E2E skipped by default. `npm run test:e2e` passed against both the development app and the fresh Windows portable executable.
- Built `dist/fully-prepared-windows-portable-20261021` (about 0.63 GiB); inspected OCR, Whisper runtime/model, crash settings, and release documentation in the package.
- Current tracker: 153/154 complete (99.4%). Clean-account installer validation and Whisper provenance remain release gates even though they are not separate tracker checkboxes.
- Security audit follow-up: upgraded to patched Electron 41.10.6; full and production audits now show only three moderate findings in the single Mammoth → argparse → sprintf-js chain, with no high-severity findings. The forced Mammoth downgrade was not applied; see `docs/SECURITY_AUDIT.md`.
- Replaced the E2E test's hand-rolled WebSocket client with `chrome-remote-interface`; Electron 41.10.6 passes both development and portable-package navigation smoke tests.

Earlier entries in this file describe the state at their respective phases and may mention features later completed above.

## Session setup context improvements

- Added explicit Mock interview, Interview, and Regular call type selection and included it in saved/interrupted session records.
- Replaced single-choice context dropdowns with accessible multi-select lists for saved resumes and documents; selected IDs persist locally.
- Passes the selected local text to interviewer and answer-coach prompts as untrusted reference material, with a bounded context size and explicit prompt-injection handling.
- Added tests for session type validation, context-reference sanitization, and recovery behavior. Focused session/preparation tests pass 7/7; provider integration tests still depend on local mock-server connectivity in this execution environment.
- Manual in-app visual and end-to-end testing remains pending.

## Dashboard/session follow-up

- Replaced the always-inline session actions with an accessible native disclosure menu and preserved the primary transcript action.
- Fixed dashboard type filtering to distinguish Interview, Regular call, and Mock interview using saved session metadata.
- Made the answer-preferences panel available above the live interview view so answer style can be changed during a session.

## Session preferences and transcript usability

- Added nine language options and local persistence for the selected language and model; session records retain both values and interrupted sessions restore them.
- Model lists discovered from Ollama/OpenAI-compatible settings are reflected in the session model selector; saved model changes update the preference.
- Added accessible transcript text search with a no-match state and focus on open.
- Added a model preflight in session setup; the user must get a successful response from their selected endpoint before launching a live interview. Changing provider/model settings invalidates the previous test.
- Added a transcript debrief action using the configured model with prompt-injection-aware system guidance, a transcript-size cap, safe text rendering, hosted-endpoint disclosure, saved summary, and autosaved follow-up notes.
- Made transcript saving a real per-session preference: disabling it prevents message text from being written to active/completed session records while retaining session metadata. Unit tests cover this privacy boundary.
- Automated tests and syntax checks are being rerun after these changes; desktop GUI verification remains pending.

## Resume and document workspace

- Implemented on-device PDF, DOCX, and TXT text extraction behind the Electron main-process file picker; saved extracted text and metadata in IndexedDB.
- Added document search and preview, resume library actions, confirmed deletion, mock-session context selectors, and a role-specific resume review with a transparent 100-point rubric and recommendations.
- Review results and job-description inputs are saved per resume on this device. The interface explicitly describes the score as a text/structure heuristic, not an ATS or hiring prediction; scanned-PDF OCR is now supported locally, while robust semantic matching remains future work.
- Added focused resume-analysis and TXT/PDF/DOCX extraction tests. `npm test` passed 13/13, including the localhost provider IPC suite. `npm audit --omit=dev` reports 0 production vulnerabilities; the full tree still flags the existing Electron development toolchain and a breaking-major upgrade was not applied.

## Session lifecycle verification

- Fixed fresh sessions inheriting the static demo messages: the transcript is now cleared before a new local session record is created.
- Fixed Disconnect returning to the preferences wizard; it now returns to Call Sessions after the active session is completed and saved.
- Extracted session-state transitions into a small testable module. Tests cover session initialization, active-to-interrupted recovery, malformed record/message handling, transcript snapshots, elapsed-time retention, and completion.
- The GUI/microphone/model end-to-end journey still needs manual verification in the actual Windows desktop app; state-transition unit tests are not a substitute for that smoke test.
- Current release checkpoint (2026-10-21): a Windows portable package was built with app dependencies, Whisper server/base weights, and Electron/Chromium notices; per-user install/uninstall scripts are included. The full automated suite passes 64/64. Package and notice presence are verified, but clean-account installation, signing, updates, real-device microphone QA, and release provenance review remain pending.
- Latest full run: `npm test` passed 16/16. The app launched, but Windows inspection exposed three same-titled Fully Prepared windows; the UI automation safety workflow requires a unique target, so no window was clicked. Resolve duplicate app windows before the manual smoke test.

## Preparation workspaces

- Built the Question Bank with a starter set of interview prompts, categories/tags, search, category/saved filters, custom questions, favorites, practice status, and local notes.
- Built the Resume Maker with a local auto-saved draft, live plain-text preview, input checks, TXT download, and a save-to-Resumes action so its output can use the existing job-specific review.
- Added a polished A4 PDF export for Resume Maker. It renders only the user-entered resume fields, escapes markup, and uses the native Save dialog; the PDF is generated locally.
- Added an IPC-side trust boundary for model prompts that explicitly mark inputs as untrusted: user-role content is wrapped as bounded JSON reference data before network/local-provider dispatch. Added tests for oversized hostile text and unchanged ordinary prompts; this is defense-in-depth, not a guarantee against model prompt injection.
- Verification after the PDF and prompt-boundary work: `npm test` passed 33/33; GUI PDF print verification remained outstanding at that checkpoint.
- Added a bounded single retry for transient provider connection setup failures, main-process cancellation for the latest in-flight model request, and a visible live-interview “Cancel response” control. Provider errors and model response failures are not retried. Mock IPC tests cover retry and cancellation.
- Latest verification: `npm test` passed 35/35; syntax checks passed for main, preload, and renderer. Tracker stands at 115/152 (75.7%), with 37 unchecked items; live app and real-model UI verification are still outstanding.
- Built Headshots as an honest local photo utility: import an existing JPEG/PNG/WebP, adjust its square crop, save/download a 512 × 512 JPEG, and manage multiple local copies. No AI image generation or background removal is claimed.
- Added data-layer tests for resume output/validation and custom-question normalization. Latest `npm test` passed 19/19. Screens have not been click-tested because the visible Windows app list contains three identical-title windows; photo picker and microphone also still need user-device verification.

## Completed in this phase

- Added an About panel in settings with a version read from Electron at runtime and a concise local-first product summary.

- Added a confirmed Settings action to erase all app-origin IndexedDB stores, localStorage/sessionStorage, and the encrypted provider key. It is styled as a destructive action, explains its scope, and does not remove the app itself.

- Added default-on local-only mode for model discovery/chat. The Electron main process rejects non-loopback endpoints and redirects when enabled; hosted access requires explicit confirmation, with a clear warning about job/resume/document text leaving the device.

- Fixed the live-session Pause/Resume flow: pause state is persisted in the active session, microphone tracks and speech are stopped, answer controls are disabled, and the session timer freezes. Resume restores controls and repeats the current question. Session recovery clears stale paused state and reopens as interrupted.

- Connected the Auto Generate toggle as a persisted, explicit opt-in. It drafts model responses after interviewer questions, keeps speech/user action under the candidate's control, and restores the choice for interrupted sessions.

- Added push-to-talk audio capture, persisted language selection, and an offline-first Whisper.cpp-compatible transcription bridge. The app routes audio through Electron IPC and accepts only HTTP loopback endpoints; recording is size-limited and voice state is announced accessibly.
- Added a setup guide explaining model selection and local server requirements. GUI/device transcription verification remains outstanding.

- Audited the existing Electron app structure and the visible workflows. The application is plain HTML/CSS/JavaScript with Electron IPC; it has no database or separate backend server.
- Fixed the mock-session Answer action so one click requests a suggestion for the latest interviewer question. A previous handler inserted canned text that was then mistakenly used as the model prompt.
- Changed live transcript rendering to create text nodes, keeping model output, user-entered messages, and errors from being parsed as HTML.
- Connected model discovery and chat to Ollama and OpenAI-compatible endpoints through Electron IPC, with endpoint/message validation and a 120-second request timeout.
- Moved newly saved API keys into Electron `safeStorage`; added migration for existing localStorage keys when device encryption is available.
- Added explicit settings copy explaining that hosted endpoints receive submitted text.
- Added five provider IPC integration tests using a local mock server, including encryption-unavailable handling and temporary API-key use during a connection test.
- Updated interviewer prompts to ignore instructions embedded in job descriptions or candidate answers.
- Implemented locally persisted answer format, length, tone, and question-type preferences and applied them to answer-coach requests.
- Replaced the browser prompt for interviewer guidance with an in-app dialog supporting edit, remove, Escape, focus return, and keyboard focus cycling.
- Added interrupted-session detection and a Resume action, plus text export and confirmed per-session deletion from history cards.
- Completed session-history card metadata with a type badge, elapsed duration, date, and status; sorting now uses the stored timestamp field, and disconnect persists the final elapsed time.
- Persisted session messages and elapsed time on transcript updates, pause/stop, and app window close.
- Created `docs/FEATURE_STATUS.md` with implementation states, evidence, and outstanding work.

## Files modified

- `src/renderer.js`
- `src/index.html`
- `main.cjs`
- `preload.cjs`
- `package.json`
- `test/provider-ipc.test.cjs`
- `docs/SPEECH_TRANSCRIPTION.md`
- `README.md`
- `src/styles.css`
- `tracker.md`
- `docs/FEATURE_STATUS.md`
- `docs/PROGRESS.md`

## Checks and results

- Automated tests: `npm test` passed 6/6 (Ollama and OpenAI-compatible mock-server paths, local multipart transcription adapter, endpoint/input validation, IPC origin checks, and API-key encryption availability behavior).
- Lint/type-check/build scripts: unavailable.
- JavaScript syntax check: passed for `src/renderer.js`, `main.cjs`, and `preload.cjs`.
- Startup: `npm start` invoked Electron without an immediate startup error. GUI end-to-end verification was unavailable because computer inventory returned no running app windows. No real hosted account/API key was provided.

## Remaining issues

- Provider requests work against local mock services; a live hosted endpoint still needs verification with the user's provider and key.
- GUI verification of the create, preference, resume, export, delete, and transcript flows remains pending.
- Bundled Whisper.cpp CPU server and multilingual base model for Windows development; it starts lazily and recordings are converted to WAV in-app. Actual microphone transcription and speech accuracy have not yet been device-tested.
- Verified the runtime archive and model checksums, server startup on loopback, WAV `/inference` response, and all six provider IPC tests. Relaunched the desktop app with the new runtime; mic permission and real microphone capture still need a manual test in the app window.
- GUI verification of the new interrupted-session recovery, export, and deletion actions remains pending.
- Legacy API keys may remain in localStorage if device encryption is unavailable; new key saves fail clearly instead of writing plaintext.
- Question bank, resume maker, and headshots remain navigation placeholders; there is no production packaging or release workflow.

## Next highest-priority task

Verify the local Whisper capture-to-follow-up flow with a real server/model, then implement engine/model setup management and the remaining preparation pages.
