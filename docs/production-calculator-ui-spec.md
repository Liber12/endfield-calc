# Production Calculator UI Specification

This specification applies the project-wide rationale in `docs/ui-design-basis.md`
to the production calculator.

## 1. Primary user mode

The calculator is primarily an **operational planning surface**.

Typical tasks:
- define production targets and target rates;
- change region / production assumptions;
- inspect the calculated production model;
- compare physical/theoretical requirements;
- find capacity violations and bottlenecks;
- understand how the plan is connected.

The user is expected to tolerate high information density here. The goal is not
to make the calculator sparse; the goal is to make the operational hierarchy
obvious.

## 2. Intended internal state

The calculator should create:

1. **“I am defining the plan.”**
   The input rail must read as the authoritative source of plan assumptions.

2. **“The system has resolved those inputs into a production model.”**
   Table/graph are outputs of the current plan, not another editable form.

3. **“I can see the plan's operating condition.”**
   Power, building count, grid area, logistics, constraints, and warnings are
   telemetry attached to the resolved plan.

4. **“This is a precise operational console.”**
   Stable alignment, tabular numerics, explicit state, and restrained
   transitions should dominate decorative animation.

## 3. Page-level hierarchy

Desktop reading hierarchy:

```
GLOBAL TOOL / MODE
        ↓
PRODUCTION PLAN INPUTS  →  RESOLVED PRODUCTION MODEL
                                  ↓
                           PLAN TELEMETRY
```

This is intentionally asymmetric:

- left rail = **cause / assumptions**;
- main area = **resolved result**;
- bottom dock = **state / telemetry**.

The three areas should not look like three equivalent cards.

## 4. Area matrix

| Area | Question | Experience intent | Density | Priority |
| --- | --- | --- | --- | --- |
| Global header | Which tool is open? | stable context | low | low |
| Production-plan system strip | What operational surface is this? | world/system continuity | very low | low |
| Plan rail / Targets | What am I asking the factory to produce? | plan authority | high | highest input |
| Plan rail / Options | Under what assumptions? | controlled configuration | medium-high | secondary input |
| Production table | What does the solved plan require? | exact comparison | high | primary output |
| Production graph | How is the solved plan connected? | structural overview | low local / high spatial | primary output |
| Telemetry ticker | Is the plan healthy and how large is it? | immediate state | high numeric | persistent |
| Expanded telemetry | Where are the costs / problems? | diagnostic detail | high | secondary output |
| Target picker | What should be added to the plan? | corpus search | high | modal task |

## 5. Production plan rail

### Semantics

Targets and options are inputs. They should be visually grouped as one plan
console, but Targets must dominate Options.

The user should not need to infer which values are editable assumptions and
which are calculated output.

### Targets

Priority order:
1. target item;
2. target rate;
3. lock/max/fit state;
4. secondary controls.

Target rows should remain compact and repeatable. The rail is a scanning and
editing surface, so consistent alignment is more important than generous
whitespace.

### Options

Options are plan assumptions, not peer targets.

Keep:
- region;
- structures that directly affect calculation capability;
- output-affecting switches;
- access to deep settings.

Avoid turning every option into a visually heavy card.

## 6. Production model surface

Table and graph are two representations of the same resolved plan.

The view switch should act as a strong context boundary:

- **Table** — comparison / exact values / editing recipe choices.
- **Graph** — topology / dependency / flow.

The surface should carry a small semantic label such as
`PRODUCTION MODEL`. This is valid technical text because it names the
actual region function.

## 7. Production table

The table is intentionally dense.

Rules:
- keep column alignment stable;
- use tabular numerics for quantities and rates;
- header has stronger contrast than body;
- selected / exceptional states use semantic emphasis, not arbitrary color;
- row hover is subtle;
- warning/over-limit information should not rely on color alone.

The table should not inherit the low-density “inspection surface” treatment
used by the material dictionary.

## 8. Production graph

Graph hierarchy:
1. dependency edges and topology;
2. production/facility nodes;
3. selected/exception states;
4. technical grid;
5. decorative texture.

The graph is an operational canvas. Contours, if present, should be weaker than
in item inspection because relation lines are already the primary spatial
language.

## 9. Telemetry

The bottom dock is not a generic details panel. It is **plan telemetry**.

Collapsed/slim:
- immediate operating state;
- critical issue count;
- power / building / grid / logistics headline values.

Expanded:
- same headline telemetry remains the anchor;
- issues appear first;
- facilities, supply, imports, and byproducts follow.

A semantic label such as `PLAN TELEMETRY` is valid even though it is not
actionable data; it names the region's role.

## 10. Mobile composition

Desktop layout must not simply be scaled down.

Portrait task split:
- **Plan** — target and option editing.
- **Production** — table/cards or production graph.
- telemetry remains available from both.

The bottom navigation is an operational mode switch, not a floating consumer
app tab bar. It should therefore use the same flat surface / active-signal
grammar as the desktop view switches rather than rounded/shadowed floating
cards.

## 11. Technical text policy for calculator

Valid examples:
- `ENDFIELD INDUSTRIES // PRODUCTION PLAN`
- `PRODUCTION MODEL`
- `PLAN TELEMETRY`
- `TARGETS`
- `PROCESS`

Avoid:
- invented run numbers;
- fake facility/sector identifiers;
- “LIVE” unless there is a meaningful live state;
- arbitrary grid/console serials.

## 12. Motion

Motion should communicate changes in plan state.

Preferred:
- opacity + small linear translation;
- short duration;
- no overshoot;
- graph re-layout as a visible state transition.

Avoid:
- spring-like pill pop;
- scale bounce on newly added targets;
- decorative rotation.

## 13. Texture

The calculator is a dense operational surface.

Texture strength:
- app shell: very light broad contour / grid;
- plan rail: very light classification/technical texture;
- production table: nearly none behind data rows;
- production graph: light grid, contours subordinate;
- telemetry: mostly solid high-contrast surfaces.

## 14. Validation

Task checks:
- user can identify where to edit targets without trial-and-error;
- user can distinguish editable plan inputs from calculated outputs;
- user can switch between exact/table and structural/graph representations;
- warning state remains visible when telemetry is collapsed;
- mobile user can move between Plan and Production without losing telemetry.

Experience checks:
- spontaneous descriptions should include concepts such as
  “operational”, “precise”, “dense but organized”, or “factory planning”;
- do not prompt with those exact adjectives during testing.
