# Comprehensive Design & UI/UX Audit — whysogood.app

**Audit Date:** 2026-09-30  
**Auditor:** Teamwork Design Auditor Subagent  
**Scope:** Header & Navigation, Homepage, All 11 Category Pages, 18+ Distinct Tool Pages, Simple Mode Workbench, Footer & Global UI Components, and Responsive Breakpoints (320px, 480px, 768px, 1024px, 1280px+).  
**Target Architecture:** Next.js 16 Static Export, React 19, Tailwind CSS v4, Custom Design System Tokens (`app/design-system.css`, `app/globals.css`).

---

## Executive Summary & Audit Methodology

An exhaustive, code-level and visual design inspection was conducted across every major surface of `whysogood.app`. The audit evaluated visual consistency, adherence to design system tokens, color contrast compliance under WCAG 2.1 AA, responsive layout stability across mobile/tablet/desktop breakpoints, and component ergonomics.

### Key Summary of Findings:
1. **Critical Fixed-Element Collisions:** The floating `FeedbackBubble` button and the global `ToastProvider` notification container share the exact same screen coordinates (`bottom: 24px, right: 24px`), causing all toast alerts to be obscured and unclickable beneath the feedback button.
2. **Double Arrow Artifact in `Select`:** Global CSS in `app/globals.css` applies an SVG chevron background image to all `select:not([multiple])`, while `Select.tsx` renders a React Lucide `<ChevronDown>` icon in `.c-select-icon` at the identical position, causing double overlapping arrows and a ghosting artifact on hover.
3. **Severe Mobile Horizontal Overflows:** Rigid grid definitions (`minmax(320px, 1fr)` and `minmax(340px, 1fr)`) across `DeveloperSplitPane`, `ImageResizerTool`, `TextDiffTool`, `JwtDecoderTool`, `SipCalculatorTool`, and `OutputList` force grid columns wider than mobile viewports (e.g. 288px available width on 320px devices), triggering page-wide horizontal scroll wobble.
4. **Header Mobile Squish:** The desktop search bar fails to hide on mobile viewports (< 768px), squeezing into the header alongside the Logo, Simple Mode CTA, Theme toggle, and Hamburger button, causing header overflow.
5. **Widespread Hardcoded Color Overrides:** 14 newly implemented Developer and Data tools contain hardcoded dark-mode hex colors (`#18181B`, `#27272A`, `#09090B`, `#A1A1AA`, `#FFFFFF`, `#6060E8`, `#22C55E`, `#EF4444`) that bypass design system tokens, failing in light mode and violating design standards.
6. **Multiple Divergent ToolCard Implementations:** Three separate implementations of `ToolCard` exist (`components/tools/ToolCard.tsx`, `app/page.tsx: ToolCardSmall`, `components/pages/CategoryPageClient.tsx: ToolCard`) with inconsistent badge rendering, hover styles, and format tag slicing.
7. **Pill Border-Radius on Multiline Textareas:** `components/ui/Input.tsx` assigns `.input-base` to `<textarea>`, inheriting `border-radius: var(--radius-full)` (9999px) and creating distorted pill-capsule edges on multiline textareas.
8. **Missing Category in Footer:** The `Audio` category (`/audio`) is completely omitted from the footer navigation links.

---

## Surface 1: Header & Navigation

### 1.1 [CRITICAL] Desktop Search Bar Fails to Hide on Mobile Causing Severe Header Squish & Overflow
- **Surface Name:** Header & Navigation
- **Severity:** `[CRITICAL]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/layout/Header.tsx`
- **Line Range:** Lines 101–118, 316–325
- **Defect Description:**  
  The desktop search button (`<button onClick=... maxWidth: 520, height: 38 ...>`) does not have a responsive CSS class hiding it on mobile viewports. On viewports below 768px (especially 320px–480px), the Logo (~120px), Search Bar (`flex: 1`), Simple Mode CTA (36px), Theme toggle (36px), and Hamburger button (36px) compete for space. On a 320px screen, this totals over 360px, causing severe horizontal overflow and squishing the logo text. Furthermore, the mobile drawer already contains a dedicated search button, confirming the header search bar was intended to hide on mobile screens.
- **Recommended Fix:**  
  Add `className="desktop-search-btn"` to the header search button in `Header.tsx:101`. In the `<style>` block (line 321), add:
  ```css
  @media (max-width: 768px) {
    .desktop-search-btn { display: none !important; }
  }
  ```

---

### 1.2 [HIGH] Mobile Navigation Drawer Missing Max-Height and Scrollability
- **Surface Name:** Header & Navigation
- **Severity:** `[HIGH]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/layout/Header.tsx`
- **Line Range:** Lines 195–225
- **Defect Description:**  
  The mobile drawer (`position: 'fixed', top: 60, left: 0, right: 0, zIndex: 99`) renders the search bar button plus 11 category links, totaling ~520px in content height. It has no `maxHeight` constraint and no `overflowY: 'auto'`. On small devices (iPhone SE: 568px height) or any mobile device in landscape orientation, the bottom categories (Generators, Security, Files) extend off-screen and are completely unreachable because the drawer cannot be scrolled. Additionally, there is no backdrop overlay to tap outside and dismiss the drawer.
- **Recommended Fix:**  
  Update drawer container style:
  ```tsx
  maxHeight: 'calc(100vh - 60px)',
  overflowY: 'auto',
  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
  ```
  Add a semi-transparent backdrop overlay underneath the drawer with `onClick={() => setMobileOpen(false)}`.

