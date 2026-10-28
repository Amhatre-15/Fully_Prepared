# Dependency security audit

Audit date: 2026-10-21. Checked against the npm registry with both `npm audit` and `npm audit --omit=dev`.

## Results and action taken

- Upgraded Electron from 38.8.6 to 41.10.6. This is above the affected Electron range reported by npm for the high-severity Electron advisories. The updated development build and rebuilt portable package both passed the dashboard/navigation E2E smoke test.
- The current full and production-only audits report three moderate findings in one dependency chain: Mammoth 1.13.0 → argparse 1.0.10 → sprintf-js 1.1.3. The advisory is [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), concerning denial of service from unbounded precision specifiers.
- npm's proposed `npm audit fix --force` resolution downgrades Mammoth to 0.3.29. That breaking downgrade was not applied. The app calls only Mammoth's `extractRawText` library API; `argparse` is referenced by Mammoth's separate CLI executable, not its library entry point. Nevertheless, npm includes the chain in the production audit, so it remains a dependency advisory and should be revisited when a compatible Mammoth release or safe override is available.
- No high-severity findings remain in the registry audit after the Electron upgrade. Do not describe the dependency tree as vulnerability-free while the moderate finding remains.

## Reproduction

```powershell
npm audit
npm audit --omit=dev
```

`npm audit fix --force` is intentionally not part of the routine remediation path because it makes a breaking Mammoth downgrade. Re-evaluate the remaining advisory when updating document extraction dependencies.
