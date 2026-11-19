# ADR 0001: Preserve the established storefront design system

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The Angular engineering standard selects Angular Material when a project has no established design system. This storefront already has a custom furniture-brand visual language, shared color and layout tokens, and theme-aware component styles used across the catalog and admin pages.

## Decision

Continue the existing CSS and SCSS design system. New and changed UI must use its shared tokens, scoped component styles, semantic HTML, responsive layouts, keyboard interactions, and contrast requirements. Do not introduce Angular Material or another UI library for isolated features.

## Alternatives considered

- **Adopt Angular Material across the storefront:** This would replace established branded components and require a broad visual migration with limited benefit to the requested state-management and strictness work.
- **Mix Material into existing pages:** This would create competing theming and accessibility conventions and increase bundle and maintenance costs.

## Consequences

- Existing product branding remains consistent across pages.
- The project owns accessibility behavior for custom controls and must verify it in component and end-to-end tests.
- Shared design tokens remain the source for common colors, spacing, and surfaces; isolated styles stay component-scoped.
- A future full design-system migration requires a separate decision and visual review.