---

### 1.3 [HIGH] Desktop Navigation Breakpoint Gap Between 768px and 960px
- **Surface Name:** Header & Navigation
- **Severity:** `[HIGH]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/layout/Header.tsx`
- **Line Range:** Lines 121–134, 321–324
- **Defect Description:**  
  `.desktop-nav` remains visible until the viewport drops to `768px` (`@media (max-width: 768px)`). Between 769px and 960px (portrait tablets, iPad Mini, small split windows), the 5 desktop nav links (~320px) + Logo (120px) + Simple Mode button (130px) + Theme toggle (36px) take up ~606px, crushing the search input down to less than 80px width, causing text clipping of "Search tools..." and overlapping the `/` keyboard badge.
- **Recommended Fix:**  
  Change the desktop nav collapse threshold from `768px` to `960px`:
  ```css
  @media (max-width: 960px) {
    .desktop-nav { display: none !important; }
    .mobile-ham { display: flex !important; }
  }
  ```

---

### 1.4 [MEDIUM] Border-Radius Inconsistencies on Header Controls
- **Surface Name:** Header & Navigation
- **Severity:** `[MEDIUM]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/layout/Header.tsx`
- **Line Range:** Lines 92, 107, 144, 168, 319
- **Defect Description:**  
  - Search bar (line 107) has `borderRadius: 'var(--radius-md)'` (14px). Design system specification dictates full pill (`var(--radius-full): 9999px`) for search inputs.
  - Simple Mode toggle (line 144) uses full pill (`var(--radius-full)`) on desktop, but the adjacent Theme toggle (line 168) uses `var(--radius-md)` (14px).
  - On mobile (`max-width: 640px`, line 319), Simple Mode toggle overrides to `border-radius: var(--radius-md) !important`.
  - Logo icon container (line 92) is 28x28px with `borderRadius: 'var(--radius-md)'` (14px), which creates a full circular shape rather than the squircle icon container seen across other cards.
- **Recommended Fix:**  
  - Set search bar to `borderRadius: 'var(--radius-full)'`.
  - Standardize icon containers and square toggle buttons to `var(--radius-sm)` (8px) or `var(--radius-md)` (14px).
  - Keep button shape consistency across breakpoints.

---

