# Thinko Cordo IA — Architecture Guide & Roadmap

> **Audience:** Developers, AI assistants (Claude, GPT, Copilot), and contributors.
> **Purpose:** Serve as the single source of truth for understanding, building, and scaling the project.
> **Last updated:** 2026-03-21

---

## Table of Contents

1. [Current State & Critical Bugs](#1-current-state--critical-bugs)
2. [Hexagonal Architecture Overview](#2-hexagonal-architecture-overview)
3. [Domain Layer — Entities & Value Objects](#3-domain-layer--entities--value-objects)
4. [Application Layer — Use Cases & Ports](#4-application-layer--use-cases--ports)
5. [Infrastructure Layer — Adapters](#5-infrastructure-layer--adapters)
6. [Frontend Architecture (React + Konva)](#6-frontend-architecture-react--konva)
7. [Backend Architecture (FastAPI + GraphQL)](#7-backend-architecture-fastapi--graphql)
8. [MCP Server Integration](#8-mcp-server-integration)
9. [Directory Structure Target](#9-directory-structure-target)
10. [Roadmap by Phases](#10-roadmap-by-phases)
11. [Code Examples per Layer](#11-code-examples-per-layer)
12. [Feature Ideas & Extras](#12-feature-ideas--extras)
13. [Contributing Checklist](#13-contributing-checklist)

---

## 1. Current State & Critical Bugs

### What works today
- Component placement, dragging, rotation (visual)
- Wire drawing between pins (visual)
- MNA solver for simple DC circuits (battery + resistor + LED)
- Auto-simulation on circuit changes
- LED glow, burned overlay, warnings panel
- `.ecomp` component format with 5 built-in components
- Sidebar search, property panel, zoom/pan

### Critical bugs to fix FIRST (Phase 0)

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 1 | **Z-index: protoboard renders over LEDs/components** | `CircuitCanvas.tsx` — all components in same layer, render order = insertion order | Components placed first are hidden behind later ones |
| 2 | **No click-to-bring-to-front** | `CircuitCanvas.tsx` — no z-index management on click/drag | Users can't interact with overlapped components |
| 3 | **Rotated components disconnect electrically** | `circuit-graph.ts:92-96` — netlist ignores rotation when building pin positions | Rotated components don't participate in simulation |
| 4 | **Wire current calculation is approximated** | `engine.ts:299-335` — sums resistor currents instead of reading MNA solution | Property panel shows wrong current for voltage sources |
| 5 | **Wires don't follow moved components** | `WireConnection.tsx` — recalculates positions but rotation math can drift | Visual disconnect after dragging rotated components |
| 6 | **wireDraft set to undefined instead of null** | `ui-store.ts:38` | Type inconsistency, potential null-check bugs |

### Fix order recommendation
```
Phase 0.1: Fix #6 (trivial, 1 line)
Phase 0.2: Fix #1 + #2 (z-index management — add zIndex to PlacedComponent, sort render order, bring-to-front on click)
Phase 0.3: Fix #3 (rotation-aware netlist — apply rotation transform in circuit-graph.ts buildNetlist)
Phase 0.4: Fix #4 (extract branch currents from MNA solution vector properly)
Phase 0.5: Fix #5 (ensure wire endpoint positions use same rotation math as netlist)
```

---

## 2. Hexagonal Architecture Overview

The project uses **Hexagonal Architecture (Ports & Adapters)** to keep domain logic independent of UI, databases, and external services.

```
┌─────────────────────────────────────────────────────┐
│                    ADAPTERS (Infrastructure)         │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ React UI │  │ REST/GQL │  │ MCP Server        │  │
│  │ (Konva)  │  │ API      │  │ (Claude tools)    │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                  │             │
│  ─────┼──────────────┼──────────────────┼─────────── │
│       │         INPUT PORTS             │             │
│       ▼              ▼                  ▼             │
│  ┌─────────────────────────────────────────────────┐ │
│  │              APPLICATION LAYER                   │ │
│  │         (Use Cases / Services)                   │ │
│  │                                                   │ │
│  │  PlaceComponent   SimulateCircuit   ValidateEComp│ │
│  │  ConnectWire      ExportNetlist     SearchComps   │ │
│  └───────────────────┬─────────────────────────────┘ │
│                      │                                │
│  ────────────────────┼─────────────────────────────── │
│                 OUTPUT PORTS                          │
│                      ▼                                │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ In-Memory│  │ PostgreSQL│ │ MinIO/S3          │  │
│  │ Store    │  │ Repo      │ │ (SVG assets)      │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Why hexagonal?
- **Testability:** Domain logic testable without React, database, or API
- **AI-friendly:** Each layer has clear boundaries — an AI can work on one layer without understanding the others
- **Scalability:** Swap Zustand for Redux, REST for GraphQL, or add an MCP adapter — domain stays the same

---

## 3. Domain Layer — Entities & Value Objects

The domain layer contains **pure business logic** with zero dependencies on frameworks.

### Location: `frontend/src/domain/` (to create) and `backend/src/domain/` (mirror)

### Entities

```typescript
// domain/entities/Component.ts
export interface ComponentDefinition {
  id: string;                    // e.g. "resistor-generic"
  metadata: ComponentMetadata;
  visual: ComponentVisual;
  electrical: ElectricalProperties;
  pins: PinDefinition[];
  simulation: SimulationConfig;
}

// domain/entities/Circuit.ts
export interface Circuit {
  id: string;
  name: string;
  components: PlacedComponent[];
  wires: Wire[];
  createdAt: Date;
  updatedAt: Date;
}

// domain/entities/PlacedComponent.ts
export interface PlacedComponent {
  instanceId: string;
  componentId: string;          // references ComponentDefinition.id
  position: Position;           // { x, y }
  rotation: Rotation;           // 0 | 90 | 180 | 270
  zIndex: number;               // ← NEW: for layering/bring-to-front
  properties: Record<string, number>;  // ← NEW: editable values (resistance, voltage)
}

// domain/entities/Wire.ts
export interface Wire {
  id: string;
  from: PinReference;           // { componentInstanceId, pinId }
  to: PinReference;
  routePoints: Position[];      // ← NEW: intermediate bend points
  color: string;                // ← NEW: user-customizable wire color
}
```

### Value Objects

```typescript
// domain/value-objects/Position.ts
export interface Position {
  x: number;
  y: number;
}

// domain/value-objects/Rotation.ts
export type Rotation = 0 | 90 | 180 | 270;

// domain/value-objects/PinReference.ts
export interface PinReference {
  componentInstanceId: string;
  pinId: string;
}

// domain/value-objects/SimulationResult.ts
export interface SimulationResult {
  success: boolean;
  nodeVoltages: Map<string, number>;
  branchCurrents: Map<string, number>;
  componentStates: Map<string, ComponentSimState>;
  errors: SimulationError[];
  warnings: SimulationWarning[];
}
```

---

## 4. Application Layer — Use Cases & Ports

### Location: `frontend/src/application/` (to create)

Each use case is a function/class that orchestrates domain entities through ports.

### Input Ports (driven by adapters — UI, API, MCP)

```typescript
// application/ports/input/PlaceComponentPort.ts
export interface PlaceComponentPort {
  execute(componentId: string, position: Position): PlacedComponent;
}

// application/ports/input/ConnectWirePort.ts
export interface ConnectWirePort {
  execute(from: PinReference, to: PinReference): Wire;
  validateConnection(from: PinReference, to: PinReference): ValidationResult;
}

// application/ports/input/SimulateCircuitPort.ts
export interface SimulateCircuitPort {
  execute(circuit: Circuit, library: Map<string, ComponentDefinition>): SimulationResult;
}

// application/ports/input/MoveComponentPort.ts
export interface MoveComponentPort {
  execute(instanceId: string, newPosition: Position): void;
}

// application/ports/input/BringToFrontPort.ts
export interface BringToFrontPort {
  execute(instanceId: string): void;  // Sets zIndex to max+1
}

// application/ports/input/ExportCircuitPort.ts
export interface ExportCircuitPort {
  toJSON(circuit: Circuit): string;
  toSPICE(circuit: Circuit, library: Map<string, ComponentDefinition>): string;
}

// application/ports/input/SearchComponentsPort.ts
export interface SearchComponentsPort {
  execute(query: string, filters?: CategoryFilter): ComponentDefinition[];
}
```

### Output Ports (driven by use cases — storage, external services)

```typescript
// application/ports/output/CircuitRepository.ts
export interface CircuitRepository {
  save(circuit: Circuit): Promise<void>;
  load(id: string): Promise<Circuit | null>;
  list(userId: string): Promise<CircuitSummary[]>;
  delete(id: string): Promise<void>;
}

// application/ports/output/ComponentRepository.ts
export interface ComponentRepository {
  getById(id: string): Promise<ComponentDefinition | null>;
  getAll(): Promise<ComponentDefinition[]>;
  search(query: string): Promise<ComponentDefinition[]>;
  upload(ecomp: ECompFile): Promise<string>;  // returns new ID
}

// application/ports/output/SimulationNotifier.ts
export interface SimulationNotifier {
  onResultReady(result: SimulationResult): void;
  onError(error: SimulationError): void;
}
```

### Use Case Implementation Example

```typescript
// application/use-cases/SimulateCircuitUseCase.ts
import { SimulateCircuitPort } from '../ports/input/SimulateCircuitPort';
import { SimulationNotifier } from '../ports/output/SimulationNotifier';
import { buildNetlist } from '../../domain/services/NetlistBuilder';
import { solveMNA } from '../../domain/services/MNASolver';

export class SimulateCircuitUseCase implements SimulateCircuitPort {
  constructor(private notifier: SimulationNotifier) {}

  execute(circuit: Circuit, library: Map<string, ComponentDefinition>): SimulationResult {
    // 1. Build netlist (domain service)
    const netlist = buildNetlist(circuit.components, circuit.wires, library);

    // 2. Solve (domain service)
    const result = solveMNA(netlist);

    // 3. Notify adapter
    this.notifier.onResultReady(result);

    return result;
  }
}
```

---

## 5. Infrastructure Layer — Adapters

### Location: `frontend/src/adapters/` and `backend/src/adapters/`

### Frontend Adapters (Input)

| Adapter | Drives Port | Description |
|---------|-------------|-------------|
| `ZustandCircuitAdapter` | `CircuitRepository` | In-memory store using Zustand (current `circuit-store.ts`) |
| `ZustandSimNotifier` | `SimulationNotifier` | Writes results to `simulation-store` |
| `StaticComponentAdapter` | `ComponentRepository` | Loads `.ecomp` files from static imports (current `ecomp-parser.ts`) |
| `KonvaCanvasAdapter` | UI → Input Ports | Translates Konva events to use case calls |

### Backend Adapters (Output)

| Adapter | Drives Port | Description |
|---------|-------------|-------------|
| `PostgresCircuitRepo` | `CircuitRepository` | Persists circuits to PostgreSQL |
| `PostgresComponentRepo` | `ComponentRepository` | Stores community `.ecomp` files |
| `MinIOAssetStore` | `AssetRepository` | Stores SVG assets and thumbnails |
| `GraphQLAdapter` | Input Ports | Exposes use cases via GraphQL schema |
| `MCPToolAdapter` | Input Ports | Exposes use cases as MCP tools for Claude |

---

## 6. Frontend Architecture (React + Konva)

### Current file map → Target refactor

```
frontend/src/
├── domain/                          # ← NEW: Pure business logic
│   ├── entities/
│   │   ├── Circuit.ts
│   │   ├── PlacedComponent.ts
│   │   ├── Wire.ts
│   │   └── ComponentDefinition.ts
│   ├── value-objects/
│   │   ├── Position.ts
│   │   ├── Rotation.ts
│   │   ├── PinReference.ts
│   │   └── SimulationResult.ts
│   └── services/                    # ← MOVE simulation/ here
│       ├── NetlistBuilder.ts        # was circuit-graph.ts
│       ├── MNASolver.ts             # was engine.ts
│       ├── ComponentModels.ts       # was component-models.ts
│       └── WireRouter.ts            # ← NEW: orthogonal/Bézier routing
│
├── application/                     # ← NEW: Use cases
│   ├── ports/
│   │   ├── input/
│   │   │   ├── PlaceComponentPort.ts
│   │   │   ├── ConnectWirePort.ts
│   │   │   ├── SimulateCircuitPort.ts
│   │   │   ├── MoveComponentPort.ts
│   │   │   ├── BringToFrontPort.ts
│   │   │   └── ExportCircuitPort.ts
│   │   └── output/
│   │       ├── CircuitRepository.ts
│   │       ├── ComponentRepository.ts
│   │       └── SimulationNotifier.ts
│   └── use-cases/
│       ├── PlaceComponentUseCase.ts
│       ├── ConnectWireUseCase.ts
│       ├── SimulateCircuitUseCase.ts
│       ├── BringToFrontUseCase.ts
│       └── ExportCircuitUseCase.ts
│
├── adapters/                        # ← NEW: Infrastructure adapters
│   ├── store/
│   │   ├── ZustandCircuitAdapter.ts  # wraps circuit-store
│   │   └── ZustandSimNotifier.ts     # wraps simulation-store
│   ├── components/
│   │   └── StaticComponentLoader.ts  # wraps ecomp-parser
│   └── api/
│       └── GraphQLClient.ts          # ← Phase 3+
│
├── canvas/                          # Konva rendering (stays, but cleaner)
│   ├── CircuitCanvas.tsx            # Main stage
│   ├── ComponentNode.tsx            # Component rendering
│   ├── WireConnection.tsx           # Wire rendering
│   ├── WireDraftLine.tsx            # ← NEW: visual draft while drawing
│   ├── CanvasControls.tsx           # Zoom buttons
│   └── hooks/
│       ├── useCanvasInteraction.ts  # ← NEW: drag, zoom, pan logic
│       ├── useWireDrawing.ts        # ← NEW: wire creation flow
│       └── useComponentDrag.ts      # ← NEW: snap + bring-to-front
│
├── components/                      # React UI panels (stays)
│   ├── Sidebar.tsx
│   ├── SearchBar.tsx
│   ├── ComponentCard.tsx
│   ├── SimulationBar.tsx
│   ├── PropertyPanel.tsx
│   ├── WarningsPanel.tsx
│   └── WirePropertiesPanel.tsx      # ← NEW: wire color, bend points
│
├── store/                           # Zustand stores (stays, wraps adapters)
│   ├── circuit-store.ts
│   ├── simulation-store.ts
│   └── ui-store.ts
│
├── types/                           # ← KEEP for backward compat, gradually migrate to domain/
│   ├── component.ts
│   ├── circuit.ts
│   └── simulation.ts
│
├── utils/
│   ├── ecomp-parser.ts
│   ├── geometry.ts
│   └── history.ts                   # ← NEW: undo/redo command stack
│
├── App.tsx
├── main.tsx
└── index.css
```

### Z-Index Management (Fix for "protoboard over LEDs")

Add `zIndex` to `PlacedComponent` and sort components by it before rendering:

```typescript
// In CircuitCanvas.tsx — sort components before rendering
const sortedComponents = [...placedComponents].sort((a, b) => a.zIndex - b.zIndex);

// In circuit-store.ts — bring to front
bringToFront: (instanceId: string) => {
  set((state) => {
    const maxZ = Math.max(...state.components.map(c => c.zIndex));
    return {
      components: state.components.map(c =>
        c.instanceId === instanceId ? { ...c, zIndex: maxZ + 1 } : c
      )
    };
  });
},

// Trigger on click/drag start in ComponentNode.tsx
onDragStart={() => {
  bringToFront(instanceId);
  selectComponent(instanceId);
}}
```

### Wire Routing (bendable, stretchable wires)

```typescript
// domain/services/WireRouter.ts
export interface RoutePoint {
  x: number;
  y: number;
  type: 'start' | 'bend' | 'end';
}

export function calculateOrthogonalRoute(
  start: Position,
  end: Position,
  obstacles: BoundingBox[]
): RoutePoint[] {
  // Simple L-route: go horizontal first, then vertical
  const midX = (start.x + end.x) / 2;
  return [
    { ...start, type: 'start' },
    { x: midX, y: start.y, type: 'bend' },
    { x: midX, y: end.y, type: 'bend' },
    { ...end, type: 'end' },
  ];
}

// Users can drag bend points to customize routing
export function addBendPoint(wire: Wire, position: Position, index: number): Wire {
  const newPoints = [...wire.routePoints];
  newPoints.splice(index, 0, position);
  return { ...wire, routePoints: newPoints };
}
```

---

## 7. Backend Architecture (FastAPI + GraphQL)

### Location: `backend/`

### Directory Structure

```
backend/
├── pyproject.toml                   # Python dependencies (FastAPI, Strawberry, SQLAlchemy)
├── alembic/                         # Database migrations
│   └── versions/
├── src/
│   ├── main.py                      # FastAPI app entry point
│   │
│   ├── domain/                      # Mirrors frontend domain
│   │   ├── entities/
│   │   │   ├── circuit.py
│   │   │   ├── component.py
│   │   │   └── user.py
│   │   └── services/
│   │       ├── ecomp_validator.py   # Validate .ecomp files server-side
│   │       └── svg_sanitizer.py     # Strip dangerous SVG elements
│   │
│   ├── application/
│   │   ├── ports/
│   │   │   ├── input/
│   │   │   │   ├── upload_component.py
│   │   │   │   ├── manage_circuit.py
│   │   │   │   └── search_components.py
│   │   │   └── output/
│   │   │       ├── component_repo.py
│   │   │       ├── circuit_repo.py
│   │   │       ├── asset_store.py
│   │   │       └── auth_provider.py
│   │   └── use_cases/
│   │       ├── upload_component_uc.py
│   │       ├── save_circuit_uc.py
│   │       └── search_components_uc.py
│   │
│   ├── adapters/
│   │   ├── api/
│   │   │   ├── graphql/
│   │   │   │   ├── schema.py        # Strawberry GraphQL schema
│   │   │   │   ├── types.py         # GraphQL types
│   │   │   │   ├── queries.py       # Query resolvers
│   │   │   │   └── mutations.py     # Mutation resolvers
│   │   │   └── rest/
│   │   │       ├── health.py        # Health check endpoint
│   │   │       └── upload.py        # File upload (multipart)
│   │   ├── persistence/
│   │   │   ├── models.py            # SQLAlchemy models
│   │   │   ├── postgres_component_repo.py
│   │   │   ├── postgres_circuit_repo.py
│   │   │   └── database.py          # DB connection setup
│   │   ├── storage/
│   │   │   └── minio_asset_store.py # S3-compatible asset storage
│   │   └── mcp/
│   │       └── mcp_server.py        # MCP tool definitions
│   │
│   └── config.py                    # Environment config (Pydantic Settings)
│
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   └── application/
│   └── integration/
│       ├── api/
│       └── persistence/
│
└── docker-compose.yml               # PostgreSQL + MinIO + backend
```

### GraphQL Schema Example

```python
# backend/src/adapters/api/graphql/schema.py
import strawberry
from strawberry.fastapi import GraphQLRouter

@strawberry.type
class ComponentType:
    id: str
    name: str
    category: str
    description: str
    version: str
    svg_url: str                     # Pre-signed MinIO URL
    pin_count: int
    electrical_type: str

@strawberry.type
class CircuitType:
    id: str
    name: str
    component_count: int
    wire_count: int
    created_at: str
    updated_at: str

@strawberry.type
class SimulationResultType:
    success: bool
    node_voltages: strawberry.scalars.JSON
    component_states: strawberry.scalars.JSON
    errors: list[str]
    warnings: list[str]

@strawberry.type
class Query:
    @strawberry.field
    async def components(
        self,
        query: str | None = None,
        category: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ComponentType]:
        """Search and list available components."""
        ...

    @strawberry.field
    async def circuit(self, id: str) -> CircuitType | None:
        """Load a saved circuit by ID."""
        ...

    @strawberry.field
    async def my_circuits(self, limit: int = 20) -> list[CircuitType]:
        """List circuits for the authenticated user."""
        ...

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def upload_component(self, ecomp_json: str) -> ComponentType:
        """Upload a new .ecomp component to the community library."""
        ...

    @strawberry.mutation
    async def save_circuit(self, name: str, circuit_json: str) -> CircuitType:
        """Save or update a circuit."""
        ...

    @strawberry.mutation
    async def delete_circuit(self, id: str) -> bool:
        """Delete a saved circuit."""
        ...

schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_router = GraphQLRouter(schema)
```

### REST Endpoints (complementary to GraphQL)

```
POST   /api/v1/upload           → Upload .ecomp file (multipart form)
GET    /api/v1/health            → Health check
GET    /api/v1/components/:id/svg → Serve sanitized SVG (cached, CDN-friendly)
POST   /api/v1/simulate          → Server-side simulation (for heavy circuits)
```

### Database Schema (PostgreSQL)

```sql
-- Components table
CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,        -- "resistor-generic"
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL,
    ecomp_json JSONB NOT NULL,                -- Full .ecomp content
    svg_asset_key VARCHAR(500),               -- MinIO object key
    author_id UUID REFERENCES users(id),
    downloads INTEGER DEFAULT 0,
    is_builtin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circuits table
CREATE TABLE circuits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    owner_id UUID REFERENCES users(id),
    circuit_json JSONB NOT NULL,              -- Full circuit state
    thumbnail_key VARCHAR(500),               -- MinIO key for preview image
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_components_category ON components(category);
CREATE INDEX idx_components_search ON components USING GIN(to_tsvector('english', name || ' ' || description));
CREATE INDEX idx_circuits_owner ON circuits(owner_id);
```

---

## 8. MCP Server Integration

### What is MCP here?
The **Model Context Protocol** server exposes Thinko Cordo IA tools so that Claude (or other AI assistants) can interact with circuits programmatically — e.g., "create a circuit with a 9V battery, 330Ω resistor, and red LED in series, then simulate it."

### Location: `backend/src/adapters/mcp/mcp_server.py`

### MCP Tools to expose

```python
# backend/src/adapters/mcp/mcp_server.py
from mcp.server import Server
from mcp.types import Tool, TextContent

server = Server("thinko-cordo-ia")

@server.tool()
async def create_circuit(name: str) -> str:
    """Create a new empty circuit and return its ID."""
    ...

@server.tool()
async def place_component(
    circuit_id: str,
    component_slug: str,     # e.g. "resistor-generic"
    x: float,
    y: float,
    rotation: int = 0,
    properties: dict | None = None,  # e.g. {"resistance": 470}
) -> str:
    """Place a component on the circuit canvas. Returns instance ID."""
    ...

@server.tool()
async def connect_pins(
    circuit_id: str,
    from_instance_id: str,
    from_pin_id: str,
    to_instance_id: str,
    to_pin_id: str,
) -> str:
    """Connect two component pins with a wire. Returns wire ID."""
    ...

@server.tool()
async def simulate(circuit_id: str) -> dict:
    """Run DC simulation on the circuit. Returns voltages, currents, and warnings."""
    ...

@server.tool()
async def list_components(
    query: str | None = None,
    category: str | None = None,
) -> list[dict]:
    """Search available components in the library."""
    ...

@server.tool()
async def get_circuit_state(circuit_id: str) -> dict:
    """Get the full state of a circuit (components, wires, simulation results)."""
    ...

@server.tool()
async def export_netlist(circuit_id: str, format: str = "spice") -> str:
    """Export circuit as SPICE netlist or other format."""
    ...
```

### MCP Server Configuration

```json
// .mcp.json (project root)
{
  "mcpServers": {
    "thinko-cordo-ia": {
      "command": "python",
      "args": ["-m", "backend.src.adapters.mcp.mcp_server"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "MINIO_ENDPOINT": "localhost:9000"
      }
    }
  }
}
```

### MCP ↔ Frontend Communication

```
Claude/AI ──MCP──→ Backend MCP Server ──→ Use Cases ──→ Domain
                                                          │
                                                          ▼
Frontend ←──WebSocket/SSE──── Backend pushes state updates
```

When an MCP tool modifies a circuit, the backend emits a WebSocket event so the frontend updates in real time.

---

## 9. Directory Structure Target

```
thinko-cordo-ia/
├── CLAUDE.md                        # AI assistant instructions
├── README.md                        # Project overview + quickstart
├── CONTRIBUTING.md                  # How to contribute
├── LICENSE                          # MIT
│
├── docs/
│   ├── ARCHITECTURE-GUIDE.md        # THIS FILE
│   ├── ecomp-spec.md               # .ecomp format specification
│   ├── api-reference.md            # GraphQL + REST API docs
│   └── mcp-tools.md                # MCP tool documentation
│
├── components/                      # Built-in .ecomp files
│   ├── battery-9v.ecomp
│   ├── resistor-generic.ecomp
│   ├── led-standard.ecomp
│   ├── jumper-cable.ecomp
│   ├── protoboard-half.ecomp
│   ├── capacitor-ceramic.ecomp     # ← Future
│   ├── switch-spst.ecomp           # ← Future
│   └── potentiometer.ecomp         # ← Future
│
├── frontend/                        # React + Vite SPA
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── domain/                  # Pure domain logic
│       ├── application/             # Use cases + ports
│       ├── adapters/                # Infrastructure adapters
│       ├── canvas/                  # Konva rendering
│       ├── components/              # React UI panels
│       ├── store/                   # Zustand state
│       ├── utils/                   # Geometry, history, etc.
│       ├── App.tsx
│       └── main.tsx
│
├── backend/                         # FastAPI backend
│   ├── pyproject.toml
│   ├── alembic/
│   └── src/
│       ├── domain/
│       ├── application/
│       ├── adapters/
│       │   ├── api/graphql/
│       │   ├── api/rest/
│       │   ├── persistence/
│       │   ├── storage/
│       │   └── mcp/
│       └── config.py
│
├── shared/                          # ← NEW: Shared types/schemas
│   └── ecomp-schema.json           # JSON Schema for .ecomp validation
│
├── .mcp.json                        # MCP server config
└── docker-compose.yml               # Full stack local dev
```

---

## 10. Roadmap by Phases

### Phase 0 — Fix Critical Bugs (NOW)
- [ ] Add `zIndex` to `PlacedComponent`, sort render order
- [ ] Bring-to-front on click/drag
- [ ] Fix rotation-aware netlist building in `circuit-graph.ts`
- [ ] Fix wire current extraction from MNA solution
- [ ] Fix `wireDraft` undefined → null
- [ ] Wire positions follow rotated components correctly

### Phase 1 — Interactive Canvas Polish
- [ ] **Bendable wires:** Add route points, user can drag bend points
- [ ] **Orthogonal routing:** Auto-route wires with right angles
- [ ] **Wire colors:** User picks wire color (matches real breadboard wires)
- [ ] **Undo/redo:** Command pattern history stack (Ctrl+Z / Ctrl+Y)
- [ ] **Editable properties:** Click resistance value in PropertyPanel to change it
- [ ] **Component snap-to-protoboard:** When dragging near a protoboard, snap pins to holes
- [ ] **Better pin hit detection:** Larger hit area, visual highlight on hover
- [ ] **Grid toggle:** Show/hide grid, adjust grid size

### Phase 2 — More Components & Simulation
- [ ] **New components:** Capacitor, inductor, switch (SPST/SPDT), potentiometer, buzzer, DC motor
- [ ] **AC simulation:** Transient analysis with time stepping
- [ ] **Oscilloscope view:** Plot voltage/current over time
- [ ] **Multimeter tool:** Click any two points to measure voltage difference
- [ ] **Proper diode model:** Shockley equation with Is, n, Vt parameters
- [ ] **Series/parallel detection:** Better ground node logic
- [ ] **Short circuit protection:** Detect and warn immediately

### Phase 3 — Backend & Persistence
- [ ] **FastAPI backend** setup with PostgreSQL + MinIO
- [ ] **GraphQL API** with Strawberry (queries + mutations)
- [ ] **User authentication** (JWT or OAuth2)
- [ ] **Save/load circuits** to cloud
- [ ] **Upload .ecomp files** with validation + SVG sanitization
- [ ] **Component marketplace** — browse, rate, download community components

### Phase 4 — Real-Time Collaboration
- [ ] **WebSocket** for live circuit editing
- [ ] **Cursor presence** — see other users' cursors on canvas
- [ ] **Operational transforms** or CRDT for conflict resolution
- [ ] **Circuit sharing** — public link, embed in iframe

### Phase 5 — Advanced Simulation
- [ ] **Server-side simulation** for heavy circuits (offload from browser)
- [ ] **SPICE netlist export/import**
- [ ] **IC components** (555 timer, op-amp) with subcircuit models
- [ ] **Thermal simulation** — components heat up over time
- [ ] **PCB layout preview** — auto-generate PCB from schematic

### Phase 6 — Education & Gamification
- [ ] **Tutorial mode** — guided lessons ("Build your first LED circuit")
- [ ] **Challenge mode** — "Make the LED blink using a 555 timer"
- [ ] **Circuit verification** — check if student's circuit matches expected behavior
- [ ] **Component wiki** — click any component for educational content
- [ ] **Achievements** — badges for completing challenges

### Phase 7 — Mobile & PWA
- [ ] **Touch support** — pinch to zoom, tap to place, long press to connect
- [ ] **PWA** — offline mode, install to home screen
- [ ] **Responsive sidebar** — collapse to bottom drawer on mobile

### Phase 8 — AI Integration
- [ ] **MCP server** — Claude can build and simulate circuits
- [ ] **AI assistant panel** — "Help me design a voltage divider for 3.3V"
- [ ] **Auto-fix suggestions** — "Your LED needs a current-limiting resistor, add one?"
- [ ] **Circuit explanation** — AI explains what the circuit does in plain language
- [ ] **Component recommendation** — "For this use case, try a 10kΩ potentiometer"

### Phase 9 — Community & Ecosystem
- [ ] **Component SDK** — CLI tool to create, validate, and publish `.ecomp` files
- [ ] **Component versioning** — semver for `.ecomp` files
- [ ] **Template circuits** — pre-built circuits users can start from
- [ ] **Forum/comments** — discuss components and circuits
- [ ] **API for third-party integrations** — embed simulator in other platforms

### Phase 10 — Performance & Scale
- [ ] **WebGL renderer** — for circuits with 100+ components
- [ ] **Web Worker simulation** — run solver off main thread
- [ ] **WASM solver** — port MNA engine to Rust/C++ compiled to WebAssembly
- [ ] **CDN for components** — edge-cached SVGs and metadata
- [ ] **Rate limiting & abuse prevention** — API throttling, upload limits

---

## 11. Code Examples per Layer

### Example 1: Adding a new component type (Capacitor)

**Step 1 — Create `.ecomp` file:**
```json
// components/capacitor-ceramic.ecomp
{
  "format_version": "1.0",
  "metadata": {
    "id": "capacitor-ceramic",
    "name": "Ceramic Capacitor",
    "category": "passive",
    "description": "100nF ceramic capacitor",
    "version": "1.0.0",
    "tags": ["capacitor", "ceramic", "decoupling"]
  },
  "visual": {
    "svg": "<svg>...</svg>",
    "width": 40,
    "height": 30
  },
  "electrical": {
    "type": "capacitor",
    "properties": {
      "capacitance": 0.0000001
    }
  },
  "pins": [
    { "id": "pin1", "label": "1", "position": { "x": 0, "y": 0.5 }, "electrical_type": "passive" },
    { "id": "pin2", "label": "2", "position": { "x": 1, "y": 0.5 }, "electrical_type": "passive" }
  ],
  "simulation": {
    "model": "ideal_capacitor",
    "parameters": { "capacitance": 0.0000001 }
  }
}
```

**Step 2 — Add simulation model:**
```typescript
// domain/services/ComponentModels.ts (add to existing)
export function stampCapacitor(
  branch: NetlistBranch,
  nodeIndexMap: Map<string, number>,
  dt: number,  // time step for transient analysis
  previousVoltage: number
): Stamp[] {
  // Companion model: capacitor → conductance G = C/dt, current source I = G * v_prev
  const C = branch.parameters.capacitance ?? 1e-6;
  const G = C / dt;
  const Ieq = G * previousVoltage;

  const node1 = nodeIndexMap.get(branch.nodes[0])!;
  const node2 = nodeIndexMap.get(branch.nodes[1])!;

  return [
    // Conductance stamps (same as resistor with G = C/dt)
    { type: 'conductance', row: node1, col: node1, value: G },
    { type: 'conductance', row: node2, col: node2, value: G },
    { type: 'conductance', row: node1, col: node2, value: -G },
    { type: 'conductance', row: node2, col: node1, value: -G },
    // Current source stamp
    { type: 'current', row: node1, value: -Ieq },
    { type: 'current', row: node2, value: Ieq },
  ];
}
```

**Step 3 — Register in model map:**
```typescript
// In the model registry (component-models.ts)
modelStampers.set('ideal_capacitor', stampCapacitor);
```

No other code changes needed — the `.ecomp` file auto-loads and the simulation engine picks up the new model.

---

### Example 2: Adding a Use Case (BringToFront)

```typescript
// application/ports/input/BringToFrontPort.ts
export interface BringToFrontPort {
  execute(instanceId: string): void;
}

// application/use-cases/BringToFrontUseCase.ts
import { BringToFrontPort } from '../ports/input/BringToFrontPort';
import { CircuitRepository } from '../ports/output/CircuitRepository';

export class BringToFrontUseCase implements BringToFrontPort {
  constructor(private repo: CircuitRepository) {}

  execute(instanceId: string): void {
    const circuit = this.repo.getCurrent();
    const maxZ = Math.max(...circuit.components.map(c => c.zIndex), 0);
    this.repo.updateComponent(instanceId, { zIndex: maxZ + 1 });
  }
}

// adapters/store/ZustandCircuitAdapter.ts (implements CircuitRepository)
// Just delegates to the existing Zustand store's bringToFront action
```

---

### Example 3: GraphQL Query from Frontend

```typescript
// adapters/api/GraphQLClient.ts
const SEARCH_COMPONENTS = `
  query SearchComponents($query: String, $category: String) {
    components(query: $query, category: $category, limit: 50) {
      id
      name
      category
      description
      svgUrl
      pinCount
      electricalType
    }
  }
`;

export async function searchComponentsRemote(
  query: string,
  category?: string
): Promise<ComponentDefinition[]> {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: SEARCH_COMPONENTS,
      variables: { query, category },
    }),
  });
  const { data } = await response.json();
  return data.components.map(mapToComponentDefinition);
}
```

---

### Example 4: MCP Tool calling the Use Case

```python
# backend/src/adapters/mcp/mcp_server.py
from src.application.use_cases.place_component_uc import PlaceComponentUseCase
from src.adapters.persistence.postgres_component_repo import PostgresComponentRepo
from src.adapters.persistence.postgres_circuit_repo import PostgresCircuitRepo

# Dependency injection
component_repo = PostgresComponentRepo(db_session)
circuit_repo = PostgresCircuitRepo(db_session)
place_uc = PlaceComponentUseCase(component_repo, circuit_repo)

@server.tool()
async def place_component(
    circuit_id: str,
    component_slug: str,
    x: float,
    y: float,
    rotation: int = 0,
) -> str:
    """Place a component on the circuit canvas."""
    result = await place_uc.execute(
        circuit_id=circuit_id,
        component_slug=component_slug,
        position=Position(x=x, y=y),
        rotation=rotation,
    )
    return f"Placed {component_slug} at ({x}, {y}), instanceId: {result.instance_id}"
```

---

### Example 5: Undo/Redo System

```typescript
// utils/history.ts
export interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

export class HistoryStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxSize = 100;

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];  // clear redo on new action
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
    }
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
}

// Example command: PlaceComponentCommand
export class PlaceComponentCommand implements Command {
  private instanceId: string | null = null;
  description = 'Place component';

  constructor(
    private store: CircuitStore,
    private componentId: string,
    private x: number,
    private y: number,
  ) {}

  execute(): void {
    this.instanceId = this.store.addComponent(this.componentId, this.x, this.y);
  }

  undo(): void {
    if (this.instanceId) {
      this.store.removeComponent(this.instanceId);
    }
  }
}
```

---

## 12. Feature Ideas & Extras

### Wire Interaction Enhancements
- **Drag to bend:** Click and drag any point on a wire to create a bend point
- **Snap wires to 45°/90°:** Hold Shift while drawing for angled constraints
- **Wire labels:** Show current/voltage on hover over wire
- **Wire thickness by current:** Thicker wires = more current (visual feedback)
- **Wire animation:** Flowing dots along wire to show current direction

### Canvas Enhancements
- **Minimap:** Small overview in corner for large circuits
- **Component ghost:** Semi-transparent preview while dragging from sidebar
- **Copy/paste:** Ctrl+C/V to duplicate components with wires
- **Group selection:** Drag rectangle to select multiple components
- **Align tools:** Align selected components horizontally/vertically
- **Labels/annotations:** Text labels on canvas for documentation

### Simulation Enhancements
- **Real-time probe:** Drag a voltmeter probe to any node to see voltage
- **Step-by-step:** Step through simulation iterations visually
- **What-if mode:** Slider to adjust resistance/voltage and see live results
- **Fault injection:** Simulate what happens when a component fails

### Social/Community
- **Circuit gallery:** Public showcase of community circuits
- **Fork a circuit:** Start from someone else's design
- **Embed widget:** `<iframe>` embed with interactive simulation
- **Export as image:** PNG/SVG screenshot of circuit for documentation

### Accessibility
- **Keyboard navigation:** Tab between components, Enter to connect
- **Screen reader support:** Announce component connections and simulation results
- **High contrast mode:** For visually impaired users
- **Colorblind-safe palette:** Wire colors distinguishable for all

---

## 13. Contributing Checklist

### For adding a new component
1. Create `components/your-component.ecomp` following [ecomp-spec.md](ecomp-spec.md)
2. If new simulation model needed, add stamp function in `domain/services/ComponentModels.ts`
3. Register model in the model map
4. Test: place component, connect wires, simulate, verify current/voltage

### For adding a new use case
1. Define input port interface in `application/ports/input/`
2. Implement use case class in `application/use-cases/`
3. Wire adapter in `adapters/` (Zustand for frontend, PostgreSQL for backend)
4. Connect to UI or API endpoint

### For adding a GraphQL endpoint
1. Add type in `backend/src/adapters/api/graphql/types.py`
2. Add query/mutation in corresponding file
3. Map to use case via dependency injection
4. Add integration test

### For adding an MCP tool
1. Add `@server.tool()` function in `backend/src/adapters/mcp/mcp_server.py`
2. Map to existing use case (don't put business logic in the tool)
3. Document in `docs/mcp-tools.md`
4. Test with Claude Code using `.mcp.json`

### Code style rules
- TypeScript strict mode (`noEmit` check must pass)
- No `any` types — use `unknown` + type guards
- Domain layer: zero imports from React, Konva, Zustand, or any framework
- Use cases: depend only on ports (interfaces), never on concrete adapters
- One entity/use-case/port per file
- Tests: co-located `__tests__/` folders or `*.test.ts` next to source

---

> **This guide is a living document.** Update it as the architecture evolves. Every AI assistant and developer working on this project should read this file first.
