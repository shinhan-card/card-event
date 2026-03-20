# Presentation Site

This is the standalone presentation workspace for `card-event-intelligence`. It lives under `presentation-site/` and is intentionally separate from the FastAPI app at the repo root.

## Local Workflow

From `presentation-site/`:

```bash
npm install
npm run dev
```

Use these commands while editing:

- `npm run lint` for static checks.
- `npm run test` for the unit suite.
- `npm run test:e2e` for the Playwright flows.
- `npm run build` for a production check.

## Where To Edit Content

- Landing copy, showroom scenes, and CTA text live in [`content/site-content.ts`](./content/site-content.ts).
- Deep-dive narrative, axis split, orchestration, principles, and roadmap content live in [`content/architecture-content.ts`](./content/architecture-content.ts).
- The real module-ownership map lives in [`content/module-map.ts`](./content/module-map.ts).
- Route shells and presentation components live under `app/` and `components/`.

## Keeping The Dual-Axis Split Accurate

When the backend evolves, update the content model and the map together so the presentation stays faithful:

- Keep `event-pipeline` focused on event capture, extraction, normalization, and enrichment.
- Keep `product-rag` focused on disclosures, PDF/catalog collection, and RAG-backed product intelligence.
- Keep shared bootstrap, router, briefing, analytics, and UI surfaces in shared clusters.
- Update [`content/architecture-content.ts`](./content/architecture-content.ts) and [`content/module-map.ts`](./content/module-map.ts) at the same time so the landing story and the real module map do not drift apart.

## Snapshot Metadata

The footer reads from the shared snapshot marker exposed by the content files:

- `label`
- `capturedOn`
- `note`

That metadata is currently captured as of `2026-03-20` and should be updated whenever the presentation snapshot is refreshed.

## Notes

- Keep this workspace self-contained inside `presentation-site/`.
- Add future presentation changes here rather than in the FastAPI runtime.
- `npm run test:e2e` runs the showroom and deep-dive Playwright coverage without skipped placeholder specs.
- Deep-dive path provenance is driven by the snapshot content contract, so it stays stable even when this workspace is built without the backend checkout beside it.
- The `presentation-site/next-env.d.ts` line-ending churn is still local noise in this worktree and was intentionally left alone.
