# UI Decision Records

This file records non-trivial UI decisions whose rationale should survive implementation changes.

## ADR-UI-001 — Item-centric dictionary

**Decision**  
The selected item is the subject of the material dictionary. The page is organized around two directional investigations: Production (upstream) and Uses (downstream).

**User / context**  
Quick-reference and structure-investigation users need to understand one item without mentally switching between unrelated page models.

**Goal**  
Keep object identity stable while the relationship direction changes.

**Experience intent**  
E1 “I have captured the object” and E2 “I can see how this is connected”.

**Evidence**  
- Recognition over recall: the current object remains visible.
- Endfield domain model: materials are represented as records inside production/supply relationships.
- Standard IA: tabs are appropriate for alternate views of the same subject.

**Rejected**  
Treating downstream paths as “production routes” owned by destination products.

**Validation**  
Users should be able to state which item is selected and whether they are looking upstream or downstream without reading help text.

---

## ADR-UI-002 — Immediate recipe is basic item information

**Decision**  
The selected item's immediate production recipe(s) are always visible with the item information. They are not hidden behind a details/expand action.

**User / context**  
Quick-reference users frequently open an item specifically to answer “how is this made?”

**Goal**  
Answer the primary recipe question without an extra interaction.

**Experience intent**  
E1 “I have captured the object” followed immediately by “I know how it is directly produced”.

**Evidence**  
- Progressive disclosure should defer secondary/advanced content, not the primary task.
- Recognition over recall: inputs, process, and outputs remain visible together.
- Endfield item-detail evidence separates subject inspection from broader production structure.

**Rejected**  
Moving the recipe to a bottom sheet on mobile merely to preserve viewport height.

**Validation**  
On mobile and desktop, the direct recipe is reachable by ordinary reading/scrolling with no disclosure control.

---

## ADR-UI-003 — Production flow remains distinct from immediate recipe

**Decision**  
Immediate recipe and recursive production flow are separate representations.

**Goal**  
Direct recipe answers “what directly makes this?”; production flow answers “what does this ultimately require?”

**Experience intent**  
E2 “I can see how this is connected”.

**Evidence**  
- Information visualization: overview and relationship structure serve a different task from item-local facts.
- Endfield production-process evidence uses relation lines to represent input/process/output dependency.

**Rejected**  
Replacing the flow with a nested text/card list only.

**Validation**  
Users should be able to identify branching, merging, and alternative upstream paths without opening every node.

---

## ADR-UI-004 — Recovery/disassembly is excluded from default production meaning

**Decision**  
Dismantler recovery recipes are excluded from the default production tree and immediate production summary.

**Goal**  
Avoid representing recovery as a normal manufacturing alternative and prevent bottle/container branch explosion.

**Experience intent**  
E3 “There is a lot of information, but it is under control”.

**Evidence**  
- Semantic-model consistency: recovery is a different operational relation from primary manufacturing.
- Graph legibility: irrelevant alternatives increase branching without helping the target task.

**Rejected**  
Keeping all recovery branches and only collapsing them visually.

**Validation**  
Bottle production should show its actual manufacturing route rather than every filled bottle that can be dismantled to recover it.

---

## ADR-UI-005 — Mobile basic information uses document flow

**Decision**  
Item identity, description/effect, and immediate recipe are normal vertical document content on mobile. They scroll away. The interface does not reserve fixed viewport space for them.

**User / context**  
Mobile quick-reference users need basic facts first, then need room for relationship exploration.

**Evidence**  
- Responsive re-composition in the Endfield web evidence: mobile is a vertical document flow rather than a shrunken desktop canvas.
- Primary information remains visible initially without permanently consuming screen space.

**Rejected**  
Hiding basic information in a details sheet or pinning the entire information header.

**Validation**  
The relationship workspace can occupy most of the screen after the user scrolls to it.

---

## ADR-UI-006 — Technical text must have a referent

**Decision**  
Technical labels may be non-actionable and may exist partly for editorial/world-building purposes, but every label must truthfully identify a surface, region, object class, state, organization, or real measurement.

**Allowed examples**  
- `ENDFIELD INDUSTRIES // MATERIAL RECORD`
- `SUPPLY RELATION CANVAS`
- `PROCESS`

**Rejected examples**  
- `GRID 04` when there is no grid identifier in the product model.
- arbitrary serial/sector codes inserted only to fill visual space.

**Evidence**  
- Endfield technical-editorial language classifies and operationalizes the world.
- Meaningful labels reinforce the semantic model; filler simulates complexity without adding structure.

**Validation**  
For any technical label, the designer should be able to answer “what does this label refer to?” in one sentence.

---

## ADR-UI-007 — Density varies by task

