# Contributing

See the [README](./README.md) for library usage. This file covers repository development.

## Dev Setup

```bash
pnpm install
pnpm run dev
```

Open the local Vite URL shown in the terminal to view the demo.

## Scripts

- `pnpm run dev` - Start the Vite development server.
- `pnpm run build` - Build demo SPA assets into `dist-demo/`.
- `pnpm run build:lib` - Build the library into `dist/`.
- `pnpm run preview` - Preview the demo build locally.
- `pnpm run typecheck` - Run TypeScript type checks.
- `pnpm run lint` - Run oxlint.
- `pnpm run lint:css` - Run stylelint on CSS files.
- `pnpm run lint:css:fix` - Autofix CSS lint violations where possible.
- `pnpm run format` - Format code with oxfmt and autofix CSS with stylelint.
- `pnpm run format:check` - Verify formatting.
- `pnpm run test` - Run browser unit tests with Vitest.
- `pnpm run integration-test` - Run Playwright integration tests.
- `pnpm run docs:api` - Generate TypeDoc API documentation into `docs/api/`.
- `pnpm run screenshot` - Capture `docs/images/customizable-select-demo.png`.
- `pnpm run ci` - Run typecheck, lint, CSS lint, format check, library build, demo build, docs, and tests.

## Demo Verification

Use this quick scenario when validating the demo behavior on a hosted page:

1. Open the page and confirm `Event Log` starts with `demo initialized`.
2. Open the selection, search for `Vue`, and select it.
3. Clear the selection and verify the locked value remains.
4. Operate the control with Arrow keys, Enter, and Escape.
5. Toggle disabled mode and theme mode; verify both actions are reflected in the UI and log.

Expected result: all controls are interactive, accessible, responsive, and every demo action appends a timestamped event log entry.

## Development Notes

- The package is native TypeScript, HTML, and CSS. Do not add runtime framework dependencies unless explicitly requested.
- The library is built with [tsdown](https://tsdown.dev) into `dist/`.
- The demo app is built with Vite into `dist-demo/`.
- TypeScript formatting and linting are handled with the Oxc toolchain (`oxfmt` and `oxlint`).
- CSS linting is handled with `stylelint` and `stylelint-config-standard`.
- API documentation is generated with [TypeDoc](https://typedoc.org).
- Commit messages follow Conventional Commits.

## CSS Linting

CSS files are linted with [stylelint](https://stylelint.io/) using `stylelint-config-standard` as the base ruleset.

### Conventions

| Rule | Value | Notes |
|---|---|---|
| Indentation | Tabs | Enforced by `oxfmt`; stylelint 17 removed built-in indentation. |
| Selector class naming | `customizable-select*` or `demo-*` | Core classes use `.customizable-select`; demo-shell classes use `demo-`. |
| Custom property naming | `--customizable-select-*` or `--demo-*` | Design tokens use prefixed kebab-case. |
| `!important` | Allowed | Avoid unless needed for state or external integration. |
| Colour functions | Legacy notation | Project consistently uses `rgba()` for alpha colours. |
