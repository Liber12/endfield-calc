# Calculation architecture

The calculator is split into a reusable calculation core and replaceable
interfaces.

```
React UI ──> Web calculation interface ─┐
                                       ├──> Calculation core ──> solver/data
CLI ──────> CLI interface ─────────────┘
```

## Core

`src/core/` owns application/domain calculation semantics and must not depend
on React, DOM APIs, command-line arguments, stdin/stdout, or presentation
formatting.

- `site-environment.ts` resolves the site state used by a solve: domains,
  AIC research, structures, available recipes, raw/facility caps,
  Metastorage, recipe overrides, manual raws, self-power, and gas coverage.
- `calculation-service.ts` owns the meaning of the public calculation
  commands: `plan`, priority-`max`, and `fit`.
- `index.ts` is the public core boundary new callers should import.

The lower-level solver modules in `src/lib/` remain implementation modules for
now. Moving those files physically is intentionally deferred; callers should
prefer the `src/core` API so that move can happen without another interface
rewrite.

## Web interface

`src/interfaces/web/` owns browser-specific solver transport.

- `calc-client.ts` manages Web Worker lifecycle, coalescing, fallback, and
  cancellation.
- `calc.worker.ts` hosts HiGHS and calls the same calculation/optimizer
  implementation off the main thread.

React hooks/components may depend on this interface and on the core. The core
must never import from `src/interfaces/web`.

## CLI interface

`scripts/cli/calc-cli.ts` translates command-line/JSON input into a typed
`CalculationRequest`, validates external string IDs, and serializes the core
result back to JSON.

`scripts/calc.ts` contains only process/file IO wiring. It does not know how
the solver, optimizer, or site environment work.

## Compatibility facades

The previous paths `src/lib/calc-environment.ts`,
`src/lib/calc-client.ts`, and `src/workers/calc.worker.ts` are retained as
temporary re-export facades so existing imports do not break. New code should
not use them.

## Dependency rule

Allowed:

```
interfaces -> core -> solver/data
React hooks -> interfaces/web
```

Forbidden:

```
core -> React / DOM / CLI / interfaces
CLI -> solver internals
React components -> CLI
```

This separation makes another interface (REST API, desktop app, MCP tool, etc.)
a translation layer over the same core rather than another calculator
implementation.
