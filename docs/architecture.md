# Architecture

The calculator has one calculation core and multiple interfaces.

```text
                 ┌───────────────────────┐
                 │ src/core/calculation  │
                 │                       │
                 │ environment           │
                 │ problem               │
                 │ service               │
                 └───────────┬───────────┘
                             │
               ┌─────────────┴─────────────┐
               │                           │
     ┌─────────▼─────────┐       ┌────────▼────────┐
     │ interfaces/web    │       │ interfaces/cli  │
     │ Worker transport  │       │ argv / JSON /   │
     │ React hooks call  │       │ stdin / stdout  │
     │ the core problem  │       │ validation      │
     └───────────────────┘       └────────┬────────┘
                                          │
                                  scripts/calc.ts
```

## Dependency rule

- `src/core/calculation` may depend on game data, domain types, and pure solver/helper modules.
- Core must not import React, DOM APIs, Node `fs`/`process`, CLI parsing, or worker transport.
- Interfaces translate their environment into core inputs and format core outputs.
- Both GUI and CLI build solver options through `buildCalculationProblem`.
- Browser worker scheduling and the worker entry live in `src/interfaces/web/` (`calc-client.ts` + `calc.worker.ts`).
- CLI parsing/validation/output lives in `src/interfaces/cli/`.
- `scripts/calc.ts` is only a process bootstrap.

## Compatibility shims

`src/lib/calc-client.ts`, `src/lib/calc-environment.ts`, and the legacy
`src/workers/calc.worker.ts` entry currently forward to their new locations. They exist only to avoid breaking downstream imports and
should not receive new logic.

## Why this boundary

The web app and CLI previously assembled parts of the same solver problem
independently. That creates configuration drift: a setting can work in one
interface but not the other. The core facade makes the solver problem and site
environment shared; interfaces only decide how users provide input and how
results are presented.
