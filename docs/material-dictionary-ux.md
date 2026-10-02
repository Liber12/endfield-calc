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
Description/effect text and secondary statistics are supporting information, not the primary task.

### Production

Production is owned by the selected item. It uses the upstream requirement tree and includes
**all recipe inputs recursively**, including co-inputs. Alternative producer recipes remain
separate branches rather than being silently chosen.

Quantities are normalized to one unit of the selected item.

### Uses

Uses is downstream exploration. The default view is direct consuming recipes. Reachable products,
trade destinations, and facility uses are secondary destinations. Selecting one shows the shortest
**use path** from the selected item to that destination.

## Responsive rules

The design follows progressive disclosure and mobile-first hierarchy:

- On narrow screens, the item identity row and the primary task switch appear before descriptive text.
- Description/effect text moves to a bottom sheet opened by **Details**.
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
