# Entry Page Command Center Reveal Manual Review

## Status

DONE_WITH_CONCERNS

## Scope

- Plan reviewed: `docs/superpowers/plans/2026-03-28-entry-page-command-center-reveal.md`
- Related spec reviewed: `docs/superpowers/specs/2026-03-28-entry-page-command-center-reveal-design.md`
- Current implementation baseline reviewed:
  - `entry-page/index.html`
  - `entry-page/style.css`
  - `entry-page/script.js`
  - `app.py`
  - `tests/test_app_routes.py`

## What Is Strong

- The plan keeps scope tight. Static HTML/CSS/JS, same FastAPI mount, no framework churn.
- The plan has a real structure. HTML architecture, CSS system, JS interaction, contract tests, then polish.
- The design spec now has useful guardrails. Hero budget, section grammar, CTA hierarchy, and 3D input ownership are all heading in the right direction.

## Findings

### 1. High: the plan tests the asset mount more than the real user-facing entry route

The plan's route verification focuses on `/entry-page/index.html` and `/entry-page/`, but the actual product entry route for users is `/entry`. That contract already exists in the app and in current regression coverage.

Evidence:

- `app.py:4601-4605` serves the entry page through `/entry`
- `tests/test_app_routes.py:173-185` already checks `/entry`
- `docs/superpowers/plans/2026-03-28-entry-page-command-center-reveal.md:167-178` only mentions `/entry-page/index.html` and `/entry-page/`

Why it matters:

If the redesign only preserves the static mount contract and not the `/entry` route behavior, the real entry path can drift even while tests pass. That's a fake green.

Fix:

- Make `/entry` the primary contract in Task 4
- Keep `/entry-page/style.css` and `/entry-page/script.js` as supporting asset checks
- Treat `/entry-page/index.html` as secondary, not the main user path

### 2. High: the plan does not decide whether the signal/briefing preview content is real data, curated sample data, or hybrid

The design direction wants the page to feel like a live intelligence platform, but the implementation plan focuses on structure and interaction without a clear content source decision for preview modules.

Evidence:

- The design spec requires `signal layer`, `preview layer`, and `briefing preview` presence
- `docs/superpowers/plans/2026-03-28-entry-page-command-center-reveal.md:47-57`, `:81-99`, and `:136-148` describe structure and styling, but no source-of-truth for those signals

Why it matters:

This is a trust issue. If the page visually implies "live monitoring" but the content is obviously hand-written or stale, users feel the product is pretending. On a platform like this, trust is the whole game.

Fix:

- Add one explicit product decision before implementation:
  - curated static content
  - snapshot-backed real content
  - curated framing plus a small real signal strip
- Recommendation: curated hero/preview copy plus one small snapshot-backed real signal strip

### 3. Medium: the 3D behavior promised in the spec is more ambitious than the current embed likely allows

The spec talks about section-driven focus shifts and subtle scene response, but the current implementation is an external Spline iframe with no documented scroll-state bridge in this plan.

Evidence:

- `entry-page/index.html:13-16` embeds a remote Spline scene via iframe
- `docs/superpowers/specs/2026-03-28-entry-page-command-center-reveal-design.md:223-227` expects section-sensitive 3D behavior
- `docs/superpowers/plans/2026-03-28-entry-page-command-center-reveal.md:136-145` assumes JS can help manage this, but does not define a real scene control channel

Why it matters:

If we promise scroll-aware 3D choreography and the embed only behaves like a black-box background, the implementation either gets hacky or quietly ships less than the design says.

Fix:

- Phase 1 should explicitly scope 3D to `persistent ambient background`
- Section-driven depth shifts should be limited to overlay contrast, opacity, and pointer ownership unless a real Spline control API is verified
- Treat "scene reactivity" as optional enhancement, not a baseline requirement

### 4. Medium: the plan asks pytest to prove runtime interaction behavior that really needs browser verification