**Decision**  
The product does not use one global spacing/density target.

**Density model**  
- Item inspection: low–medium.
- Immediate recipe: medium.
- Production flow: low local density / high spatial information density.
- Uses list and picker: high.
- Selected use path: medium–low.
- Production calculator: high operational density.

**Evidence**  
- Endfield reconstruction: task-driven density.
- Information visualization: overview and scanning surfaces need different representations.
- Gestalt grouping: spacing should reflect semantic grouping rather than global uniformity.

**Validation**  
A user should perceive clear density transitions aligned with changes in task.

---

## ADR-UI-008 — Production-flow nodes are compact; process nodes are subordinate

**Decision**  
Dictionary production-flow item nodes are substantially smaller than the general calculator's production cards, and process nodes are smaller than item nodes.

**Goal**  
Make the relationship topology, not individual card chrome, the dominant visual information.

**Experience intent**  
E2 and E3.

**Evidence**  
- Relation graphics should expose dependency directly.
- Shneiderman: overview first; local details can follow selection.
- Endfield production-process visual grammar uses compact material/process elements on a broad canvas.

**Alternative**  
208 px cards for every item/process node.

**Rejected because**  
Large equal-weight cards consume canvas area and make branching/merging harder to perceive.

**Validation**  
At initial fit-to-view, labels remain legible while substantially more of the graph topology is visible than with the previous 208 px node design.

---

## ADR-UI-009 — Contours are semantic/brand texture, not map-only graphics

**Decision**  
Contours may appear in non-map backgrounds when they communicate measurement, classification, development/territory, brand identity, or continuity with Endfield Industries.

**Rules**  
- stronger around selected-object inspection fields;
- weaker behind relationship graphs;
- vary scale/weight/interruption by area;
- do not stamp the same contour pattern at identical strength across every surface.

**Evidence**  
Endfield reference material shows contours across map, UI background, brand, and physical-world motifs.

**Validation**  
Removing the contours should reduce world/brand continuity, but should not break semantic comprehension of the screen.


---

## ADR-UI-010 — Calculator is an asymmetric operational workspace

**Decision**  
The production calculator is organized as three semantically different regions:
plan inputs, resolved production model, and plan telemetry.

**User / context**  
Production-planning users are editing assumptions while continuously checking
calculated consequences.

**Goal**  
Make cause, resolved result, and operating state visually distinct.

**Experience intent**  
E3 “There is a lot of information, but it is under control” and
E4 “I am operating a precise system”.

**Evidence**  
- Task-driven density: input editing, exact comparison, spatial overview, and
  telemetry have different density needs.
- Standard IA: persistent input rail + primary work surface + diagnostic summary
  is appropriate for an operational planning tool.
- Endfield Operational/System evidence uses lists, connection views, state,
  numbers, and semantic colors rather than presentation-style whitespace.

**Rejected**  
Styling the plan rail, production surface, and telemetry as three equivalent
floating cards.

**Validation**  
Without reading help copy, users should be able to point to where they change
the plan, where the calculated result appears, and where they check overall
operating condition.

---

## ADR-UI-011 — Calculator technical labels name real regions

**Decision**  
Use semantic editorial labels such as
`ENDFIELD INDUSTRIES // PRODUCTION PLAN`, `PRODUCTION MODEL`, and
`PLAN TELEMETRY`.

**Reason**  
These labels identify actual page/region functions and therefore satisfy the
technical-text referent rule.

**Rejected**  
Fake console serial numbers, “LIVE” states, or sector/grid IDs not represented
by the product model.

**Validation**  
Every label must still have a one-sentence referent explanation.

---

## ADR-UI-012 — Contours are layered by semantic region

**Decision**  
Introduce a broad, very-low-contrast contour field at shell level and a stronger
cropped contour field behind the selected material. Keep relationship canvases
subordinate to their actual relation lines.

**Goal**  
Use the contour motif as measurement/classification and brand continuity while
preserving task hierarchy.

**Evidence**  
- Domain evidence supports contours as geography, technical texture, brand, and
  world-space motif.
- Task-driven density requires different texture strength by region.
- Production graphs already encode meaning spatially through edges; their
  decorative texture therefore has lower priority than selected-object
  inspection fields.

**Validation**  
Contours should be perceptible as atmosphere/structure but should not reduce
text contrast or compete with graph edges.

---

## ADR-UI-013 — Entry motion is restrained and non-springy

**Decision**  
Replace scale/spring-style picker and target-card entry animations with short
opacity + small translation transitions.

**Goal**  
Make additions legible as state changes without making the interface feel
elastic or consumer-app-like.

**Evidence**  
- Project experience intent E4.
- Endfield motion evidence favors restrained, mechanical continuity.
- `prefers-reduced-motion` remains honored.

