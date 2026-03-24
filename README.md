# Thinko Cordo IA

Open-source web-based electronics circuit simulator. Build circuits with real electrical behavior — LEDs light up, resistors limit current, components burn out when overloaded.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## How to Use

1. **Browse components** in the left sidebar (Battery, Resistor, LED, Jumper Cable, Protoboard)
2. **Click a component** to place it on the canvas
3. **Click a pin** (colored dot) to start a wire, then click another pin to connect
4. **Simulation runs automatically** — watch LEDs light up and see warnings if something is wrong
5. **Click a placed component** to see its electrical properties and simulation results
6. **Press ESC** to cancel wire drawing

## The .ecomp Format

Components are defined as `.ecomp` files (JSON) in the `/components/` directory. Each file describes:

- **Visual**: Inline SVG with state-based appearance (off, on, burned)
- **Electrical**: Component type, properties (resistance, voltage, etc.), burn conditions
- **Pins**: Connection points with positions and electrical types
- **Simulation**: Model reference and state transition rules

To add a new component, create a `.ecomp` file following the existing examples. No code changes required.

See [docs/ecomp-spec.md](docs/ecomp-spec.md) for the full specification.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + TypeScript |
| Canvas | Konva.js (react-konva) |
| State | Zustand |
| Simulation | Modified Nodal Analysis (client-side) |
| Build | Vite |

## Project Structure

```
frontend/src/
  canvas/        # Konva canvas components
  components/    # React UI (sidebar, search, panels)
  simulation/    # MNA circuit solver engine
  store/         # Zustand state management
  types/         # TypeScript type definitions
  utils/         # .ecomp parser, geometry helpers
components/      # Built-in .ecomp component library
docs/            # Documentation
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

The easiest way to contribute is by creating new `.ecomp` component files — no coding required, just JSON and SVG.

## License

MIT
