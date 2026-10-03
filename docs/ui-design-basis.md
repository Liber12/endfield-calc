# UI Design Basis

This document defines the design reasoning layer for Endfield Calc. It exists so UI decisions can be explained, audited, and changed from explicit assumptions rather than from local visual preference.

## 1. Design order

UI decisions follow this order:

1. **User & context** — who is using the tool, for what goal, on what device, and under what time pressure.
2. **Experience intent** — what cognitive/affective state the interface should create in the user.
3. **Semantic model** — what objects, relationships, states, and actions exist.
4. **Information architecture** — how those concepts are grouped and navigated.
5. **Attention & density** — what is visually dominant, what is compact, and what is secondary.
6. **Interaction model** — how state changes are exposed and how users move between views.
7. **Visual language** — typography, color, contours, grids, technical labels, borders, motion.
8. **Validation** — whether the intended task outcome and experience actually occur.

Visual language must not be used to compensate for an unclear semantic or information model.

Surface-specific specifications:
- [Material Dictionary UI Specification](./material-dictionary-ui-spec.md)
- [Production Calculator UI Specification](./production-calculator-ui-spec.md)
- [UI Decision Records](./ui-decisions.md)
- [UI Review Checklist](./ui-review-checklist.md)

## 2. User model

The project is designed around usage modes, not demographic personas.

### U1 — Quick reference

Typical questions:
- What is this item?
- How do I make it?
- What consumes it?
- Is it worth keeping?

Context:
- Often in parallel with gameplay.
- Mobile use is common.
- Interaction should produce an answer in seconds.

Priority:
- Recognition before exploration.
- Immediate recipe information remains visible.
- Navigation must not require remembering information from another screen.

### U2 — Structure investigation

Typical questions:
- What does this ultimately require?
- Where does this intermediate material come from?
- How do branches and alternatives connect?
- Where does this item lead downstream?

Context:
- Longer session.
- Desktop and tablet become more likely.

Priority:
- Relation visibility.
- Overview before local detail.
- Branching/merging must be visible spatially.

### U3 — Production planning

Typical questions:
- How much production is required?
- How many facilities are needed?
- Where are constraints and bottlenecks?
- Which assumptions change the plan?

Context:
- High information density is acceptable.
- Mostly deliberate interaction rather than quick lookup.

Priority:
- Stable state, numeric comparison, constraints, and feedback.
- Operational density rather than presentation-style whitespace.

### U4 — Exploration

Typical questions:
- What items exist?
- What unfamiliar production chains are present?
- What is related to this category?

Priority:
- Scanability and discoverability.
- Dense lists/grids are appropriate.
- Item details stay out of the picker until an item is selected.

## 3. Experience intents

These are internal design targets. They should be created by the interface rather than stated as slogans.

### E1 — “I have captured the object”

The selected item should become the unmistakable current subject.

Created by:
- dominant item name;
- subject image/icon;
- isolated low-density identity area;
- metadata attached to the subject rather than distributed across the screen;
- optional contour/measurement texture behind the subject.

Not created by:
- simply writing “MATERIAL RECORD” in large text.

### E2 — “I can see how this is connected”

Relationships should be perceived before they are read sentence-by-sentence.

Created by:
- node position;
- directional edges;
- branching/merging;
- consistent input/process/output grammar;
- quantities located next to the relationship they describe.

### E3 — “There is a lot of information, but it is under control”

Information density is not minimized globally. It is allocated according to task.

Created by:
- strong hierarchy between display, functional text, and metadata;
- stable alignment and repeated structures;
- high-density browse surfaces and lower-density inspection surfaces;
- semantic emphasis used selectively.

### E4 — “I am operating a precise system”

The interface should feel stateful and mechanically coherent rather than decorative.

Created by:
- local state transitions instead of full-page conceptual resets;
- restrained movement;
- stable geometry;
- visible state changes;
- predictable interaction rules.

### E5 — “This belongs to the Endfield world”

This is a consequence of semantic and visual continuity, not the primary goal.

Created by:
- Dual Canvas;
- Signal Yellow;
- relation graphics;
- contours / measurement textures;
- technical editorial typography;
- meaningful technical labels;
- flat information surfaces rather than floating card decoration.

## 4. Evidence hierarchy

Not every design statement has the same strength.

### A — Constraints / standards

Use when applicable:
- WCAG 2.2 accessibility requirements.
- Browser/platform interaction requirements.
- Clearly measured task failures.

These override stylistic preference.

### B — General HCI / UX principles

Primary references:
- ISO 9241-210:2019 — human-centred design process.
  https://www.iso.org/standard/77520.html
- ISO 9241-110:2020 — technology-independent interaction principles.
  https://www.iso.org/standard/75258.html
- ISO 9241-11:2018 — usability as effectiveness, efficiency and satisfaction for specified users, goals and context.
- Nielsen Norman Group — recognition rather than recall.
  https://www.nngroup.com/articles/recognition-and-recall/
- Nielsen Norman Group — progressive disclosure.
  https://www.nngroup.com/articles/progressive-disclosure/
- Nielsen Norman Group — Gestalt proximity: nearby elements are perceived as related.
  https://www.nngroup.com/articles/gestalt-proximity/
- Nielsen Norman Group — common region: shared boundaries strongly imply grouping.
  https://www.nngroup.com/articles/common-region/
- Ben Shneiderman — information visualization mantra:
  overview first, zoom/filter, details on demand.
  https://www.cs.umd.edu/~ben/about.html
