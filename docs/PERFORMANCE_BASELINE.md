# Local performance baseline

Recorded 2026-10-21 (Asia/Kolkata) with Node.js on Windows x64. Device: Intel Core i7-14650HX, 24 logical processors, 23.6 GiB RAM. Each core workload ran 100 iterations.

| Local workload | CPU profile total / average | Automatic-accelerator profile total / average |
| --- | ---: | ---: |
| Role-specific resume review | 7.03 ms / 0.070 ms | 6.93 ms / 0.069 ms |
| Bounded model-context budgeting | 1.17 ms / 0.012 ms | 1.08 ms / 0.011 ms |
| UTF-8 document extraction (about 110 KB input) | 18.93 ms / 0.189 ms | 17.36 ms / 0.174 ms |

The profile commands were run as `npm run benchmark:cpu` and `npm run benchmark:gpu`. With no model argument, they measure only the app's CPU preparation and text-processing workloads. Ollama was not running, so no CPU-only or GPU-accelerated model inference timings were collected. To measure inference with an installed model, start Ollama and run `npm run benchmark:cpu -- --model <model-name>` and `npm run benchmark:gpu -- --model <model-name>`. Results are hardware-, model-, and backend-dependent; do not compare them as if they were measured on this device.

The timings are local developer measurements, not a performance guarantee. Public release validation should repeat inference tests on representative CPU-only and GPU systems and record model/backend versions.
