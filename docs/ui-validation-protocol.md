# UI Validation Protocol

This protocol turns the project UI rationale into observable checks. It is
designed to test both **task performance** and the **internal impression** the
interface creates without leading users toward the intended answer.

Use together with:
- `docs/ui-design-basis.md`
- `docs/ui-review-checklist.md`
- `docs/material-dictionary-ui-spec.md`
- `docs/production-calculator-ui-spec.md`

## 1. What this protocol can and cannot establish

This protocol can provide evidence that:
- users can understand the current subject and task;
- important information is found efficiently;
- density/hierarchy do not prevent task completion;
- intended impressions arise spontaneously after use;
- mobile and desktop compositions preserve the same conceptual model.

It cannot establish that:
- a particular pixel value is universally optimal;
- the design is “objectively Endfield-like”;
- first fixation has been measured unless real eye-tracking equipment is used.

When no eye tracking is available, use short-exposure recognition tasks rather
than claiming actual fixation data.

## 2. Participant model

Recruit by **usage mode**, not demographics.

Minimum useful coverage:

### Group A — Quick reference
People who would check information while playing or planning briefly.

Tasks:
- identify an item;
- find direct recipe;
- find one use.

Primary device:
- mobile.

### Group B — Structure investigation
People interested in production chains and material relationships.

Tasks:
- identify upstream dependency;
- explain a branch/merge;
- trace a downstream use path.

Primary devices:
- mobile + desktop.

### Group C — Production planning
People who deliberately configure and inspect a factory plan.

Tasks:
- add a target;
- set a rate;
- change an assumption;
- interpret the result;
- find warnings/telemetry.

Primary device:
- desktop, with one portrait pass.

Do not require participants to know the UI terminology in advance.

## 3. Test variants

Use at least:

- Mobile narrow: approximately 390×844 CSS px.
- Tablet/portrait: approximately 768×1024 CSS px.
- Desktop: approximately 1440×900 CSS px.

These are representative test viewports, not design breakpoints.

Test both light and dark surfaces at least once per release candidate when
contrast-sensitive changes are involved.

## 4. Short-exposure hierarchy test

Purpose:
check what the design communicates before deliberate reading.

Procedure:
1. show the screen for approximately 5 seconds;
2. hide it;
3. ask open questions:
   - “What was this screen about?”
   - “What object or task seemed most important?”
   - “What would you do first?”
4. do not mention “Endfield”, “precise”, “technical”, “operational”, or other
   target adjectives before the answer.

Dictionary expectation:
- selected item is recalled before system chrome;
- participants understand that production/use relationships are available.

Calculator expectation:
- participants distinguish plan inputs from calculated production output;
- the result area, not global chrome, reads as the main work surface.

Failure signal:
participants primarily recall decorative labels, contour texture, or yellow
accents but cannot state the current object/task.

## 5. Material dictionary task test

Run from a neutral entry state.

### D1 — Identify the subject

Prompt:
“Tell me which material you are currently inspecting and its category/tier.”

Success:
- correct without opening another surface.

Measure:
- completion;
- time;
- wrong-area clicks/taps.

### D2 — Find direct production recipe

Prompt:
“How is this item directly produced? Tell me its input(s), facility, and output.”

Success:
- no expand/details control needed;
- all requested facts found from basic information.

Target hypothesis:
- most users should answer within roughly 10 seconds after locating the item.

Treat the threshold as a product hypothesis, not an HCI law.

### D3 — Explain upstream structure

Prompt:
“From the selected product, show me what it ultimately depends on.”

Success:
- user chooses Production;
- can identify at least one upstream branch;
- does not interpret a downstream path as the production route.

### D4 — Find a downstream use

Prompt:
“Find one thing this material is used for.”

Success:
- user chooses Uses;
- direct use or destination can be identified without returning to the picker.

### D5 — Trace one use path

Prompt:
“Pick one downstream destination and explain the path from this material to it.”

Success:
- selected use path is distinguishable from production flow;
- unrelated uses do not prevent following the selected path.

## 6. Production calculator task test

### C1 — Add and configure a target

Prompt:
“Add a target product and set it to a specified rate.”

Success:
- user identifies Plan as the editable input area;
- target picker is discoverable;
- rate control is understood.

### C2 — Interpret result

Prompt:
“Tell me what the calculated plan requires.”

