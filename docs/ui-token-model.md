# UI Token Model

These tokens are **project tokens**, not official Arknights: Endfield design tokens.

They exist to keep repeated visual decisions explainable and consistent while
preserving the distinction between:
- general UI constraints;
- reconstructed Endfield domain evidence;
- product-specific implementation hypotheses.

## 1. Token layers

### Core color

Evidence basis:
- Endfield web/domain palette reconstruction;
- semantic signal hierarchy.

Tokens:
- `--ef-ink`
- `--ef-paper`
- `--ef-paper-strong`
- `--ef-subtle`
- `--ef-line`
- `--ef-line-strong`
- `--ef-meta`
- `--ef-signal`
- semantic/category colors (`--ef-blue`, `--ef-green`, etc.)

Rule:
Signal Yellow is not a generic “important” color. It is used for focus,
selection, system signal, and strongly intentional emphasis.

### Typography roles

The token system models roles, not components.

`--ef-type-display`
- dominant subject names / major display numbers;
- used sparingly;
- strongest scale contrast.

`--ef-type-functional`
- tabs, controls, row labels, normal operational text.

`--ef-type-meta`
- technical labels, IDs, categories, compact counts.

`--ef-track-meta`
- uppercase metadata/editorial tracking.

Exact sizes are product hypotheses and may be tuned after screenshot/usability
review. The role distinction is more stable than any one pixel value.

### Motion roles

`--ef-motion-fast`
- hover/focus/local state feedback.

`--ef-motion-state`
- item/target entry, short state transitions.

Motion must not add spring/overshoot merely for polish.

### Texture strength

`--ef-contour-shell-opacity`
- broad world/brand continuity.

`--ef-contour-subject-opacity`
- selected-object measurement/classification field.

Texture values are deliberately lower-level hypotheses. Graph relation lines and
data text always have higher priority than texture.

## 2. Density is not a global token

Do not introduce a single `--ef-density` or global padding scale and apply it
to every surface.

Density is task-driven:
- inspection;
- browse/compare;
- operational planning;
- relation canvas;
- telemetry.

Spacing tokens may be introduced within one of those families if repeated use
proves stable.

## 3. Token promotion rule

A literal value becomes a project token when at least one is true:

1. it expresses a stable semantic role across multiple components;
2. changing it should intentionally affect multiple surfaces together;
3. it represents an accessibility constraint;
4. it is part of a documented domain grammar.

Do not promote one-off geometry to a global token merely to remove literals.

## 4. Token evidence rule

For each token family, the project should be able to answer:

- what semantic role does this token represent?
- which source/standard/domain evidence motivates the role?
- is the exact value constrained or merely hypothesized?
- which surfaces should change together if the token changes?

This prevents “design tokens” from becoming unexplained constants with nicer
names.
