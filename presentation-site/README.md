# Presentation Site

This is the standalone presentation workspace for `card-event-intelligence`. It lives under `presentation-site/` and is intentionally separate from the FastAPI app at the repo root.

The initial App Router bootstrap lives in:

- `presentation-site/app/layout.tsx`
- `presentation-site/app/page.tsx`
- `presentation-site/app/deep-dive/page.tsx`
- `presentation-site/app/globals.css`

The first smoke test for the workspace lives in:

- `presentation-site/tests/unit/routes-smoke.test.tsx`

The placeholder Playwright entrypoint lives in:

- `presentation-site/tests/e2e/bootstrap-placeholder.spec.ts`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
- `npm run test:watch`
- `npm run test:e2e`

## Notes

- Keep this workspace self-contained inside `presentation-site/`.
- Add future presentation changes here rather than in the FastAPI runtime.
- Use the smoke test as the first check when extending the route shell.
- `npm run test:e2e` is intentionally a placeholder for now; it stays green by skipping the bootstrap spec until real E2E coverage is added.