**Validation**  
New targets/items should be noticeable without overshoot or visual bounce.


---

## ADR-UI-014 — Endfield flat styling must not remove keyboard focus

**Decision**  
All interactive controls inside the Endfield app shell receive an explicit
`:focus-visible` treatment even when component box-shadows are removed for
flat visual styling.

**Reason**  
The shared Button component implements focus rings through Tailwind ring
box-shadow. Endfield overrides intentionally remove ordinary shadows, which can
also suppress that focus signal if no explicit fallback exists.

**Constraint**  
WCAG 2.2 SC 2.4.7 requires visible focus at Level AA. The project uses a
2 px structural outline plus a Signal Yellow outer ring to make focus
conspicuous across light and dark surfaces.

**Validation**  
Keyboard traversal through header, mode tabs, plan controls, picker controls,
dictionary controls, and graph controls must always expose a visible focus
indicator.

---

## ADR-UI-015 — Mobile target actions exceed the minimum pointer floor

**Decision**  
Target-row Max / Lock / Remove controls remain at least 28×28 CSS px on mobile.

**Reason**  
WCAG 2.2 SC 2.5.8 defines 24×24 CSS px as the Level AA pointer-target minimum
unless an exception applies. These actions are tightly adjacent and include a
destructive action, so the project intentionally keeps them above the minimum
rather than treating 24 px as a preferred size.

**Validation**  
At representative portrait widths, the controls remain independently tappable
without forcing the rate field or item name out of the row.


---

## ADR-UI-016 — Design tokens represent semantic roles, not literal deduplication

**Decision**  
Promote repeated values to Endfield Calc project tokens only when they express
a stable semantic role across surfaces, an accessibility constraint, or a
documented domain grammar.

Initial role families:
- Display / Functional / Metadata / System typography;
- metadata/system tracking;
- fast/state motion;
- shell/subject/operational contour strength;
- existing core/signal/semantic colors.

**Reason**  
Replacing every literal with a variable would make the stylesheet look more
systematic without making the design decisions more systematic. The role must
remain explainable if the exact value changes.

**Important limitation**  
These are Endfield Calc project tokens. They are not presented as official
Hypergryph or Arknights: Endfield design-token names or values.

**Rejected**  
- one token per arbitrary pixel value;
- one global density/spacing token applied to inspection, browse, graph, and
  operational surfaces alike.

**Validation**  
For each promoted token, changing its value should intentionally affect a
coherent family of UI elements rather than unrelated components.


---

## ADR-UI-017 — Global chrome is contextual to the active tool

**Decision**  
Plan-specific header actions (Save, Open, Settings) are rendered only in the
production calculator. The material dictionary keeps global actions such as
theme, language, and community links but does not show calculator actions.

**User / context**  
Dictionary users are usually performing quick reference or structure
investigation, while Save/Open/Settings act on the production-planning model.

**Goal**  
Reduce irrelevant chrome and ensure every visible action has a valid effect in
the current conceptual surface.

**Evidence**  
- Suitability for the task: controls should correspond to actions available in
  the user's current task context.
- Recognition over recall: hiding an inapplicable action is preferable to
  exposing a control whose meaning depends on remembering another tool mode.
- Product observation: the Settings sheet is explicitly calculator-scoped in
  `App.tsx`, so displaying its header button in dictionary mode created a
  visible control that could not open its destination.

**Rejected**  
Keeping Save/Open/Settings permanently visible for visual consistency across
the two tools.

**Validation**  
In dictionary mode, every remaining header action should have an immediate and
valid dictionary/global effect. Switching back to calculator restores the plan
actions without losing plan state.


---

## ADR-UI-018 — Relationship canvases use one subordinate technical texture stack

**Decision**  
The material relationship workspace uses one low-contrast measurement grid plus
one irregular contour field. The additional React Flow dot background and the
former synthetic concentric-ring background are removed.

**User / context**  
Structure-investigation users need to perceive dependency topology before
background styling.

**Goal**  
Keep relation edges and node placement as the strongest spatial information
while retaining the Endfield surveying/technical-document texture.

**Experience intent**  
E2 “I can see how this is connected” before E5 “This belongs to the Endfield
world”.

**Evidence**  
- Relation graphics are semantic: dependency lines carry actual production/use
  meaning.
- Endfield domain evidence supports contours and grids as technical texture,
  including non-map backgrounds, but does not require every technical texture
  to be stacked simultaneously.
- Task-driven density: a graph already has high spatial information density.

**Rejected**  
Grid + synthetic concentric rings + React Flow dot field simultaneously.

**Validation**  
At fit-to-view, branch/merge topology and arrow direction should remain more
salient than either the grid or contour field.