### 1.5 [MEDIUM] Low Contrast on Keyboard Shortcut Badges (`Kbd`)
- **Surface Name:** Header & Navigation
- **Severity:** `[MEDIUM]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/layout/Header.tsx`
- **Line Range:** Lines 117, 267
- **Defect Description:**  
  The keyboard indicator badges (`/` in the search bar and `Esc` in the search modal) use `color: 'var(--ink-3)'` (#666666 in dark mode) against `background: 'var(--bg-3)'` or `var(--bg-2)`. Contrast ratio is 2.84:1, failing the WCAG 2.1 AA requirement of 4.5:1 for standard text.
- **Recommended Fix:**  
  Change color to `var(--ink-2)` (#A1A1A1 in dark mode, #64748B in light mode, contrast > 5.5:1).

---

### 1.6 [LOW] Hardcoded Colors and Hex Values Bypassing Tokens
- **Surface Name:** Header & Navigation
- **Severity:** `[LOW]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/layout/Header.tsx`
- **Line Range:** Lines 93, 155, 159, 234
- **Defect Description:**  
  - Line 93: `<Zap size={16} color="#fff" fill="#fff" />` (hardcoded `#fff`).
  - Line 155: `color: simpleMode ? '#ffffff' : 'var(--ink)'` (hardcoded `#ffffff`).
  - Line 159: `color: simpleMode ? '#ffffff' : 'var(--brand)'` (hardcoded `#ffffff`).
  - Line 234: `background: 'rgba(0,0,0,0.7)'` (hardcoded dark overlay instead of token).
- **Recommended Fix:**  
  Replace `#fff`/`#ffffff` with `var(--ink)` or high-contrast white tokens, and use `rgba(0,0,0,0.6)` backdrop filter.

---

## Surface 2: Homepage (`/`)

### 2.1 [HIGH] CategoryParallelExplorer Mobile Sidebar Broken in Horizontal Scroll
- **Surface Name:** Homepage (`/`)
- **Severity:** `[HIGH]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/tools/CategoryParallelExplorer.tsx`
- **Line Range:** Lines 73–77, 95, 146, 304–319
- **Defect Description:**  
  On viewports below 1024px (`@media (max-width: 1023px)`), `.parallel-sidebar` is transformed into a horizontal scrolling row (`flex-direction: row !important; overflow-x: auto !important`). However:
  1. The sidebar header `<div>Categories</div>` (lines 73–77) remains in the flex row with `borderBottom: '1px solid var(--border)'` and `marginBottom: 4px`, rendering as an awkward, vertically-bordered box inside a horizontal pill row.
  2. The category buttons retain inline `width: '100%'` (lines 95 & 146) without `flexShrink: 0`, causing the buttons to compress and distort text labels during touch scroll.
- **Recommended Fix:**  
  - Add a class `parallel-sidebar-header` to lines 73–77 and hide it on mobile:
    ```css
    @media (max-width: 1023px) {
      .parallel-sidebar-header { display: none !important; }
      .parallel-sidebar button { width: auto !important; flex-shrink: 0 !important; }
    }
    ```

---

### 2.2 [HIGH] Redundant and Inconsistent `ToolCardSmall` Implementation in `app/page.tsx`
- **Surface Name:** Homepage (`/`)
- **Severity:** `[HIGH]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/app/page.tsx`
- **Line Range:** Lines 25–51, 187–191
- **Defect Description:**  
  `app/page.tsx` defines an inline `ToolCardSmall` component instead of utilizing `@/components/tools/ToolCard`. This causes significant visual and behavioral inconsistencies:
  - `ToolCardSmall` does not animate the icon container background or color on hover, unlike `ToolCard.tsx`.
  - Format badges are hard-limited to 3 without `+X` overflow count, whereas `ToolCard.tsx` cleanly handles 4 + count.
  - Active tool vs stub tool visual parity is divergent from the rest of the application.
- **Recommended Fix:**  
  Delete `ToolCardSmall` from `app/page.tsx` and import `ToolCard` from `@/components/tools/ToolCard`:
  ```tsx
  import { ToolCard } from '@/components/tools/ToolCard';
  // ...
  <ToolCard key={tool.slug} tool={tool} />
  ```

---

### 2.3 [MEDIUM] Hero Search Input Border Radius Inconsistent with Design System
- **Surface Name:** Homepage (`/`)
- **Severity:** `[MEDIUM]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/app/page.tsx`
- **Line Range:** Lines 107–127
- **Defect Description:**  
  The hero search input (height: 56px) has `borderRadius: 'var(--radius-lg)'` (18px). The design system explicitly defines `var(--radius-full)` (9999px) for search inputs (see `design-system.css:35` and `globals.css:97`). An 18px radius on a 56px tall search bar looks like an awkwardly rounded rectangle instead of a polished pill input.
- **Recommended Fix:**  
  Change `borderRadius: 'var(--radius-lg)'` to `borderRadius: 'var(--radius-full)'`, and adjust `paddingLeft: 52` to accommodate the search icon without crowding the curvature.

---

### 2.4 [MEDIUM] Full-Page Drag-and-Drop Flicker from Unhandled DragLeave
- **Surface Name:** Homepage (`/`)
- **Severity:** `[MEDIUM]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/app/page.tsx`
- **Line Range:** Lines 70–74, 86–96
- **Defect Description:**  
  Dragging a file over the homepage triggers `onDragOver` and sets `dragging = true`. However, as the cursor moves over child elements (text, cards, search input), browser `dragleave` events fire continuously on the parent container, toggling `dragging = false` and causing intense visual border flickering.
- **Recommended Fix:**  
  Implement a drag depth counter (identical to `components/tools/FileUploader.tsx:48`):
  ```tsx
  const [dragDepth, setDragDepth] = useState(0);
  // onDragEnter: setDragDepth(d => d + 1)
  // onDragLeave: setDragDepth(d => Math.max(0, d - 1))
  // onDrop: setDragDepth(0)
  ```

---

### 2.5 [LOW] Category Explorer Search Input Curve Collision
- **Surface Name:** Homepage (`/`)
- **Severity:** `[LOW]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/tools/CategoryParallelExplorer.tsx`
- **Line Range:** Lines 206–218
- **Defect Description:**  
  The category search input uses `className="input-base"`, which applies `border-radius: var(--radius-full)`. The search icon is placed at `left: 12`. On a 38px high pill input, the boundary curve begins 19px inward from the left edge. The icon at `left: 12` sits directly on top of the curvature slope, and `paddingLeft: 36` provides insufficient clearance.
- **Recommended Fix:**  
  Set icon position to `left: 15` and input `paddingLeft: 40`.

---

## Surface 3: Category Pages (All 11 Categories)

### 3.1 [HIGH] Redundant and Inconsistent `ToolCard` in `CategoryPageClient.tsx`
- **Surface Name:** Category Pages
- **Severity:** `[HIGH]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/pages/CategoryPageClient.tsx`
- **Line Range:** Lines 13–44, 107–123
- **Defect Description:**  
  `CategoryPageClient.tsx` contains a third independent implementation of `ToolCard`:
  - Static `var(--brand-500)` icon color with no hover transition (in contrast to `ToolCard.tsx`).
  - Duplicates low-contrast `var(--ink-3)` on format tags and "Coming soon" text.
  - Inconsistent grid gap: uses `gap: 14` instead of the canonical `gap: 16`.
- **Recommended Fix:**  
  Delete the local `ToolCard` function from `CategoryPageClient.tsx` and import `ToolCard` from `@/components/tools/ToolCard`.

---

### 3.2 [MEDIUM] Category Search Bar Icon Curve Overlap
- **Surface Name:** Category Pages
- **Severity:** `[MEDIUM]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/pages/CategoryPageClient.tsx`
- **Line Range:** Lines 89–98
- **Defect Description:**  
  In `CategoryPageClient.tsx`, `<Search size={16} style={{ position: 'absolute', left: 12 ... }} />` is placed inside an input with `className="input-base"` (pill border radius, height 40px). The icon at `left: 12` collides with the inner radius curvature, and `paddingLeft: 38` leaves text too close to the icon.
- **Recommended Fix:**  
  Adjust icon `left: 16` and input `paddingLeft: 42`.

---

### 3.3 [LOW] Back Navigation Hover State Lacks Transition Duration
- **Surface Name:** Category Pages
- **Severity:** `[LOW]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/pages/CategoryPageClient.tsx`
- **Line Range:** Lines 68–73
- **Defect Description:**  
  The "Back to home" link relies on inline `onMouseEnter`/`onMouseLeave` manipulating `style.color` directly without a CSS `transition: color var(--transition-fast)`. Color switches abruptly rather than with the smooth 120ms fade used elsewhere.
- **Recommended Fix:**  
  Add `transition: 'color var(--transition-fast)'` to the link style.

---

## Surface 4: Tool Pages (Sampled 18+ Distinct Tools)

### 4.1 [CRITICAL] Systemic Mobile Viewport Overflow from Rigid `minmax(320px, 1fr)` and `minmax(340px, 1fr)`
- **Surface Name:** Tool Pages (Cross-Tool Systemic Issue)
- **Severity:** `[CRITICAL]`
- **File Paths:**
  - `/Users/swagstruck/Antigravity Projects/whysogood/tools/developer/common/DeveloperSplitPane.tsx:382` (`minmax(340px, 1fr)`)
  - `/Users/swagstruck/Antigravity Projects/whysogood/tools/image/resizer/ImageResizerTool.tsx:142` (`minmax(320px, 1fr)`)
  - `/Users/swagstruck/Antigravity Projects/whysogood/tools/developer/json-formatter/JsonFormatterTool.tsx:144` (`minmax(320px, 1fr)`)
  - `/Users/swagstruck/Antigravity Projects/whysogood/tools/developer/text-diff/TextDiffTool.tsx:197` (`minmax(320px, 1fr)`)
  - `/Users/swagstruck/Antigravity Projects/whysogood/tools/developer/jwt-decoder/JwtDecoderTool.tsx:201` (`minmax(320px, 1fr)`)
  - `/Users/swagstruck/Antigravity Projects/whysogood/tools/calculators/sip/SipCalculatorTool.tsx:120` (`minmax(320px, 1fr)`)
  - `/Users/swagstruck/Antigravity Projects/whysogood/tools/data/common/DataTablePreview.tsx:283` (`minWidth: 220`)
- **Defect Description:**  
  Across more than 15 tool split-panes and side-by-side controls, CSS Grid is styled as `gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'` (or `340px` in `DeveloperSplitPane`). On mobile devices with 320px–375px viewports, subtracting the page padding (16px left + 16px right = 32px) leaves only 288px–343px of available width. A minimum column width of 320px or 340px forces the grid container to overflow the viewport horizontally by up to 52px, causing horizontal scrollbars, jittery horizontal drag, and cut-off content.
- **Recommended Fix:**  
  Change `minmax(320px, 1fr)` to `minmax(min(100%, 300px), 1fr)` or use a dedicated responsive media query:
  ```css
  @media (max-width: 640px) {
    .tool-split-grid {
      grid-template-columns: 1fr !important;
    }
  }
  ```

---

### 4.2 [CRITICAL] Widespread Hardcoded Colors Bypassing Design System Across 14 Developer & Data Tools
- **Surface Name:** Tool Pages
- **Severity:** `[CRITICAL]`
- **File Paths:**
  - `tools/developer/common/DeveloperSplitPane.tsx` (lines 182, 208–210, 310, 313, 318, 322–330, 340, 356–358, 394–396, 403, 406, 411, 415, 436)
  - `tools/developer/regex-tester/RegexTesterTool.tsx` (lines 95–97, 105, 123–125)
  - `tools/developer/text-diff/TextDiffTool.tsx` (lines 79–82, 95–98, 111–112, 164–168, 203–205, 220–224, 235–237, 252–256)
  - `tools/developer/jwt-decoder/JwtDecoderTool.tsx` (lines 71–73, 81, 103–107, 121–129, 149–151, 167–170, 186–189, 208–210, 218)
  - `tools/data/common/DataTablePreview.tsx` (lines 122–124, 142, 151–154, 170–171, 191–192, 233–235, 240, 252, 261, 284–286, 293)
  - `tools/data/csv-cleaner/CsvCleanerTool.tsx` (lines 53–64, 74–76, 84, 106–110)
  - `tools/developer/cron-generator/CronGeneratorTool.tsx`
  - `tools/developer/timestamp-converter/TimestampConverterTool.tsx`
  - `tools/developer/uuid-generator/UuidGeneratorTool.tsx`
  - `tools/developer/hash-generator/HashGeneratorTool.tsx`
  - `tools/developer/json-validator/JsonValidatorTool.tsx`
  - `tools/data/csv-sorter/CsvSorterTool.tsx`
  - `tools/data/csv-column-extractor/CsvColumnExtractorTool.tsx`
  - `tools/data/csv-deduplicator/CsvDeduplicatorTool.tsx`
  - `tools/data/json-to-csv/JsonToCsvDataTool.tsx`
- **Defect Description:**  
  The 14 Developer and Data tools contain hardcoded dark-mode hex values (`#18181B`, `#27272A`, `#09090B`, `#A1A1AA`, `#FFFFFF`, `#6060E8`, `#22C55E`, `#EF4444`, `#F43F5E`) used in inline styles and CSS fallbacks. In light mode (`data-theme="light"`), these tools retain dark background colors or, in several cases, render white text on light backgrounds because of hardcoded `#FFFFFF` fallbacks, making code inputs and table cells illegible.
- **Recommended Fix:**  
  Audit and replace all hardcoded hex strings with design system CSS variables:
  - `#09090B` / `#0A0A0A` → `var(--bg)`
  - `#141414` → `var(--bg-1)`
  - `#18181B` / `#1C1C1C` → `var(--bg-2)`
  - `#27272A` / `#2A2A2A` → `var(--border)`
  - `#FAFAFA` / `#FFFFFF` → `var(--ink)`
  - `#A1A1AA` / `#A1A1A1` → `var(--ink-2)`
  - `#6060E8` / `#3B3BDF` → `var(--brand)`
  - `#22C55E` / `#16A34A` → `var(--pos)`
  - `#EF4444` / `#DC2626` → `var(--neg)`
  - `rgba(34, 197, 94, 0.15)` → `var(--pos-subtle)`
  - `rgba(239, 68, 68, 0.15)` → `var(--neg-subtle)`

---

### 4.3 [HIGH] AudioTrimmerTool Uses Raw Tailwind Utility Classes and Bypasses Design System
- **Surface Name:** Tool Pages (`AudioTrimmerTool`)
- **Severity:** `[HIGH]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/tools/audio/audio-trimmer/AudioTrimmerTool.tsx`
- **Line Range:** Lines 55–80
- **Defect Description:**  
  `AudioTrimmerTool` completely bypasses the design system components:
  - Line 77: `<button onClick=... className="px-4 py-2 rounded font-medium bg-black text-white dark:bg-white dark:text-black">` (hardcoded black/white Tailwind utility button).
  - Line 68: `<button onClick={handleTrim} ... className="px-4 py-2 rounded font-medium" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>` (un-tokenized button, raw 4px radius).
  - Lines 61 & 65: `<input type="number" ... className="p-2 rounded border" style={{ borderColor: 'var(--color-border)', background: 'transparent' }} />` (raw un-tokenized input).
- **Recommended Fix:**  
  Refactor `AudioTrimmerTool` to use `<Button variant="primary">` and `<Button variant="secondary">` from `@/components/ui/Button`, and use `c-field__input` or `input-base` for number inputs.

---

### 4.4 [HIGH] Image Compressor Output Download Button Styled as Secondary
- **Surface Name:** Tool Pages (`ImageCompressorTool`)
- **Severity:** `[HIGH]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/tools/image/compressor/ImageCompressorTool.tsx`
- **Line Range:** Lines 386–401
- **Defect Description:**  
  In `ImageCompressorTool`, the download button on the post-compression card is `<Button variant="secondary" onClick=...>`. After compression completes, downloading the resulting file is the user's primary objective. Marking it secondary gives it a muted gray surface (`--bg-2`) with lower visual affordance.
- **Recommended Fix:**  
  Change `variant="secondary"` to `variant="primary"` on line 388.

---

### 4.5 [MEDIUM] ColorPickerTool Form Layout Breaks and Collapses on Mobile
- **Surface Name:** Tool Pages (`ColorPickerTool`)
- **Severity:** `[MEDIUM]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/tools/design/color-picker/ColorPickerTool.tsx`
- **Line Range:** Lines 36–60
- **Defect Description:**  
  1. Lines 36–60 place a 128x128px native color swatch side-by-side with three input/button rows using `display: flex; gap: 24; align-items: flex-start;` without `flex-wrap`. On viewports <= 480px, the inputs get squished into under 110px.
  2. The read-only text inputs (lines 48, 52, 56) use `className="input-base" style={{ flex: 1 }}` without `height` or `padding`. `.input-base` in `globals.css` does not specify a default height, causing the inputs to collapse to ~22px height while the "Copy" buttons next to them are 40px tall, resulting in severe vertical misalignment.
- **Recommended Fix:**  
  Add `flexWrap: 'wrap'` on the container, and set `height: 40, padding: '0 14px'` on the read-only inputs.

---

### 4.6 [MEDIUM] SIP Calculator Number Field Pill Radius Cutting Into Right-Aligned Numbers
- **Surface Name:** Tool Pages (`SipCalculatorTool`)
- **Severity:** `[MEDIUM]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/tools/calculators/sip/SipCalculatorTool.tsx`
- **Line Range:** Lines 75–99
- **Defect Description:**  
  The investment inputs use `className="input-base"` (`border-radius: var(--radius-full)`) with `width: 110px`, `height: 32px`, `padding: '0 8px'`, and `textAlign: 'right'`. The 16px curve of the pill radius cuts into the rightmost digits of numbers like `₹1,00,000`.
- **Recommended Fix:**  
  Override border-radius on number inputs to `borderRadius: 'var(--radius-md)'` and increase padding to `padding: '0 12px'`.

---

### 4.7 [LOW] Format Pills in Tools Using Contrast-Deficient Tokens
- **Surface Name:** Tool Pages (`ImageCompressorTool`, `PdfCompressorTool`, `FileUploader`)
- **Severity:** `[LOW]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/tools/FileUploader.tsx:134`
- **Line Range:** Lines 134–136
- **Defect Description:**  
  Format badges use `color: 'var(--color-faint)'` on `background: 'var(--color-surface2)'`. Contrast ratio is 2.84:1, failing WCAG AA (4.5:1).
- **Recommended Fix:**  
  Change color to `var(--color-muted)` (`--ink-2`).

---

## Surface 5: Simple Mode Workbench

### 5.1 [HIGH] Chaining Action Button Label Wrapping & Clipping on Small Devices
- **Surface Name:** Simple Mode Workbench
- **Severity:** `[HIGH]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/simple-mode/OutputCard.tsx`
- **Line Range:** Lines 192–208
- **Defect Description:**  
  The "Use as input for next tool" button has `flex: '1 1 150px'` with a fixed `height: 32px`. On mobile screens (320px–360px), this 27-character label wraps into 2 lines. In a 32px height button, the text overflows and is clipped vertically.
- **Recommended Fix:**  
  Change `height: 32` to `minHeight: 36px; height: auto; padding: '6px 12px'`, and shorten the button label on small screens to "Use as Next Input" or "Chain Tool".

---

### 5.2 [HIGH] Category Override Tabs Lack Visual Scroll Overflow Affordance
- **Surface Name:** Simple Mode Workbench
- **Severity:** `[HIGH]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/simple-mode/ToolSelector.tsx`
- **Line Range:** Lines 44–79
- **Defect Description:**  
  The manual category override tab strip contains 11 buttons scrolling horizontally with `overflowX: 'auto'` and `scrollbarWidth: 'none'`. There is no right-edge gradient mask or scroll shadow. On mobile devices, users cannot tell that categories extend beyond the right edge of the screen.
- **Recommended Fix:**  
  Wrap the tab bar in a container with a subtle CSS right-edge fade mask:
  ```css
  mask-image: linear-gradient(to right, black 85%, transparent 100%);
  ```

---

### 5.3 [MEDIUM] Simple Mode Dropzone & Card Format Tags Low Contrast
- **Surface Name:** Simple Mode Workbench
- **Severity:** `[MEDIUM]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/simple-mode/SimpleModeDropzone.tsx:162, 308`
- **Line Range:** Lines 162–169, 308–314
- **Defect Description:**  
  Extension badges and supported format badges use `color: 'var(--ink-3)'` on `background: 'var(--bg-2)'`. Fails WCAG 2.1 AA with a 2.84:1 contrast ratio.
- **Recommended Fix:**  
  Change text color to `var(--ink-2)` and background to `var(--bg-3)`.

---

### 5.4 [LOW] Hardcoded Color in Simple Mode Output Card PDF Icon
- **Surface Name:** Simple Mode Workbench
- **Severity:** `[LOW]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/simple-mode/OutputCard.tsx:77`
- **Line Range:** Line 77
- **Defect Description:**  
  `<FileText size={28} style={{ color: '#ef4444' }} />` uses hardcoded `#ef4444`.
- **Recommended Fix:**  
  Change to `color: 'var(--neg)'`.

---

## Surface 6: Footer & Global UI Components

### 6.1 [CRITICAL] Fixed-Position Coordinate Collision Between Feedback Bubble and Toast Notifications
- **Surface Name:** Footer & Global Components
- **Severity:** `[CRITICAL]`
- **File Paths:**
  - `/Users/swagstruck/Antigravity Projects/whysogood/components/layout/FeedbackBubble.tsx:97–100`
  - `/Users/swagstruck/Antigravity Projects/whysogood/components/ui/ToastProvider.tsx:53–56`
- **Defect Description:**  
  Both the floating `FeedbackBubble` button (`width: 52, height: 52`) and the global `ToastProvider` container are anchored at the exact same viewport coordinates: `position: 'fixed', bottom: 24, right: 24`. Because `FeedbackBubble` has `zIndex: 9998` and `ToastProvider` has `zIndex: 999`, whenever a toast alert triggers (e.g. "Copied to clipboard", "Downloaded file", "Resize failed"), the toast renders directly behind the Feedback Bubble button. The button completely blocks the right side of the toast, obscuring the message text and preventing users from clicking the dismiss `X` icon.
- **Recommended Fix:**  
  Reposition the Toast notification container in `ToastProvider.tsx:54` to `bottom: 88px, right: 24px` (placing it neatly above the feedback bubble) or `top: 24px, right: 24px`.

---

### 6.2 [CRITICAL] Dual Chevron Arrows Overlapping in Global `Select` Component
- **Surface Name:** Global UI Components (`Select.tsx`)
- **Severity:** `[CRITICAL]`
- **File Paths:**
  - `/Users/swagstruck/Antigravity Projects/whysogood/app/globals.css:116–137`
  - `/Users/swagstruck/Antigravity Projects/whysogood/components/ui/Select.tsx:170–186`
- **Defect Description:**  
  `app/globals.css` applies an SVG chevron background image via `background-image: url("data:image/svg+xml,...")` at `background-position: right 14px center` to all `select:not([multiple])`. Meanwhile, `Select.tsx` renders a separate React Lucide `<ChevronDown>` icon inside a `.c-select-icon` wrapper positioned at `right: 14px`. This results in two overlapping arrows rendering inside every dropdown in the application. On `:hover`, the Lucide `<ChevronDown>` icon transitions from `var(--ink-2)` to `var(--ink)`, while the underlying SVG background arrow remains stationary and gray, creating a visible double-arrow glitch.
- **Recommended Fix:**  
  In `app/globals.css:116`, change `select:not([multiple]), .select-base` to only apply the background image when `.c-select` is NOT present:
  ```css
  select:not([multiple]):not(.c-select),
  .select-base {
    /* background-image arrow only for unstyled selects */
  }
  ```
  Ensure `.c-select` has `background-image: none !important;` so that `Select.tsx` controls the single canonical arrow icon.

---

### 6.3 [CRITICAL] Multiline `<Textarea>` Distorted with Capsule Pill Radius (`9999px`)
- **Surface Name:** Global UI Components (`Input.tsx`)
- **Severity:** `[CRITICAL]`
- **File Paths:**
  - `/Users/swagstruck/Antigravity Projects/whysogood/components/ui/Input.tsx:83`
  - `/Users/swagstruck/Antigravity Projects/whysogood/app/globals.css:97`
- **Defect Description:**  
  In `components/ui/Input.tsx`, the `Textarea` component is styled with `className="input-base"`. In `app/globals.css:97`, `.input-base` has `border-radius: var(--radius-full)` (9999px). When applied to a 120px tall multiline `<textarea>`, the 9999px radius produces warped capsule sides that look completely deformed for a multi-row text box.
- **Recommended Fix:**  
  In `components/ui/Input.tsx:83`, give `Textarea` an explicit `borderRadius: 'var(--radius-md)'` (14px) or `var(--radius-lg)` (18px), overriding `.input-base`.

---

### 6.4 [HIGH] Audio Category Completely Missing from Footer Links
- **Surface Name:** Footer & Global Components
- **Severity:** `[HIGH]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/layout/Footer.tsx`
- **Line Range:** Lines 7–26
- **Defect Description:**  
  In `Footer.tsx`, `categoryGroups` lists 10 categories divided between 'Tools' and 'More Tools'. The `Audio` category (`/audio`) is completely omitted from the footer navigation links.
- **Recommended Fix:**  
  Add `{ label: 'Audio', href: '/audio' }` to the 'More Tools' group in `Footer.tsx:15–21`.

---

### 6.5 [MEDIUM] Footer Brand Column Forcing Empty Row on Desktop
- **Surface Name:** Footer & Global Components
- **Severity:** `[MEDIUM]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/layout/Footer.tsx`
- **Line Range:** Lines 37–40
- **Defect Description:**  
  In `Footer.tsx`, the brand column has `style={{ gridColumn: '1 / -1', maxWidth: 300 }}` inside a `gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'`. On desktop screens (1280px+), this forces the brand information to occupy an entire empty horizontal row above the links, pushing the category columns down and creating an empty, unbalanced footer.
- **Recommended Fix:**  
  Remove `gridColumn: '1 / -1'` on desktop so the brand block sits naturally as column 1 alongside the link columns in a clean multi-column grid.

---

### 6.6 [MEDIUM] Input Prefix and Suffix Icons Colliding with Input Boundary Curve
- **Surface Name:** Global UI Components (`Input.tsx`)
- **Severity:** `[MEDIUM]`
- **File Path:** `/Users/swagstruck/Antigravity Projects/whysogood/components/ui/Input.tsx`
- **Line Range:** Lines 27, 39, 47
- **Defect Description:**  
  Prefix icon is placed at `left: 10`, suffix icon is placed at `right: 10`. On a 40px tall pill input (`var(--radius-full)` = 20px radius), 10px places the icon directly onto the curve slope.
- **Recommended Fix:**  
  Adjust icon positions to `left: 14` and `right: 14`, and adjust input padding to `padding: 0 40px`.

---

## Surface 7: Mobile Breakpoints & Responsiveness

### 7.1 [CRITICAL] Horizontal Page Scrolling at 320px Viewport Width
- **Surface Name:** Mobile Breakpoints & Responsiveness
- **Severity:** `[CRITICAL]`
- **File Paths:** Multiple (`Header.tsx`, `DeveloperSplitPane.tsx`, `OutputList.tsx`, `TextDiffTool.tsx`, `SipCalculatorTool.tsx`)
- **Defect Description:**  
  On mobile devices at 320px width (e.g. iPhone SE 1st gen, Galaxy Fold outer screen, or narrow mobile viewports):
  1. The unhidden header search bar forces the header width to > 360px.
  2. The `minmax(320px, 1fr)` and `minmax(340px, 1fr)` CSS grid rules force grid columns to be wider than the 288px container width (320px minus 32px padding).
  Together, these issues trigger horizontal scrolling across almost every page in the application.
- **Recommended Fix:**  
  - Ensure all grid columns on mobile collapse to `1fr` or `minmax(0, 1fr)`.
  - Add `overflow-x: hidden` to `html` and `body` in `app/globals.css`.
  - Ensure all headers collapse gracefully on screens under 480px.

---

### 7.2 [HIGH] Undersized Touch Targets (< 44px) on Mobile Controls
- **Surface Name:** Mobile Breakpoints & Responsiveness
- **Severity:** `[HIGH]`
- **File Paths:**
  - `components/layout/Header.tsx:143, 168, 182` (36x36px)
  - `tools/pdf/merger/PdfMergerTool.tsx:293–343` (26x26px)
  - `components/simple-mode/OutputCard.tsx:210` (32x32px)
  - `components/layout/FeedbackBubble.tsx:98` (52px is good, but close/minimize buttons are 24px)
- **Defect Description:**  
  WCAG 2.1 Success Criterion 2.5.5 / 2.5.8 recommends target sizes of at least 44x44px (or minimum 40x40px for compact controls). Interactive buttons like the theme toggle, up/down PDF reorder, remove file, and search modal close buttons are 26px–36px, resulting in frequent missed taps on mobile.
- **Recommended Fix:**  
  Add `min-height: 40px; min-width: 40px; display: flex; align-items: center; justify-content: center;` to mobile touch targets.

---

### 7.3 [MEDIUM] Fragmented Toolbars on Mobile Screens (320px–480px)
- **Surface Name:** Mobile Breakpoints & Responsiveness
- **Severity:** `[MEDIUM]`
- **File Paths:** `tools/developer/json-formatter/JsonFormatterTool.tsx:97`, `tools/text/word-counter/WordCounterTool.tsx:65`, `tools/security/base64-encoder/Base64EncoderTool.tsx:97`
- **Defect Description:**  
  Action toolbars with multiple buttons wrap into 3–4 fragmented rows on narrow mobile screens, creating visual clutter and misaligned button rows.
- **Recommended Fix:**  
  On mobile (< 640px), structure toolbars with `width: 100%`, `display: flex`, and full-width primary buttons.

---

## Prioritized Implementation Roadmap for Frontend Engineer

| Priority | Defect ID | Surface | File Path | Defect Summary |
|---|---|---|---|---|
| **P0 (Critical)** | 6.1 | Global UI | `FeedbackBubble.tsx`, `ToastProvider.tsx` | Coordinate collision: Toasts render under FeedbackBubble button |
| **P0 (Critical)** | 6.2 | Global UI | `app/globals.css`, `components/ui/Select.tsx` | Double chevron arrows rendering in Select component |
| **P0 (Critical)** | 6.3 | Global UI | `components/ui/Input.tsx` | Multiline Textarea distorted with 9999px pill border-radius |
| **P0 (Critical)** | 1.1 | Header | `components/layout/Header.tsx` | Search bar doesn't hide on mobile, causing severe header squish |
| **P0 (Critical)** | 4.1 | Tool Pages | `DeveloperSplitPane.tsx`, `ImageResizerTool.tsx`, etc. | `minmax(320px/340px, 1fr)` causes horizontal overflow on 320px screens |
| **P0 (Critical)** | 4.2 | Tool Pages | 14 Developer & Data tools | Hardcoded hex colors (`#18181B`, `#27272A`, etc.) bypass tokens and break light mode |
| **P1 (High)** | 1.2 | Header | `components/layout/Header.tsx` | Mobile nav drawer missing maxHeight and scrollability |
| **P1 (High)** | 1.3 | Header | `components/layout/Header.tsx` | Nav breakpoint gap between 768px and 960px crushes search input |
| **P1 (High)** | 2.1 | Homepage | `CategoryParallelExplorer.tsx` | Sidebar header and buttons broken in mobile horizontal scroll |
| **P1 (High)** | 2.2 | Homepage | `app/page.tsx` | Duplicate `ToolCardSmall` diverges from canonical `ToolCard` |
| **P1 (High)** | 3.1 | Categories | `components/pages/CategoryPageClient.tsx` | Duplicate `ToolCard` diverges from canonical `ToolCard` |
| **P1 (High)** | 4.3 | Tool Pages | `AudioTrimmerTool.tsx` | Unstyled raw Tailwind classes (`bg-black dark:bg-white`) bypass tokens |
| **P1 (High)** | 4.4 | Tool Pages | `ImageCompressorTool.tsx` | Compressed image download button mistakenly marked as secondary |
| **P1 (High)** | 5.1 | Simple Mode | `components/simple-mode/OutputCard.tsx` | "Use as input for next tool" label clips and wraps in 32px height on mobile |
| **P1 (High)** | 5.2 | Simple Mode | `components/simple-mode/ToolSelector.tsx` | Category tabs lack visual scroll affordance/gradient mask |
| **P1 (High)** | 6.4 | Footer | `components/layout/Footer.tsx` | `Audio` category completely missing from footer navigation |
| **P1 (High)** | 7.2 | Mobile | Multiple files | Undersized touch targets (< 40px) on mobile interactive elements |
| **P2 (Medium)** | 1.4 | Header | `components/layout/Header.tsx` | Border-radius inconsistencies on header buttons and logo |
| **P2 (Medium)** | 1.5 | Header | `components/layout/Header.tsx` | Low contrast on Kbd badges (`/` and `Esc`) |
| **P2 (Medium)** | 2.3 | Homepage | `app/page.tsx` | Hero search input uses 18px radius instead of 9999px pill |
| **P2 (Medium)** | 2.4 | Homepage | `app/page.tsx` | Drag-and-drop flickering on homepage from unhandled dragleave |
| **P2 (Medium)** | 3.2 | Categories | `components/pages/CategoryPageClient.tsx` | Category search icon collides with pill curvature |
| **P2 (Medium)** | 4.5 | Tool Pages | `ColorPickerTool.tsx` | Inputs collapse to 22px height and flex row breaks on mobile |
| **P2 (Medium)** | 4.6 | Tool Pages | `SipCalculatorTool.tsx` | Number input pill radius clips right-aligned numbers |
| **P2 (Medium)** | 5.3 | Simple Mode | `SimpleModeDropzone.tsx`, `OutputCard.tsx` | Format badges fail WCAG AA contrast ratio |
| **P2 (Medium)** | 6.5 | Footer | `components/layout/Footer.tsx` | Brand block forces empty top row on desktop |
| **P2 (Medium)** | 6.6 | Global UI | `components/ui/Input.tsx` | Prefix/suffix icons collide with pill curvature |
| **P2 (Medium)** | 7.3 | Mobile | Multiple toolbars | Toolbar buttons fragment into multi-line rows on mobile |
| **P3 (Low)** | 1.6 | Header | `components/layout/Header.tsx` | Hardcoded `#fff` in header icons and buttons |
| **P3 (Low)** | 2.5 | Homepage | `CategoryParallelExplorer.tsx` | Search icon padding refinement |
| **P3 (Low)** | 3.3 | Categories | `CategoryPageClient.tsx` | Back link missing smooth hover transition |
| **P3 (Low)** | 4.7 | Tool Pages | Multiple files | Format pills contrast refinement |
| **P3 (Low)** | 5.4 | Simple Mode | `OutputCard.tsx` | Hardcoded `#ef4444` on PDF icon |
