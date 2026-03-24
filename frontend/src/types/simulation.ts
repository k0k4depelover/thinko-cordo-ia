/**
 * Simulation Result Types
 *
 * Output of the MNA (Modified Nodal Analysis) simulation engine.
 * These types are consumed by:
 * - CircuitCanvas (drives visual state: LED glow, burned overlay)
 * - PropertyPanel (shows voltage/current/power per component)
 * - WarningsPanel (displays errors and warnings)
 *
 * Phase 0 note (bug #4): `branchCurrents` for voltage sources and diodes
 * are now read directly from the MNA solution vector (not approximated).
 */

/** Complete result of a simulation run. */
export interface SimulationResult {
  /** Whether the solver converged successfully. */
  success: boolean;
  /** Node voltages keyed by node id (e.g. "n0" → 0, "n1" → 5). */
  nodeVoltages: Record<string, number>;
  /** Branch currents keyed by component instanceId (amps). */
  branchCurrents: Record<string, number>;
  /** Per-component visual and electrical state, keyed by instanceId. */
  componentStates: Record<string, ComponentSimState>;
  /** Fatal errors that prevented simulation (open circuit, singular matrix, etc.). */
  errors: SimulationError[];
  /** Non-fatal warnings (overcurrent, missing resistor, component burned). */
  warnings: SimulationWarning[];
}

/** Electrical and visual state of a single component after simulation. */
export interface ComponentSimState {
  /** Visual state name matching .ecomp visual.states keys (e.g. "off", "on", "burned"). */
  visualState: string;
  /** Voltage across the component (volts). */
  voltage: number;
  /** Current through the component (amps). */
  current: number;
  /** Power dissipated by the component (watts). */
  power: number;
}

/** A fatal simulation error — circuit could not be solved. */
export interface SimulationError {
  type: 'open_circuit' | 'short_circuit' | 'no_ground' | 'no_source' | 'singular_matrix';
  message: string;
  /** Optional: which components are involved. */
  componentIds?: string[];
}

/** A non-fatal warning — simulation succeeded but something is wrong. */
export interface SimulationWarning {
  type: 'overcurrent' | 'overvoltage' | 'no_resistor' | 'reverse_polarity' | 'burned';
  message: string;
  /** The instanceId of the component that triggered this warning. */
  componentId: string;
}
