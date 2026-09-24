# RepoView design-system inventory

This inventory records the supplied `design-system/` folder as inspected on
September 21, 2026. It is the visual source of truth for RepoView.

## What was provided

The folder is a Next.js documentation/showcase app for the Supabase design
system. It contains the app shell, component documentation and examples,
theme definitions, typography/font setup, Markdown/code presentation styles,
and navigation patterns. It is not a standalone component package.

The showcase imports implementation packages that are not present in this
repository:

- `ui` for the base primitives;
- `ui-patterns` for composed product patterns;
- `common` for the theme provider and metadata helpers;
- `icons` for the product icon registry;
- shared `config` and workspace `tsconfig`/package catalog entries.

The supplied showcase stylesheet also imports shared files at
`config/tailwind.config.css` and `config/typography.css`, which are not in the
provided folder. Therefore the showcase cannot be imported as an app or
package unchanged from this repository. Its source, examples, tokens, and
documentation remain authoritative; RepoView will consume them through
RepoView-owned compatibility/composition components rather than modifying the
reference tree or introducing another UI framework.

## Styling and visual language

- Tailwind CSS v4-style CSS configuration using `@import`, `@theme`, `@source`,
  `@layer`, and `@apply`.
- Semantic HSL theme variables for background, foreground, card, popover,
  primary, secondary, muted, accent, destructive, border, input, ring, and
  radius. The theme catalog includes zinc, slate, stone, gray, and neutral
  families; RepoView uses the restrained default/zinc direction unless a
  product requirement calls for another supplied theme.
- Inter for UI text, Manrope for headings, and Source Code Pro for source/code
  surfaces, with system fallbacks.
- Compact typography tuned around a 0.9375rem base, heading-weight 600, and
  monospace-specific sizing/weight rules.
- Semantic surfaces include `bg-background`/`bg-default`, foreground-muted
  and foreground-lighter text, surface variants, borders, focus rings, and
  rounded cards/controls. No arbitrary RepoView token system should be added.
- The source-code variables and Supabase Shiki theme in
  `styles/code-block-variables.css` and `lib/themes/supabase-2.json` define
  light/dark token colors, code backgrounds, and selection/highlight behavior.
- Theme behavior is designed around `next-themes` with light, dark, and system
  modes, `suppressHydrationWarning` on the root, and mounted guards before
  rendering theme-dependent controls.

## Primitive inventory and RepoView usage

The documented `ui` primitive surface includes Button (with default,
secondary, outline, ghost/text, loading, icon, and size variants), Card,
Badge, Input, Textarea, Label, Checkbox, Switch, RadioGroup, Select, Calendar,
Form, Field, Tabs, Table, Separator, ScrollArea, Skeleton, Alert, Dialog,
AlertDialog, Drawer, Sheet, DropdownMenu, ContextMenu, Popover, Tooltip,
Command, NavMenu, Sidebar, TreeView, Toggle, Progress, Avatar, Breadcrumb,
Pagination, Resizable, and typography helpers. Examples show composition
through named exports from `ui`, with `asChild` for link/button composition and
`loading` on submit buttons.

The documented `ui-patterns` surface includes PageContainer, PageBreadcrumbs,
PageNav, PageHeader, PageSection, FormItemLayout, Admonition,
EmptyStatePresentational, ErrorDisplay, FilterBar, MetricCard, InnerSideMenu,
MultiSelector, DataInputs/Input, DatePicker, TextConfirmModal,
ConfirmationModal, SkipToContent, Toc, and the Markdown primitives. These
patterns provide the layout, form, table, state, and document conventions for
the RepoView screens.

RepoView's planned composition map is:

| RepoView surface | Supplied pattern/primitive |
| --- | --- |
| Login | Card, Label, Input, Button, Alert, loading state |
| Admin shell | Sidebar/navigation, ScrollArea, Sheet, Tooltip, theme switcher, SkipToContent |
| Dashboard/repositories/shares/activity | PageContainer, PageBreadcrumbs, PageHeader, PageSection, Card, Badge, Table, EmptyState, Skeleton |
| Share form/settings | Form, FormItemLayout, Input, Textarea, Select, Switch, Checkbox, Alert, Dialog/Sheet |
| Viewer shell | compact top navigation, Badge, Breadcrumb, ScrollArea, Sheet, Tooltip, theme switcher |
| File tree | TreeView conventions, stable folder/file rows, keyboard focus and selection states |
| Code and Markdown | Source/code surface, CopyButton behavior, Markdown primitives, table overflow, Shiki line-number treatment |
| Errors and confirmations | Alert, ErrorDisplay/Admonition, AlertDialog/TextConfirmModal, EmptyState |

## Accessibility and responsive conventions

The inspected examples consistently use semantic labels, `sr-only` text for
icon-only table/header cells, visible focus classes, `aria-label` on tree and
menu controls, `asChild` composition for navigation, and keyboard-accessible
dialogs/sheets/dropdowns. The navigation pattern is a persistent desktop rail
with a mobile Sheet, while dense tables and Markdown tables are expected to
scroll horizontally. RepoView should preserve these conventions and respect
reduced motion.

## Consumption decision

RepoView will keep `design-system/` unchanged and excluded from the root app's
TypeScript/lint compilation because it depends on absent workspace packages.
The application will adopt its CSS token names, fonts, theme strategy,
component APIs/patterns, accessibility conventions, and Shiki theme in
`components/`, `styles/`, and `lib/` as app-specific compositions. Any missing
primitive will be implemented only as the smallest RepoView-specific wrapper
or native accessible composition using these supplied tokens and patterns;
no parallel Tailwind/theme/component framework will be introduced.
