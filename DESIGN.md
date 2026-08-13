---
name: TrackerPal
description: A modern, emerald-led shipping console for scanning package status and acting quickly.
colors:
  forest-ink: "#10271f"
  muted-sage: "#586d64"
  quiet-line: "#d6e3dc"
  white-surface: "#ffffff"
  soft-surface: "#f3f8f5"
  ambient-mist: "#edf5f0"
  operational-emerald: "#08734b"
  brand-emerald-deep: "#065f46"
  brand-emerald-bright: "#10b981"
  exception-red: "#b42318"
  focus-emerald: "#087a55"
typography:
  display:
    fontFamily: "Aptos, 'Segoe UI Variable Text', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "31px"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Aptos, 'Segoe UI Variable Text', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  metric:
    fontFamily: "Aptos, 'Segoe UI Variable Text', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Aptos, 'Segoe UI Variable Text', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  control:
    fontFamily: "Aptos, 'Segoe UI Variable Text', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 750
  filter:
    fontFamily: "Aptos, 'Segoe UI Variable Text', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
  label:
    fontFamily: "Aptos, 'Segoe UI Variable Text', 'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.045em"
rounded:
  field: "10px"
  control: "12px"
  metric: "14px"
  surface: "16px"
  pill: "999px"
spacing:
  compact: "6px"
  control: "10px"
  content: "14px"
  section: "18px"
  panel: "20px"
  major: "24px"
components:
  button-primary:
    backgroundColor: "{colors.operational-emerald}"
    textColor: "{colors.white-surface}"
    typography: "{typography.filter}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.forest-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  filter-active:
    backgroundColor: "#ddf3e7"
    textColor: "#075f3e"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0 13px"
    height: "44px"
  input:
    backgroundColor: "{colors.soft-surface}"
    textColor: "{colors.forest-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "46px"
  workspace:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.surface}"
---

# Design System: TrackerPal

## Overview

**Creative North Star: "The Emerald Dispatch Console"**

TrackerPal is a modern, focused operations surface: calm enough for repeated daily use, but decisive when a package needs attention. A light green ambient scene and forest-ink information frame keep the console crisp; operational emerald carries actions, focus, links, selection, due-today cues, and healthy state.

The visual identity is entirely emerald. The wordmark and brand icon use deep and bright emerald together, while metrics, filters, table signals, and form controls form a compact scan-and-act rhythm. Red remains strictly semantic for overdue, exception, destructive, and error states; all routine and positive signals stay green or neutral.

**Key Characteristics:**

- Emerald-led hierarchy across branding, actions, focus, links, and successful state.
- Forest-tinted text, white work surfaces, and pale green ambient backgrounds.
- Deep and bright emerald form the TrackerPal wordmark and icon signature.
- Compact status density with generous 44px interaction targets.
- Responsive data presentation that becomes labeled rows on small screens.

## Colors

The palette is cool, professional, and consistently emerald, with red reserved for operational exceptions.

### Primary

- **Operational Emerald:** The authoritative color for primary actions, received controls, links, success feedback, and positive operational state.
- **Bright Emerald:** The supporting green for selection atmosphere, due-today signals, active filters, and brand highlights.

### Secondary

- **Deep Brand Emerald:** The authoritative half of the TrackerPal wordmark, brand icon structure, and high-emphasis branded details.
- **Bright Brand Emerald:** The energetic half of the wordmark and the highlight color within brand artwork.

### Tertiary

- **Exception Red:** Reserved for overdue, exception, destructive, and error states.

### Neutral

- **Forest Ink:** Primary copy, item titles, and high-emphasis information.
- **Muted Sage:** Metadata, supporting copy, and subdued labels.
- **Quiet Line:** Field, control, row, and divider boundaries.
- **White Surface:** Workspace, metric, modal, and button surfaces.
- **Soft Surface:** Search fields, table headers, and quiet hover layers.
- **Ambient Mist:** The pale green base of the page scene.

### Named Rules

**The Emerald Continuity Rule.** Brand marks, primary actions, focus rings, links, selected states, and success feedback stay within the emerald family.

**The Status Has Meaning Rule.** Bright and muted emerald distinguish routine status; red is reserved for exceptions and errors. Color always supplements explicit text.

**The One Brand Family Rule.** Do not introduce a separate accent family into the wordmark, icon, or routine interface controls.

## Typography

**Display Font:** Aptos (with Segoe UI Variable Text, Segoe UI, and system sans-serif fallbacks)
**Body Font:** Aptos (with Segoe UI Variable Text, Segoe UI, and system sans-serif fallbacks)

**Character:** A single workhorse sans-serif family keeps the console native, modern, and exceptionally legible. Weight, case, tabular numerals, and compact tracking create hierarchy without introducing a display typeface.

### Hierarchy

- **Display** (900, 31px, 0.95): The compact two-tone emerald TrackerPal wordmark only.
- **Headline** (700, 22px, 1.2): Dialog and major task titles.
- **Metric** (700, 30px, 1): Dashboard counts with tabular numerals.
- **Body** (400, 16px, 1.4): Field values, table values, and form content.
- **Control** (750, 16px): Primary and secondary button labels.
- **Filter** (700, 16px): Main-app filter labels and their active state.
- **Label** (700, 12px, 0.045em): Uppercase metric captions, table headers, and mobile row labels.

### Named Rules

**The Scan Before Flourish Rule.** Prefer weight, alignment, and tabular figures over ornamental typography.

## Layout

The main app sits in a centered fluid container capped at 1360px, with responsive horizontal padding from 16px to 40px. Brand and actions share the top row; seven status metrics form the next scan layer; the search, filter, and order workspace is the dominant surface below. Spacing is compact and repeatable, using 6-24px gaps and insets.

