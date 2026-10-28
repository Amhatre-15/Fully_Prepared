# Third-party software notices

This inventory is for the current source checkout, audited 2026-10-21. It is not legal advice. Re-run the audit whenever dependencies or bundled binaries change, and have counsel review the final distribution.

## Runtime and application dependencies

| Component | Version / license recorded in this checkout | Notice source |
|---|---|---|
| Electron | 41.10.6 · MIT | `node_modules/electron/LICENSE`; Chromium and other embedded components: `node_modules/electron/dist/LICENSES.chromium.html` |
| Mammoth | 1.13.0 · BSD-2-Clause | `node_modules/mammoth/LICENSE` |
| PDF.js | 6.4.299 · Apache-2.0 | `node_modules/pdfjs-dist/LICENSE` |
| Tesseract.js | 7.0.0 · Apache-2.0 | License identifier in `node_modules/tesseract.js/package.json`; upstream license text: `https://github.com/naptha/tesseract.js/blob/master/LICENSE.md` |
| tesseract.js-core | Exact version and Apache-2.0 are recorded in `package-lock.json` | `node_modules/tesseract.js-core/LICENSE` |
| English OCR traineddata | MIT | `node_modules/@tesseract.js-data/eng` |
| Transitive npm packages | Exact versions and SPDX expressions are recorded in `package-lock.json` (the current lockfile has license metadata for every package entry). Preserve the packages' license files when redistributing their code. Notable multi-option/combined expressions include JSZip (MIT OR GPL-3.0-or-later), pako (MIT AND Zlib), and type-fest (MIT OR CC0-1.0). | `package-lock.json` plus each package's upstream license file |

Electron's own MIT notice and its generated Chromium notices are separate files; retain both in any packaged application. The development Electron distribution currently contains both files.

## Bundled speech runtime and weights

| Component | Source / license | Included notice |
|---|---|---|
| whisper.cpp Windows runtime and ggml libraries | Official `whisper-bin-x64.zip` release family from [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp), MIT. The exact upstream release tag was not preserved with the archive; pin and record it before a public release. | `vendor/whisper/Release/LICENSE` |
| SDL2 Windows runtime (`SDL2.dll`) | SDL 2.0, zlib license; the local DLL reports version 2.28.5. | `vendor/whisper/Release/SDL2-LICENSE.txt` |
| Whisper `ggml-base.bin` model | OpenAI Whisper model project, MIT; see [openai/whisper](https://github.com/openai/whisper). Verify the exact model artifact provenance/hash when updating it. | MIT terms linked from the upstream project; include the applicable notice with any redistributed weights. |

The Windows portable build copies all files from `vendor/whisper/Release`, so the adjacent whisper.cpp and SDL2 notice files are included with that resource. It also includes Electron's `LICENSE`, `LICENSES.chromium.html`, npm dependency packages (and their package license files), and this document. The installer scripts themselves have not yet been validated on a clean Windows account.

## Release gate

The vendored whisper archive has no version tag recorded alongside it. The current license notice is sourced from the official upstream project, but the exact source commit/tag and full binary bill of materials have not been independently attested. Do not represent this as a completed legal review or ship a release until that provenance is pinned and the final installer is checked to contain all applicable notices.
