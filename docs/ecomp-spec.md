# .ecomp File Format Specification v1.0.0

The `.ecomp` format defines electronic components for Thinko Cordo IA. It is a JSON file with the `.ecomp` extension.

## Design Principles

- **Declarative only** — No executable code. Simulation behavior references built-in models by name.
- **Human-readable** — JSON, diffable in git, easy to review in PRs.
- **Secure** — SVG sanitized (whitelist), max file size 512KB, strict schema validation.

## Structure

```jsonc
{
  "ecomp_version": "1.0.0",       // Format version (semver)
  "id": "component-slug",          // Unique identifier (lowercase, hyphens)
  "name": "Display Name",
  "description": "Human-readable description",
  "category": "group/subgroup",    // Hierarchical category
  "tags": ["searchable", "tags"],
  "author": "author-id",
  "license": "MIT",
  "version": "1.0.0",              // Component version (semver)

  "visual": { ... },               // How it looks
  "electrical": { ... },           // Electrical properties
  "pins": [ ... ],                 // Connection points
  "simulation": { ... }            // How it behaves in simulation
}
```

## Visual Section

```jsonc
"visual": {
  "type": "svg_inline",            // "svg_inline" | "svg_ref" | "image_ref"
  "data": "<svg>...</svg>",        // Inline SVG (for svg_inline)
  "width": 80,                     // Logical width in pixels
  "height": 30,                    // Logical height in pixels
  "states": {                      // Visual states keyed by name
    "off":    { "opacity": 0.5 },
    "on":     { "fill": "#ff0000", "opacity": 1.0, "glow": true },
    "burned": { "fill": "#333", "opacity": 0.7 }
  }
}
```

## Electrical Section

```jsonc
"electrical": {
  "type": "resistor",              // See "Electrical Types" below
  "properties": {
    "resistance": { "value": 330, "unit": "Ω", "min": 1, "max": 10000000 }
  },
  "can_burn": true,
  "burn_conditions": [
    { "parameter": "forward_current", "threshold": 0.030, "unit": "A" }
  ]
}
```

### Electrical Types

| Type | Description | Required Properties |
|------|-------------|-------------------|
| `resistor` | Limits current | `resistance` |
| `voltage_source` | Provides voltage | `voltage` |
| `diode` | One-way current (LEDs) | `forward_voltage`, `max_forward_current` |
| `wire` | Zero-resistance connection | none |
| `passive_board` | Breadboard with internal connections | none |
| `connector` | Generic connector | none |

## Pins Section

```jsonc
"pins": [
  {
    "id": "anode",                  // Unique within component
    "label": "Anode (+)",           // Display label
    "position": { "x": 20, "y": 0 }, // Position relative to visual bounds
    "direction": "top",             // "top" | "bottom" | "left" | "right"
    "electrical_type": "anode"      // "anode" | "cathode" | "passive" | "power" | "ground"
  }
]
```

## Simulation Section

```jsonc
"simulation": {
  "model": "ideal_diode",          // Built-in model name
  "parameters": { "vf": 2.0, "rs": 0.5 },
  "state_rules": [
    {
      "condition": { "current_through": { "gt": 0.001 } },
      "visual_state": "on"
    },
    {
      "condition": { "current_through": { "gt": 0.030 } },
      "visual_state": "burned",
      "event": "component_burned"
    }
  ]
}
```

### Available Models

| Model | Electrical Type | Parameters |
|-------|----------------|-----------|
| `ideal_resistor` | resistor | `resistance` (ohms) |
| `ideal_voltage_source` | voltage_source | `voltage` (volts) |
| `ideal_diode` | diode | `vf` (forward voltage), `rs` (series resistance) |
| `ideal_wire` | wire | none |
| `protoboard` | passive_board | none |

### State Rule Conditions

Conditions compare simulation results against thresholds:
- `current_through`: Absolute current in amps
- `voltage_across`: Voltage difference in volts

Operators: `gt`, `gte`, `lt`, `lte`, `eq`

Rules are evaluated in order. Later rules can override earlier ones (e.g., "burned" overrides "on").
