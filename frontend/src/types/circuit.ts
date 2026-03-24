/**
 * Circuit Graph Types
 *
 * These types represent the user's circuit as placed on the canvas.
 * They are the input to both the rendering layer (Konva) and the
 * simulation engine (MNA solver).
 *
 * Key design decisions:
 * - Wires reference pins by ID (`fromComponentId + fromPinId`), NOT by
 *   position. This means rotation doesn't break electrical connectivity
 *   (Phase 0, bug #3 — netlist is ID-based, so rotation is irrelevant
 *   to the electrical graph).
 * - `zIndex` on PlacedComponent controls render order (Phase 0, bugs #1/#2).
 */

/** A component instance placed on the canvas at a specific position. */
export interface PlacedComponent {
  /** Unique identifier for this placed instance (UUID). */
  instanceId: string;
  /** References the component definition's id (e.g. "resistor-generic"). */
  componentId: string;
  /** Canvas X position (center of the component, snapped to grid). */
  x: number;
  /** Canvas Y position (center of the component, snapped to grid). */
  y: number;
  /** Rotation in degrees — must be 0, 90, 180, or 270. */
  rotation: number;
  /** Layering order — higher values render on top. Managed by bringToFront(). */
  zIndex: number;
}

/** A wire connecting two component pins on the canvas. */
export interface Wire {
  /** Unique identifier for this wire (UUID). */
  id: string;
  /** instanceId of the source component. */
  fromComponentId: string;
  /** Pin id on the source component. */
  fromPinId: string;
  /** instanceId of the destination component. */
  toComponentId: string;
  /** Pin id on the destination component. */
  toPinId: string;
  /** Intermediate bend points for wire routing (currently unused, for future orthogonal routing). */
  points: { x: number; y: number }[];
}

/** Snapshot of the full circuit state. */
export interface CircuitState {
  components: PlacedComponent[];
  wires: Wire[];
}
