# Material Dictionary UI Specification

This specification applies the principles in `docs/ui-design-basis.md` to the material dictionary.

## 1. Primary user modes

The dictionary must satisfy these tasks in order:

1. **Quick reference** — identify an item and its immediate production recipe.
2. **Structure investigation** — understand upstream production and downstream uses.
3. **Exploration** — browse or search the material corpus.

The first two tasks must not compete visually.

## 2. Page-level attention sequence

Default reading order:

1. current item;
2. immediate production recipe / description;
3. Production vs Uses context switch;
4. relationship workspace;
5. secondary destinations / browse controls.

The top chrome identifies the tool but must not visually outrank the selected item.

## 3. Area matrix

| Area | Primary question | Experience intent | Density | Visual priority |
| --- | --- | --- | --- | --- |
| Global header | Where am I? | stable tool context | low | low |
| Material record strip | What surface is this? | world/system continuity | very low | low |
| Item identity | What am I looking at? | E1 capture | low | highest |
| Description/effect | What is it? | object understanding | low | medium |
| Immediate recipe | How is it directly made? | fast answer | medium | high |
| Production/Uses switch | Which direction am I investigating? | context boundary | low | high |
| Production flow | What ultimately makes this? | E2 connection | low local / high spatial | highest within workbench |
| Uses list | Where is it consumed? | scan candidates | high | medium-high |
| Use path | How does it reach this destination? | focused trace | medium-low | high |
| Destination sidebar | What downstream endpoints exist? | exploration | high | secondary |
| Material picker | Which object should I inspect? | searchable corpus | high | task-dominant while open |

## 4. Item identity

### Content

Always visible:
- icon/image;
- item name;
- category;
- subtype;
- tier;
- selection affordance.

Optional state:
- stock-candidate indication;
- direct production-method count;
- direct-use count.

### Hierarchy

Item name is the strongest text on the page.

Metadata is deliberately much smaller. It should read as annotation attached to the subject, not as equal-weight chips.

The item region may use stronger contour texture than the rest of the page because the role is “captured / classified object”.

### Interaction

Selecting the identity opens the material picker. This is a retargeting operation: the rest of the interface updates around the new subject.

## 5. Immediate recipe

Immediate recipe is part of item basic information, not part of the recursive production graph.

### Grammar

Each recipe should read as:

```
INPUT(S) → PROCESS / FACILITY / TIME → OUTPUT(S)
```

On mobile the same grammar becomes vertical:

```
INPUT(S)
   ↓
PROCESS
   ↓
OUTPUT(S)
```

### Density

Material chips remain compact. The process region should not be a full-size card equal to a production-flow node.

### Multiple producers

Normal alternative producers are shown as separate recipes.

Recovery/dismantling recipes are excluded from the default production meaning.

## 6. Production / Uses boundary

This switch separates:

- **Object information above** — properties belonging to the selected item itself.
- **Network information below** — relationships to other items and systems.

It should remain visually stronger than a normal subsection header.

On mobile it may be sticky once the user reaches the relationship workspace; the basic item information itself should scroll away.

## 7. Production flow

### Purpose

Give an overview of dependency structure before details.

The graph should reveal:
- direction;
- input branches;
- process nodes;
- intermediate items;
- alternative recipes;
- terminal/raw inputs.

### Node hierarchy

Item nodes:
- compact;
- icon + name + required quantity;
- selected target receives stronger emphasis.

Process nodes:
- smaller than item nodes;
- facility / time;
- visually read as connectors/transformations, not as equally important “cards”.

### Canvas hierarchy

1. relation edges;
2. item/process nodes;
3. semantic emphasis;
4. technical grid / contour;
5. metadata.

Background texture must never compete with relation edges.

### Technical text

Valid:
- `SUPPLY RELATION CANVAS`;
- `PROCESS`;
- graph state such as node/process counts.

Avoid identifiers with no model referent.

### Interaction

- pan/zoom for spatial exploration;
- selecting an item retargets the dictionary while preserving Production context;
- initial view fits the graph;
- portrait layout flows top-to-bottom;
- wider layout flows left-to-right.

## 8. Uses default view

This is a scan surface, so it should be denser than the item inspection region.

Each repeated row/lane uses the same order:
1. consuming process;
2. facility/time;
3. outputs;
4. relationship to selected item.

Do not inflate every lane with explanatory text.

## 9. Selected use path

Once a destination is selected, unrelated candidates should recede.

The visual sequence becomes:
selected item → process → intermediate/output → … → destination.

This is a focused trace, not a comparison view, so density should decrease relative to the uses list.

## 10. Material picker

The picker optimizes recognition and scanning.

Show in each tile only what helps selection:
- item icon;
- name;
- subtype/category cue;
- tier;
- limited relationship counts only when useful for disambiguation.

Do not include description or full recipe in the grid.

Search query remains visible with results so users do not need to remember what they searched for.

## 11. Responsive composition

### Desktop

- item identity and immediate recipe may share horizontal space;
- production canvas gets maximal width;
- Uses may expose a right destination sidebar.

### Mobile

Order:
1. selected item;
2. immediate recipe and description;
3. Production / Uses switch;
4. relationship workspace.

Basic information is normal document flow and scrolls away.

The workbench should not reserve fixed viewport space above itself merely to keep item information permanently visible.

## 12. Contour hierarchy

Contours are semantic/brand texture, not prohibited background.

Suggested relative strength, subject to visual testing:
- selected-item inspection field: strongest;
- picker/category areas: light-medium;
- shell: very light / partial;
- production flow canvas: weakest, because relation edges are primary.

Avoid repeating the same contour crop everywhere.

## 13. First implementation priorities

High-confidence changes:
1. strengthen selected-item hierarchy;
2. make immediate recipe explicitly input → process → output;
3. reduce production-flow node size and make process nodes subordinate;
4. replace meaningless technical filler with semantic labels;
5. keep mobile basic info in normal document flow.

Later validation-dependent work:
- contour generation/crops and opacity;
- exact typography scale;
- fine graph spacing;
- transition timing;
- desktop vs tablet breakpoint tuning.
