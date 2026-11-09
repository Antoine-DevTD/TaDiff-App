# Resource composer implementation plan

**Goal:** Make the existing resource editor a responsive page composer with real palette dragging, cross-column moves and visible layout controls.

**Architecture:** Keep the existing resource document, access controls and reader. One shared DnD context owns the palette and all nested lists. Optional, enumerated presentation settings preserve older documents and prohibit arbitrary CSS/HTML. The same renderer serves the editor and published pages.

**Spec:** User chose a page composer on 9 November: draggable text/buttons/images, columns, sizes and TaDiff colors, automatic mobile layout. Preserve public/member choice per page and independent editorial permissions. Show the resulting interface before any new deployment.

**Tech Stack:** React, dnd-kit, Zod, existing Tailwind tokens.

## Tasks

- [x] Reproduce palette drag failure in the isolated browser fixture. Add tree tests for insertion, cross-column movement, invalid descendants and maximum depth.
- [x] Implement one shared drag context, insertion markers and drag overlay. Preserve click insertion, keyboard sorting, touch scrolling and busy states.
- [x] Add validated alignment, width, text size, spacing and button appearance controls; render identically in preview/public pages. Verify legacy documents remain valid.
- [x] Verify desktop, mobile, empty state, cancellation and save persistence. Capture the actual interface.
- [x] Run resource tests, lint, copy check, TypeScript and build. Review the whole change before delivery.

## Result

83 resource tests passed without skips, including 17 actual browser scenarios. Independent review findings were resolved: tall-block drop positioning, an accessible cross-column move selector and consistent column presentation in the composer and reader. All required repository checks passed. Local work only; no new publication or schema migration.

## Review focus

- A parent cannot be placed inside itself or one of its descendants; rejected drops preserve all content.
- Pointer release outside the page cancels; empty columns accept drops.
- Existing keyboard/touch access remains usable; editing text must not initiate dragging.
- Old page revisions render unchanged; new controls survive save and render without arbitrary style values.
- No publication, permissions changes or production data edits occur as part of the editor upgrade.