The base layout first collapses into a one-column toolbar and form at 860px; the later visual-system overrides keep metrics at four columns until 1080px and stop constraining the order region's height. At 680px, actions form a two-column control grid with the primary action full-width, metrics become two columns, filters become a horizontally scrollable rail, the modal docks toward the bottom, and the table becomes labeled rows with the received control held in a dedicated first column. The browser side panel keeps the same emerald system in a narrower card-based layout and stacks its form below 380px.

**The Data Reflows Rule.** Never preserve a desktop-width table by forcing horizontal page scrolling on mobile; convert columns into explicit labeled rows.

## Elevation & Depth

Depth is layered but restrained. Pale green tonal backgrounds establish the ambient scene, white surfaces establish work zones, and translucent deep-ink shadows separate only the principal workspace, metric cards, floating feedback, dialog, and compact side-panel cards. Hover elevation is a small response, not a decorative float.

### Shadow Vocabulary

- **Control Rest** (`0 3px 10px rgba(16, 35, 59, 0.05)`): Quiet separation beneath main-app buttons.
- **Control Hover** (`0 7px 16px rgba(0, 0, 0, 0.1)`): Brief lift for actionable controls.
- **Metric** (`0 7px 24px rgba(16, 35, 59, 0.07)`): Low ambient separation for main-app summary cards.
- **Workspace** (`0 18px 45px rgba(16, 39, 31, 0.12)`): The main operational plane.
- **Toast** (`0 16px 36px rgba(16, 35, 59, 0.22)`): Stronger temporary elevation for live feedback.

### Named Rules

**The Neutral Elevation Rule.** Shadows use translucent deep ink or black; emerald communicates state through fills, strokes, and type rather than cast light.

## Shapes

Forms are gently rounded and practical: 10px for fields and selectors, 11-12px for buttons, 14-15px for metric and package cards, and 16px for major surfaces and dialogs. Fully rounded pills are reserved for filters and compact status signals. Borders remain thin and cool; the brand icon retains its own silhouette without a decorative tile.

**The Radius Follows Scale Rule.** Larger containers receive larger corners; do not give every element the same generic radius.

## Components

### Brand Mark

- **Wordmark:** "Tracker" uses deep emerald and "Pal" uses bright emerald at a compact 900 weight.
- **Icon:** The emerald parcel/check artwork stands alone with a soft deep-ink drop shadow and no enclosing tile.

### Buttons

- **Shape:** Solid, substantial controls with gently rounded corners and a 44px minimum height in the main app.
- **Primary:** Operational emerald with white text and 16px horizontal padding.
- **Hover / Focus:** Hover lifts by 1px with a slightly stronger shadow; keyboard focus uses a 3px emerald outline with a 2px offset; active state returns to the baseline.
- **Secondary / Caution:** Secondary actions are white with a cool border. Cautionary controls use a pale emerald field, emerald border, and deep emerald text; destructive meaning is carried by explicit red labels or feedback.

### Chips

- **Style:** Fully rounded filter controls with subdued sage labels.
- **State:** Selected chips use a pale emerald fill, deep emerald label, and emerald border; `aria-pressed` mirrors the visual state.

### Cards / Containers

- **Corner Style:** 14px main metrics, 15px side-panel package cards, and 16px principal surfaces.
- **Background:** White over a pale green ambient scene.
- **Shadow Strategy:** Ambient metric and package-card shadows; stronger workspace shadow.
- **Border:** Metrics and principal workspaces are borderless; internal rows and toolbars use quiet dividers.
- **Internal Padding:** 13-18px metrics and 14-20px task regions.

### Inputs / Fields

- **Style:** Cool, near-white fields with 10-12px corners, quiet borders, and a 44-48px minimum height.
- **Focus:** A consistent 3px emerald outline sits outside the component.
- **Error / Disabled:** Busy controls reduce opacity and use a wait cursor; errors move to red live feedback rather than recoloring every field.

### Navigation

The main console has no conventional site navigation. The top action cluster is the operational command area; filters are local view navigation and remain reachable as a scrollable 44px rail on mobile. The browser side panel adds a two-tab switcher whose active tab is a white surface with deep emerald type and a quiet green border.

### Status Metrics and Signals

Metric cards use large tabular values, uppercase labels, and a 4px semantic baseline. Row signals use compact pills for overdue, due today, delivered, missing ETA, and exceptions. Semantic color supplements explicit text; it never replaces it.

### Dialog and Live Feedback

The add-order dialog uses a dimmed, blurred backdrop, a 16px white surface, a two-column-to-one-column form, trapped focus, Escape dismissal, and focus return. Toasts announce success politely and errors assertively. Reduced-motion preferences collapse transitions to effectively instantaneous feedback.

## Do's and Don'ts

### Do:

- **Do** keep branding and routine interaction entirely within the deep-to-bright emerald family.
- **Do** use deep and bright emerald together for the TrackerPal wordmark and icon signature.
- **Do** make status the first scanning cue through explicit labels, ordering, and restrained semantic color.
- **Do** keep primary main-app controls at least 44px tall and retain the visible emerald focus treatment.
- **Do** preserve labeled-row mobile behavior, modal focus management, live regions, and HTTP(S)-only tracking links.

### Don't:

- **Don't** reintroduce a non-emerald split-color treatment into TrackerPal branding.
- **Don't** use red as decoration or as a routine accent; it communicates overdue, exception, destructive, and error states only.
- **Don't** add glassy, colored, or theatrical shadows; elevation stays neutral and operational.
- **Don't** compress dense controls below their source-defined touch targets or hide state behind color alone.
- **Don't** allow untrusted tracking protocols or remove the dialog, focus, reduced-motion, and live-feedback safeguards.
