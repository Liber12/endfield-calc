# UI Review Checklist

This checklist operationalizes `docs/ui-design-basis.md`. It is used before
merging non-trivial UI changes.

The checklist is not a substitute for user testing. It separates:
- hard constraints;
- general HCI heuristics;
- Endfield/domain grammar;
- product-specific hypotheses.

## 1. User / task

- Which user mode is primary for this change?
- What task is the user trying to complete?
- What information must be visible for that task?
- Is the change optimizing the primary task or a secondary one?
- Does the change create additional recall or navigation burden?

## 2. Experience intent

State the intended internal result in user terms.

Examples:
- “I have captured the object.”
- “I can see how this is connected.”
- “I am defining the plan.”
- “The system has resolved my plan.”
- “I can see whether the plan is healthy.”

Do not validate with leading questions that repeat these phrases.

## 3. Semantic / IA

- Does each area have a clear subject and function?
- Are object-local facts separated from network/relationship facts?
- Are alternate views truly alternate views of the same subject?
- Is primary information exposed by default?
- Is progressive disclosure used only for secondary/advanced detail?
- Can the user recognize state instead of remembering it from another screen?

## 4. Attention / density

- What should receive first fixation?
- Is the strongest typography/color/scale assigned to that element?
- Are semantically related elements grouped by proximity/common region?
- Is density appropriate to the task?
  - inspection: low–medium;
  - browse/compare: high;
  - graph: low local / high spatial;
  - operational planner: high.
- Are repeated rows aligned consistently?
- Are metadata and decorative elements clearly subordinate?

## 5. Interaction

- Is current state visible?
- Are editable inputs distinguishable from calculated outputs?
- Does changing the subject retarget the same system rather than feel like an unrelated page jump?
- Does motion explain a state change?
- Is animation short and restrained unless stronger feedback is necessary?
- Are loading, error, locked, selected, and disabled states distinguishable?

## 6. Keyboard focus

WCAG 2.2 AA requires visible keyboard focus (SC 2.4.7), and focused content must
not be entirely obscured by author-created content (SC 2.4.11).

Project rule:
- every interactive control must retain a visible `:focus-visible` indicator;
- flat Endfield styling must not remove the focus ring;
- sticky headers/docks must not completely hide the focused control.

The project uses a two-part focus treatment on Endfield surfaces:
- dark/light structural outline;
- Signal Yellow outer ring.

This is deliberately stronger than the surrounding restrained chrome.

Reference:
- https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum
- https://www.w3.org/WAI/WCAG22/Understanding/focus-visible

## 7. Pointer target size

WCAG 2.2 SC 2.5.8 (AA) requires a pointer target of at least 24×24 CSS px
unless a listed spacing/equivalent/essential exception applies.

Project rule:
- important mobile controls should normally exceed 24×24;
- 24×24 is a floor, not a preferred size;
- adjacent destructive controls should not be made smaller merely to preserve a single line.

Reference:
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum

## 8. Color / contrast / state

- Is information still understandable without hue alone?
- Are selected/locked/warning/error states also represented by shape, text, icon, border, or position?
- Is foreground/background contrast checked?
- Does Signal Yellow indicate focus/importance rather than every “important-looking” object?

## 9. Technical text

For every technical label, answer:

> What does this label refer to?

Valid referents:
- page/surface;
- region function;
- object type;
- state;
- organization/ownership;
- real measurement.

If there is no answer, it is filler and should be removed.

## 10. Contour / technical texture

- What semantic role does the contour/texture play here?
- Is its scale/strength appropriate to the area?
- Is the same crop being repeated everywhere?
- On graphs, do real relation lines remain more salient than texture?
- Does texture reduce legibility?

## 11. Responsive re-composition

- Is mobile a semantic re-composition rather than a shrunken desktop?
- Can top-level context scroll away when it is no longer needed?
- Are desktop sidebars transformed into an appropriate mobile interaction?
- Are hit targets still usable?
- Does the reading order remain coherent?

## 12. Validation

Before merge:
- tests/build pass;
- review representative desktop and mobile widths;
- keyboard traversal check;
- reduced-motion check;
- no obvious contrast regression;
- no overflow hiding the primary task.

After deploy:
- smoke-test live deployment;
- verify attention order and density on real content;
- record any observation that falsifies the design hypothesis.
