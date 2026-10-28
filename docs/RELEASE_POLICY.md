# Windows release policy

This project does not have a publisher certificate or a release hosting account configured in the development workspace. The policy below defines what the local tooling supports and what a publisher must supply.

## Signing

Use `scripts/sign-windows.ps1` with a trusted code-signing certificate installed in the current Windows user's certificate store, including its private key, and the Windows SDK `signtool.exe`. The script checks the certificate's code-signing use, signs the app and bundled Whisper server with SHA-256, timestamps the signature, and verifies both signatures. Never distribute a public build before signing with the publisher's valid certificate. A self-signed certificate is not an acceptable substitute for public distribution.

## Version 1 updates

Version 1 uses manual updates: publish each signed portable package at the project's release page with a SHA-256 checksum and release notes. The app does not contact an update server or install updates in the background. Revisit an in-app updater only after the project has a stable HTTPS release host, signed artifacts, a signed update manifest, downgrade/rollback handling, and a documented recovery process.

## Crash reports

Crash capture is off by default. If enabled, small event-only reports stay local and are never uploaded. A user must choose Export report to share a report. Users can turn capture off and delete saved reports in settings.

## Performance checks

`npm run benchmark:cpu -- --model <installed-model>` forces Ollama's CPU path; `npm run benchmark:gpu -- --model <installed-model>` lets Ollama choose an available accelerator. Both run only a fixed harmless prompt against a loopback endpoint, report timing and token rate, and include repeatable local CPU preparation workloads. Record target-device results with the hardware and Ollama/model versions before a public release. Without `--model`, each command measures only the app's local preparation and text-processing code.

## Manual release gates

- Install and uninstall on a clean Windows account.
- Run the automated desktop navigation smoke test with `npm run test:e2e`.
- Measure both local model profiles on representative CPU-only and GPU hardware.
- Preserve every third-party notice and record the exact Whisper binary provenance.
- Sign the distributable with the publisher's production certificate and verify the final output.