- W3C WCAG 2.2.
  https://www.w3.org/TR/WCAG22/

These guide design but do not mechanically determine pixel values.

### C — Domain / Endfield evidence

Project reference:
- `Endfield_Design_System_v1_2` and its evidence matrix.

Key reconstructed principles:
- operational semantics before decoration;
- task-driven density;
- standard IA with strong art direction;
- relation lines for real dependencies;
- Display / Functional / Metadata typography contrast;
- Dual Canvas + Signal Yellow + semantic/category colors;
- contours as geography, measurement, classification, brand, and world-building texture;
- responsive re-composition rather than desktop shrinkage.

The reconstruction is not an official published design system. Treat it as domain evidence, not as a normative standard.

### D — Product-specific hypotheses

Examples:
- an item title should be 30 px rather than 26 px;
- flow node width should be 148 px;
- contour opacity should be 5%.

These require visual/usability validation. Do not describe them as established UX laws.

## 5. Technical text policy

Technical text does not have to be directly actionable data.

It is valid when it truthfully identifies at least one of:
- page/surface type;
- region function;
- object type;
- system state;
- world-space ownership or organization;
- real data or measurement.

Good:
- `ENDFIELD INDUSTRIES // MATERIAL RECORD` — identifies the record surface and world-space owner.
- `SUPPLY RELATION CANVAS` — identifies the function of a relationship canvas.
- `PROCESS` — identifies a node class.
- `12 NODES` — real graph state.

Avoid:
- invented serials such as `GRID 04` when no grid identifier exists;
- arbitrary sector IDs;
- meaningless “LIVE / CORE / ALPHA” filler.

The question is not “is this useful data?” but “does this text refer to something real in the interface or world model?”

## 6. Contour / technical texture policy

Contours are allowed as background texture. They are not restricted to literal maps.

Possible roles:
1. geographic information;
2. measurement / classification space;
3. brand identity;
4. world-to-interface continuity.

Rules:
- use different scale, weight, interruption, and density by context;
- avoid one identical repeating contour texture across every surface;
- relation lines must dominate contours in production graphs;
- the selected subject may receive stronger contour emphasis than surrounding chrome;
- texture should reinforce a semantic region, not be added merely to fill empty pixels.

## 7. Attention and density model

Density is task-driven.

- **Inspection / selected item:** low to medium density. Strong subject dominance.
- **Immediate recipe:** medium density. Short, direct input → process → output relation.
- **Production graph:** low local density / high spatial information density.
- **Uses list / picker:** high density and repeated scanning structure.
- **Selected use path:** medium-low density; suppress unrelated options.
- **Production calculator:** high operational density.

A screen is not considered coherent merely because spacing is uniform. Different regions may require different density.

## 8. Responsive model

Desktop and mobile should express the same semantic model but may use different composition.

Desktop:
- exploit horizontal comparison and broad relationship canvases;
- permit sidebars and persistent secondary context.

Mobile:
- use vertical document flow for item identity and direct recipe;
- allow upper basic information to scroll away;
- preserve the Production / Uses switch as the main context boundary;
- orient production flow top-to-bottom;
- avoid shrinking desktop multi-column layouts until text and hit targets become unusable.

## 9. Interaction principles for this product

- Prefer recognition over recall: keep context needed for the current decision visible or locally retrievable.
- Keep primary task information primary: do not hide immediate production recipe merely to reduce viewport height.
- Preserve subject continuity: selecting an item should feel like retargeting the same system, not entering an unrelated page.
- Make state visible: active mode, selected item, active destination, and warnings need clear states.
- Use progressive disclosure only for secondary/advanced information.
- Use motion to explain state change, not to decorate static states.
- Critical success/error/focus feedback may be visually stronger than the surrounding restrained style.

## 10. Accessibility constraints

Endfield-inspired restraint cannot reduce basic operability.

Minimum checks:
- keyboard focus remains clearly visible;
- text/background contrast is checked rather than inferred from appearance;
- interaction is not encoded by color alone;
- touch targets are appropriate for mobile use;
- motion respects `prefers-reduced-motion`;
- graph controls have accessible labels and keyboard alternatives where feasible.

## 11. Decision record format

For non-trivial UI changes, record:

```
Decision:
<what is changing>

User / context:
<who and in what use mode>

Goal:
<task outcome>

Experience intent:
<E1-E5 or another explicitly defined intent>

Evidence:
- constraint / standard
- general HCI principle
- Endfield/domain evidence
- product-specific observation

Alternatives:
<other plausible designs>

Why rejected:
<reason>

Validation:
<what would prove or disprove the decision>
```

Do not backfill an unrelated UX law after a visual decision has already been made.

## 12. Validation strategy

### Task validation

For the material dictionary:
- user can identify the selected item immediately;
- user can locate its immediate production recipe without opening another surface;
- user can move from the item to upstream production structure or downstream uses without remembering hidden context;
- user can distinguish production flow from use path.

### Experience validation

Ask users what the interface feels like without prompting with target adjectives.

Desired spontaneous concepts:
- organized;
- precise;
- technical/operational;
- connected;
- information-rich but manageable;
- continuous with Endfield.

Avoid validating with “Does this feel Endfield-like?” alone; that question strongly primes the answer.

### Visual validation

Test at representative desktop and mobile widths. Review:
- first fixation / strongest object;
- grouping;
- density transitions;
- graph readability;
- contrast and focus states;
- whether decorative texture competes with semantic content.

