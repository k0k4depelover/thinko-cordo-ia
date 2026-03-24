# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Guide

**READ FIRST:** [`docs/ARCHITECTURE-GUIDE.md`](docs/ARCHITECTURE-GUIDE.md) — comprehensive guide with hexagonal architecture, roadmap, backend/MCP/GraphQL structure, and code examples for every layer. That document is the primary reference for developers and AI assistants.

## Project Overview

**Thinko Cordo IA** — Open-source web-based electronics circuit simulator (inspired by Tinkercad). Users place electronic components on a canvas, connect them with wires, and run simulations to see real electrical behavior (LEDs lighting up, components burning out, etc.). The platform allows community-contributed components via the `.ecomp` file format, similar to mods in Minecraft.

## Architecture

### Frontend (React + TypeScript + Vite)
- **Canvas layer** (`frontend/src/canvas/`) — Konva.js-based interactive circuit canvas. `CircuitCanvas.tsx` is the main stage; `ComponentNode.tsx` renders placed components; `WireConnection.tsx` renders wires between pins.
- **Simulation engine** (`frontend/src/simulation/`) — Client-side Modified Nodal Analysis (MNA) solver. `engine.ts` is the core solver, `circuit-graph.ts` builds netlists via union-find, `component-models.ts` has stamp functions for each electrical type (resistor, voltage source, diode), `analysis.ts` is the public API.
- **State management** (`frontend/src/store/`) — Zustand stores. `circuit-store.ts` holds placed components and wires, `simulation-store.ts` holds simulation results, `ui-store.ts` holds UI state (selection, wire drafting, search).
- **Component format** (`.ecomp`) — Custom JSON file format for electronic components. Defined in `frontend/src/types/component.ts`. Files live in `/components/*.ecomp`. Loaded by `frontend/src/utils/ecomp-parser.ts`.

### Backend (FastAPI — planned for Phase 3+)
- Will serve components from PostgreSQL + MinIO/S3
- Handle `.ecomp` upload validation and SVG sanitization
- MCP server integration (Phase 10)

### Key Data Flow
1. User places component → `circuit-store` updates
2. Auto-simulate triggers → `circuit-graph.ts` builds netlist via union-find → `engine.ts` solves MNA matrix → results stored in `simulation-store`
3. Canvas re-renders with visual states (LED glow, burned overlay)

### .ecomp Format
Declarative JSON — no executable code. Contains: metadata, inline SVG visual, electrical properties, pin definitions, simulation model reference, state rules. Security: SVG sanitized, no code execution, size-limited.

## Commands

```bash
# Frontend
cd frontend
npm install          # Install dependencies
npm run dev          # Dev server (localhost:5173)
npm run build        # Production build
npx tsc --noEmit     # Type check
```

## Key Conventions

- Components are added by creating `.ecomp` JSON files in `/components/` — no code changes needed
- Simulation models (`ideal_resistor`, `ideal_voltage_source`, `ideal_diode`, `ideal_wire`, `protoboard`) are referenced by name in `.ecomp` files, implemented in `component-models.ts`
- Pin positions in `.ecomp` are relative to the component's visual bounds
- Ground node is auto-detected from the negative terminal of the first voltage source
- The simulation engine uses Newton-Raphson iteration for nonlinear components (diodes/LEDs)
- Vite custom plugin in `vite.config.ts` handles `.ecomp` file imports as JSON modules
