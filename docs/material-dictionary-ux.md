# Material Dictionary UX model

## Goal

The dictionary is an item-centered reference surface. The selected item is always the subject.
The UI must answer two different questions without mixing their direction:

1. **Production** — “How is this item made?” (upstream: product → required inputs)
2. **Uses** — “Where is this item used?” (downstream: material → consumers / reachable destinations)

A downstream path from a material to a reachable product is a **use path**, not the product's
production route.

## Information architecture

### Item identity

The item selector, name, icon, category, subtype, and tier identify the current object.
Description/effect text and the item's **immediate production recipe(s)** are part of the
item's basic information and are visible by default. A recipe here is a concise item-level
fact: facility, crafting time, all inputs, and all outputs.

The recursive production view below is not a replacement for that basic recipe. It is the
expanded dependency view used to answer the broader "what does this ultimately require?"
question. The default presentation is a connected **production flow**: material nodes and
process nodes are linked spatially so branching, merging, and alternative recipes remain
visible at a glance.

### Production

Production is owned by the selected item. It uses the upstream requirement tree as the data
model and renders it as a connected flow graph. It includes **all recipe inputs recursively**,
including co-inputs. Alternative normal producer recipes remain separate branches rather than
being silently chosen. On portrait/mobile layouts the graph flows vertically; wider layouts use a
left-to-right flow.

Recovery/disassembly operations are not normal upstream manufacturing choices. In particular,
dismantling a filled container to recover an empty bottle must not create an alternative production
branch for that bottle; otherwise packaging loops and recovery variants dominate the tree. Recovery
data may be surfaced separately when needed, but is excluded from the default production tree and
the item's basic production-recipe summary.

Quantities are normalized to one unit of the selected item.

### Uses

Uses is downstream exploration. The default view is direct consuming recipes. Reachable products,
trade destinations, and facility uses are secondary destinations. Selecting one shows the shortest
**use path** from the selected item to that destination.

## Responsive rules

The design follows mobile-first hierarchy without hiding basic item facts:

- On narrow screens, item identity, description/effect, and immediate recipe(s) remain inline and
  visible on initial load.
- Basic information is **not** moved behind an expand/details control merely to fit one viewport.
  When it does not fit, the page uses normal vertical document scrolling and the basic-information
  block scrolls away naturally as the user reaches the work area.
- Decorative system chrome is removed on narrow screens.
- Destination controls exist only in the Uses context.
- Production gets the full workbench width; the destination sidebar appears only for Uses.
- Recursive production branches use compact vertical rows and minimal indentation so depth does not
  collapse usable width.

## Terminology

- **Production route**: selected product → every required input, recursively.
- **Required materials**: the material requirements represented inside the production route.
- **Uses**: recipes or external systems that consume the selected item.
- **Use path**: selected item → one chosen reachable downstream destination.

Do not label a downstream material-to-product path as a production route.