Success:
- user identifies Production Model as output rather than another input form;
- table or graph view is used appropriately.

### C3 — Switch representation

Prompt:
“Show the same plan as a relationship graph, then return to exact values.”

Success:
- user recognizes table/graph as two views of the same solved plan.

### C4 — Find operating condition

Prompt:
“Check whether the plan has any current problem or limit issue, then tell me a
headline operating value such as power or building count.”

Success:
- user finds plan telemetry;
- issue state remains discoverable whether telemetry is collapsed or expanded.

### C5 — Change an assumption

Prompt:
“Change a plan-level assumption such as region or a relevant option. Then tell
me what changed in the result.”

Success:
- input control is recognized as an assumption;
- recalculated result is perceived as a consequence of that change.

## 7. Mobile re-composition test

Dictionary:
- basic information appears before relationships;
- it can scroll away naturally;
- Production/Uses remains a clear relationship-context boundary;
- flow is navigable top-to-bottom.

Calculator:
- Plan and Production are discoverable as top-level mobile modes;
- switching modes does not lose the plan;
- telemetry remains reachable;
- target actions are independently tappable.

Failure signal:
user must understand the desktop composition before the mobile layout makes
sense.

## 8. Accessibility interaction pass

Keyboard:
- traverse global header;
- tool-mode switch;
- dictionary picker;
- Production/Uses switch;
- plan targets/options;
- production table/graph controls.

Check:
- visible focus on every stop;
- focused element not entirely hidden behind sticky surfaces;
- focus order follows conceptual reading order.

Pointer/touch:
- test adjacent target actions;
- test material/item tiles;
- verify destructive controls do not require precision beyond their visual size.

Motion:
- repeat with `prefers-reduced-motion: reduce`;
- no state information may disappear with animation disabled.

## 9. Impression elicitation

Ask only **after task use**.

Open prompt:
“Give me 3–5 words or short phrases describing what using this interface felt
like.”

Then:
“What made it feel that way?”

Desired spontaneous themes:
- organized;
- precise;
- technical;
- operational;
- connected;
- information-rich but manageable;
- consistent with Endfield / in-world terminal.

Do not count a theme as evidence if the interviewer supplied the word first.

Negative themes to watch:
- cluttered;
- decorative;
- fake sci-fi;
- generic dashboard;
- confusing;
- cramped;
- too sparse;
- looks like many unrelated cards.

## 10. Endfield continuity check

This is a domain-comparison exercise, not a usability test.

Procedure:
1. complete normal tasks first;
2. then show selected Endfield reference screens;
3. ask which structural/visual relationships feel shared;
4. record concrete reasons, not a yes/no “looks similar” answer.

Look for:
- operational framing;
- object-as-record treatment;
- relation graphics;
- task-driven density;
- Display/Functional/Metadata contrast;
- Dual Canvas / Signal Yellow hierarchy;
- contours as measurement/classification/brand texture;
- restrained state motion.

Failure signal:
similarity is explained only as “yellow”, “lines”, “hexagons”, or “sci-fi”.

## 11. Recording format

For each observation:

```
Build / commit:
Viewport / device:
User mode:
Task:
Outcome: success / partial / fail
Time:
Misclicks / wrong turns:
Observed behavior:
Participant wording:
Design hypothesis affected:
Evidence strength:
Next action:
```

Separate:
- direct observation;
- participant statement;
- designer interpretation.

## 12. Decision thresholds

Do not redesign from one isolated preference comment.

Prioritize a change when:
1. a hard accessibility/operability constraint fails;
2. multiple participants fail the same primary task;
3. a consistent misunderstanding maps to the semantic/IA model;
4. a visual hypothesis repeatedly produces the wrong attention order;
5. an Endfield-domain choice harms task performance.

Single-user taste differences should normally stay as hypotheses unless the
product has a specific reason to optimize for that preference.

## 13. Release-candidate validation order

1. automated tests/build;
2. keyboard/reduced-motion pass;
3. representative viewport review;
4. short-exposure hierarchy test;
5. dictionary quick-reference tasks;
6. calculator operational tasks;
7. open-ended impression elicitation;
8. Endfield continuity comparison;
9. record findings and update ADR/spec before changing implementation.

The purpose is to avoid changing pixels first and inventing a rationale later.
