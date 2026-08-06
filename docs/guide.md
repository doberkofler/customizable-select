# Customizable Select Guide

## Design Contract

`CustomizableSelect` enhances an existing `HTMLSelectElement` or `HTMLInputElement`. The source remains the form control and the generated combobox is its interactive presentation. Values are canonical strings because native form controls serialize values as strings; numeric option IDs are accepted and normalized with `String(id)`.

The library does not expose jQuery, global state, HTML-string templates, or a Select2 compatibility facade. Its public types are designed to support future data providers without pretending that remote data and pagination exist today.

## Options

| Option | Default | Behavior |
|---|---|---|
| `options` | Native select options or `[]` | Local options. IDs must be non-empty and unique after string normalization. |
| `multiple` | Native select state or `false` | Enables multiple values and `aria-multiselectable`. |
| `placeholder` | Source `placeholder` | Text shown with no selected option. |
| `searchable` | `true` | Shows local-search input in the dropdown. |
| `allowClear` | `true` | Shows clear and removable-tag controls. Locked values remain selected. |
| `closeOnSelect` | Opposite of `multiple` | Closes after an option is selected or unselected. |
| `allowUnknownValue` | `false` | Retains values that do not have a matching option. They have no visual selection. |
| `disabled` | Source state | Prevents focus and interaction. |
| `readOnly` | Input source state | Preserves focusability while preventing changes. |
| `theme` | `system` | Controls the color scheme: `light`, `dark`, or `system` (follows OS `prefers-color-scheme`). Sets a `data-theme` attribute on the generated root element. |
| `messages` | English defaults | Overrides search, clear, remove, and no-results text. |
| `filterOption` | Diacritic-insensitive substring | Replaces local matching. |
| `renderOption` | Option text | Returns a string or DOM `Node` for a result. |
| `renderSelection` | Option text | Returns a string or DOM `Node` for a selected value. |
| `parseInputValue` | CSV in multiple mode | Converts an input value into IDs. |
| `serializeInputValue` | CSV in multiple mode | Converts selected IDs into an input value. |

Render hooks deliberately accept and return DOM-safe values. Strings are assigned through `textContent`; the library never interprets option text as HTML. A returned `Node` is trusted application code.

## Values And Options

`setValue()` accepts a string, number, readonly array, or `null`. Returned values are strings:

```ts
select.setValue([1, 'two']);
select.getValues(); // ['1', 'two']
```

Duplicate values are removed. Unknown values are discarded unless enabled globally or for one update. Locked options are inserted into every value update and cannot be removed through the UI. Single-select datasets may contain at most one locked option.

`setSelectedOptions()` merges typed options into the current dataset before selecting them. This is useful when a separately loaded record must be displayed before the full dataset is available.

## Source Synchronization

User changes update the source before dispatching events. Select sources use native selected options. Input sources serialize through the configured serializer.

External code can update the source and dispatch a bubbling `change` event to refresh the component:

```ts
source.value = 'react';
source.dispatchEvent(new Event('change', {bubbles: true}));
```

Disabled, readonly, multiple, required, and placeholder attribute changes are observed. Call methods when possible because they provide immediate typed behavior.

## Keyboard And Accessibility

The generated UI uses combobox and listbox semantics with stable `aria-controls`, `aria-expanded`, `aria-selected`, `aria-disabled`, and `aria-activedescendant` relationships.

| Key | Behavior |
|---|---|
| Enter or Space | Opens from the selection; Enter selects the active result. |
| Arrow Down or Arrow Up | Opens and moves through enabled results with wrapping. |
| Home or End | Moves to the first or last enabled result. |
| Escape | Closes and returns focus to the selection. |
| Tab | Closes and follows normal document focus order. |

Disabled results are exposed but skipped by keyboard navigation. Search receives an accessible name from `messages.search`.

## Lifecycle

Direct construction does not use a global registry. Factory construction maintains one instance per source:

```ts
const instance = createCustomizableSelect('#framework', options);
getCustomizableSelect('#framework') === instance;
destroyCustomizableSelect('#framework');
```

Creating another factory instance for the same source destroys the previous one. `destroy()` is idempotent, removes listeners and generated DOM, and restores the source presentation and original select options. Calling another instance method after destruction throws to expose lifecycle misuse.

## Theme

The `theme` option controls the component color scheme. It sets a `data-theme` attribute on the generated root element and accepts `'light'`, `'dark'`, or `'system'` (default). Use `setTheme()` to change it after construction.

| `theme` value | `data-theme` attribute | Visual result |
|---|---|---|
| `'system'` (default) | `system` | Respects OS `prefers-color-scheme` |
| `'light'` | `light` | Always light (default design tokens) |
| `'dark'` | `dark` | Always dark (`[data-theme="dark"]` overrides) |

Because CSS uses bare `[data-theme]` selectors, consumers can also set the attribute on any ancestor element (e.g. `<html>`) to apply the theme without passing the option:

```ts
document.documentElement.dataset['theme'] = 'dark';
```

Dark-mode tokens override background, text, border, shadow, and tag colors. Accent and focus-ring colors are preserved across themes.

## Styling

Import `customizable-select/styles.css`. All component classes use `.customizable-select*`; all design tokens use `--customizable-select-*`. Override tokens on a container or theme root:

```css
.product-theme {
	--customizable-select-accent: #7253c7;
	--customizable-select-border-focus: #7253c7;
	--customizable-select-radius: 4px;
}
```

The mobile stylesheet anchors the dropdown above the viewport edge to avoid narrow-container clipping.

## Select2 Migration

| Select2 concept | Customizable Select |
|---|---|
| `$(select).select2(options)` | `new CustomizableSelect(select, options)` |
| `.val(value).trigger('change')` | `setValue(value, {dispatchChange: true})` |
| `select2('open')` / `select2('close')` | `open()` / `close()` |
| `select2('data')` | `getSelectedOptions()` |
| `data` | `options` |
| `templateResult` | `renderOption` |
| `templateSelection` | `renderSelection` |
| `language.noResults` | `messages.noResults` |
| jQuery `change` | Native source `change` |

Remote data, pagination, tagging, option groups, and Select2 event aliases are not part of the local-data core. Do not emulate them through rendering hooks; add them through future dedicated provider contracts.
