# UI Knowledge Map

This document defines which bodies of knowledge should be consulted for which
kind of UI decision in Endfield Calc. Its purpose is to prevent ad-hoc design
and post-hoc justification.

## 1. Human-centred design and usability

### ISO 9241-210:2019 — Human-centred design for interactive systems

Use for:
- identifying users and context of use;
- defining user needs and requirements;
- planning iterative design/evaluation;
- ensuring design activity is driven by actual use rather than aesthetics.

Project implication:
- every substantial UI change starts from a user mode and task.

Reference:
https://www.iso.org/standard/77520.html

### ISO 9241-11:2018 — Usability: definitions and concepts

Use for:
- defining usability outcomes;
- separating effectiveness, efficiency, and satisfaction;
- deciding what to measure during validation.

Project implication:
- “looks more Endfield-like” is not a sufficient validation outcome.

## 2. Interaction and navigation

### ISO 9241-110:2020 — Interaction principles

Use for:
- interaction consistency;
- controllability;
- self-descriptiveness;
- error tolerance;
- suitability for user tasks.

Project implication:
- state, editability, and consequences of actions should be understandable
  without relying on decorative convention.

Reference:
https://www.iso.org/standard/75258.html

### ISO 9241-115:2024 — Conceptual design, interaction, UI and navigation

Use for:
- conceptual design;
- user-system interaction design;
- interface design;
- navigation design;
- checking that interaction sequences match the user's mental model.

Project implication:
- the selected material remains the subject while Production / Uses changes the
  direction of investigation;
- calculator Plan / Production separation is a conceptual boundary, not merely
  a responsive layout trick.

Reference:
https://www.iso.org/standard/80773.html

## 3. Information presentation

### ISO 9241-112:2025 — Principles for presentation of information

Use for:
- perception and understanding of presented information;
- analysis of information hierarchy;
- deciding whether presentation supports comprehension rather than merely
  displaying all available data.

Project implication:
- Display / Functional / Metadata hierarchy is evaluated by what it helps the
  user perceive and understand, not by fixed type sizes alone.

Reference:
https://www.iso.org/standard/87518.html

### ISO 9241-125:2017 — Guidance on visual presentation of information

Use for:
- visual presentation choices;
- conditional guidance based on users, tasks, environments, and technology;
- reviewing consistency and productivity impact of visual information design.

Project implication:
- exact spacing, typography, and contour strength remain contextual design
  hypotheses rather than universal rules.

Reference:
https://www.iso.org/standard/64840.html

## 4. Information architecture and cognitive support

### Recognition rather than recall

Use for:
- deciding whether context must remain visible;
- avoiding unnecessary navigation or memory burden.

Project application:
- immediate recipes remain with the selected item;
- search/filter state remains visible;
- current Production / Uses state is explicit.

Reference:
https://www.nngroup.com/articles/recognition-and-recall/

### Progressive disclosure

Use for:
- separating primary information from secondary or advanced information.

Do not use it as:
- a general reason to hide information;
- a way to force one-screen layouts.

Project application:
- direct recipe is primary and visible;
- recursive dependency structure and detailed destination exploration are
  deeper investigation surfaces.

Reference:
https://www.nngroup.com/articles/progressive-disclosure/

## 5. Perceptual grouping

### Gestalt proximity and common region

Use for:
- grouping semantically related elements;
- deciding when spacing is enough and when a boundary is warranted;
- avoiding excessive nested cards.

Project application:
- item name, metadata, description, and direct recipe belong to one object
  inspection region;
- Production / Uses relationships are separated below that object region.

References:
https://www.nngroup.com/articles/gestalt-proximity/
https://www.nngroup.com/articles/common-region/

## 6. Information visualization

### Shneiderman information visualization mantra

Use for:
- large graphs and structured data exploration;
- deciding what belongs in an overview and what belongs in detail-on-demand.

Project application:
- production graph prioritizes topology first;
- node-local detail is secondary;
- fit-to-view gives overview before local inspection.

Reference:
https://www.cs.umd.edu/~ben/about.html

## 7. Accessibility

### WCAG 2.2

Use as a constraint layer, not a style recommendation.

Project priorities:
- visible keyboard focus;
- focus not fully obscured;
- pointer target size;
- text/non-text contrast;
- not encoding state by color alone;
- reduced-motion support.

References:
https://www.w3.org/TR/WCAG22/
https://www.w3.org/WAI/WCAG22/Understanding/focus-visible
https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum
https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum

## 8. Endfield domain evidence

Use:
- `Endfield_Design_System_v1_2`;
- screenshot evidence and evidence matrix within that document.

Use for:
- world/semantic framing;
- Operational / System vs Presentation / Brand dialects;
- Dual Canvas;
- Signal Yellow;
- technical editorial language;
- contours / grids / relation lines;
- task-driven density;
- restrained mechanical motion.

Do not treat it as:
- an official Hypergryph token specification;
- a replacement for general HCI/accessibility principles.

## 9. Product-specific evidence

Use:
- repository behavior;
- real content density;
- mobile/desktop screenshots;
- user observations;
- timing / interaction measurements;
- failure cases.

Examples:
- bottle recovery branch explosion;
- mobile basic-info viewport pressure;
- graph-card size hiding topology.

Product evidence can override a generic default when the generic default is not
working for this product.

## 10. “UX laws” policy

Named laws such as Fitts's law, Hick–Hyman law, Miller-style memory limits, or
aesthetic-usability effects should not be cited merely because a change sounds
related.

Use a named law only when:
1. the variables the law actually concerns are present;
2. the direction of the prediction applies to the task;
3. the design decision can be traced to that relationship.

Otherwise describe the concrete usability issue directly.

## 11. Decision method

For each non-trivial design decision:

1. identify user/context;
2. identify task;
3. define intended user state;
4. define semantic objects/relationships;
5. choose information architecture;
6. choose attention/density strategy;
7. choose interaction;
8. apply accessibility constraints;
9. apply Endfield/domain visual grammar;
10. choose concrete visual values as hypotheses;
11. validate and revise.

This order is normative for the project even when implementation work is
iterative.
