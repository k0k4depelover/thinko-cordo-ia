# Contributing to Thinko Cordo IA

## Quick Start

```bash
git clone <repo-url>
cd thinko-cordo-ia/frontend
npm install
npm run dev
```

## Ways to Contribute (easiest first)

### 1. Add a Component (no code needed)

Create a `.ecomp` file in `/components/`. Follow existing examples like `led-standard.ecomp`. You only need to write JSON and provide an inline SVG.

See [docs/ecomp-spec.md](docs/ecomp-spec.md) for the full format specification.

### 2. Report a Bug

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS

### 3. Fix a Bug or Build a Feature

1. Open an issue first (or claim an existing one)
2. Fork and create a branch from `main`
3. Make changes with tests where applicable
4. Ensure `npx tsc --noEmit` passes
5. Ensure `npm run build` succeeds
6. Open a PR referencing the issue

## Code Standards

- **TypeScript strict mode** — no `any` types
- **Functional components** with hooks
- **Zustand** for state management — keep stores focused
- **Simulation engine changes** require thorough testing

## PR Guidelines

- Keep PRs under 400 lines when possible
- Reference an issue in the PR description
- One feature/fix per PR
- Component-only PRs (just `.ecomp` files) have a simplified review process

## Architecture Notes

- Simulation runs client-side for instant feedback
- Components are declarative (`.ecomp` JSON) — no executable code
- New simulation models must be added to `component-models.ts`
- Pin positions are relative to the component's visual dimensions
