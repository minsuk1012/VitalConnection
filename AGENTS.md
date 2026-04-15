# Repository Guidelines

## Project Structure & Module Organization
`app/` contains the Next.js App Router code, including the public landing page, `app/admin/*` tools, and API routes under `app/api/*`. Reusable UI lives in `components/` and `components/ui/`, shared logic and database access live in `lib/`, and client hooks live in `hooks/`. Static assets belong in `public/`. Thumbnail builder templates, configs, fonts, and generated outputs are under `thumbnail/`; supporting CLI utilities are in `scripts/thumbnail/`. Use `stories/` for Storybook coverage and `sql/` for standalone SQL artifacts.

## Build, Test, and Development Commands
Install with `npm install`. Start local development with `npm run dev` on port `2999`. Build production assets with `npm run build`, then serve them with `npm run start`. Run `npm run lint` before opening a PR. Use `npm run storybook` for component work and `npm run build-storybook` to verify static Storybook output. Thumbnail utilities are script-driven: `npm run thumbnail:generate`, `npm run thumbnail:cutout`, and `npm run thumbnail:batch`.

## Coding Style & Naming Conventions
This repo is TypeScript-first. Follow the existing file style: 2-space indentation, semicolons in route/page files, and keep imports grouped and explicit. Use `PascalCase` for React components, `camelCase` for functions and variables, and kebab-case for route segments and template/config filenames such as `thumbnail/configs/full-overlay.json`. Prefer colocating admin-only components under their feature directory, for example `app/admin/thumbnail/builder/_components/`.

## Testing Guidelines
Vitest is configured through [vitest.config.ts](/Users/choiminsuk/Desktop/beautypass_marketing/vitalconnection/vitest.config.ts:1) with the Storybook addon and Playwright browser runner. There are no dedicated `*.test.ts` files yet, so add coverage either as Storybook interaction tests or new Vitest specs near the feature they exercise. Run tests with `npx vitest run`; if browser dependencies are missing locally, install Playwright first. Focus new tests on API routes, database utilities in `lib/`, and thumbnail builder flows.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits: `feat(builder): ...`, `fix(gemini): ...`, `chore: ...`, `merge: ...`. Keep subjects short and scoped to the feature area. PRs should include a clear summary, affected paths, setup or migration notes, and screenshots or Storybook references for UI changes. Call out any `.env.local`, API key, or SQLite schema impact explicitly.

## Security & Configuration Tips
Keep secrets in `.env.local`, especially `GEMINI_API_KEY` and any database path overrides such as `DB_PATH`. Do not commit generated outputs unless they are intentional fixtures. Review API routes that touch external services or local SQLite data carefully before merging.