The proposed `test_entry_page_contract.py` is a good idea for structure and hook coverage, but some of its proposed checks are runtime UI behaviors, not static document contracts.

Evidence:

- `docs/superpowers/plans/2026-03-28-entry-page-command-center-reveal.md:127-152` expects contract tests around active section state and reduced-motion behavior
- Current repo test style in `tests/test_app_routes.py` is mostly HTML string and ASGI route validation, not browser-state interaction validation

Why it matters:

If we overstate what these tests prove, we end up with paper coverage. The page can still feel bad while the suite says green.

Fix:

- Keep `test_entry_page_contract.py` for HTML ids, CTA hierarchy markers, reduced-motion hooks, and required data attributes
- Move actual scroll/reveal/count-up verification to manual smoke or Playwright, clearly labeled as such

### 5. Medium: mobile content-pruning rules are still too soft for a page with this much layered information

The design spec correctly calls for a premium, information-dense single page, but the implementation plan mostly says "check mobile" rather than defining what gets reduced, reordered, or collapsed.

Evidence:

- `docs/superpowers/plans/2026-03-28-entry-page-command-center-reveal.md:100-103` mentions responsive styles
- `docs/superpowers/plans/2026-03-28-entry-page-command-center-reveal.md:210-215` only lists mobile smoke checks

Why it matters:

Without explicit mobile pruning rules, desktop sections usually just stack. That's not mobile design, that's gravity.

Fix:

- Add one mobile decision block to the plan:
  - hero keeps only one compressed signal cluster
  - sticky signal bar becomes simpler or non-sticky on small screens
  - briefing preview reduces to one strong panel
  - process narrative becomes vertical sequence

### 6. Medium: accessibility and interaction-state requirements are still under-specified for a premium interactive entry page

The plan mentions semantic ids and reduced motion, but it does not explicitly require focus-visible states, keyboard order, aria labeling for secondary actions, or touch-target enforcement beyond a short CSS note.

Evidence:

- `docs/superpowers/plans/2026-03-28-entry-page-command-center-reveal.md:47-57` focuses on structure
- `docs/superpowers/plans/2026-03-28-entry-page-command-center-reveal.md:95-107` focuses on layout and motion
- There is no explicit accessibility acceptance list in the plan's verification section

Why it matters:

Polish is not just glow and spacing. If the page looks premium but has weak focus states or messy keyboard order, it feels unfinished fast.

Fix:

- Add explicit acceptance checks for:
  - `:focus-visible`
  - keyboard traversal order
  - 44px touch targets
  - aria-label or readable text for secondary CTA and signal controls
  - contrast pass for over-3D text layers

## CEO Review Summary

- Premises: mostly valid
- Right problem: yes, the current entry page under-explains the platform
- Scope: mostly right, but missing one core product decision about real-vs-curated preview content
- Alternatives: sufficiently explored in the design spec
- Trajectory: sound for a first premium landing pass if the page stays honest about what is truly live

## Design Review Summary

- Direction is strong
- Hero budget and section grammar are now much healthier
- Biggest remaining risk is desktop ideas simply stacking onto mobile
- Second biggest risk is "too many translucent modules" sneaking back in during implementation

## Engineering Review Summary

- The plan is implementable in the current stack
- Biggest mismatch is route contract coverage and over-claiming what pytest can verify
- 3D behavior needs one explicit downgrade from "reactive scene system" to "ambient background first, enhancements second"

## Recommended Plan Changes

1. Change Task 4 to center `/entry` as the primary contract, not just static asset paths.
2. Add a product decision note for preview content sourcing before implementation starts.
3. Downgrade section-reactive 3D behavior to optional enhancement unless scene control is proven.
4. Re-scope `test_entry_page_contract.py` to markup/hooks, not full interaction truth.
5. Add explicit mobile pruning rules and accessibility acceptance checks.

## Verdict

Good plan. Not ready to implement unchanged.

The bones are good. The risks are real but fixable. Tighten those five areas first, then this becomes a very solid build plan.
