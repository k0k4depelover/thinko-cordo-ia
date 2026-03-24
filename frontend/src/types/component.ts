/**
 * .ecomp File Format Types
 *
 * These types mirror the JSON schema of `.ecomp` files — the declarative
 * component format used by Thinko Cordo IA. Each `.ecomp` file describes
 * one electronic component (metadata, SVG visual, electrical properties,
 * pin layout, simulation model, and state rules).
 *
 * Security: .ecomp files contain NO executable code. SVG data is sanitized
 * on load. Components are added by dropping a `.ecomp` file in `/components/`.
 */

/** Root structure of a .ecomp JSON file. */
export interface ECompFile {
  ecomp_version: string;
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  license: string;
  version: string;

  visual: ECompVisual;
  electrical: ECompElectrical;
  pins: ECompPin[];
  simulation: ECompSimulation;
}

export interface ECompVisual {
  type: 'svg_inline' | 'svg_ref' | 'image_ref';
  data?: string;
  ref?: string;
  width: number;
  height: number;
  states: Record<string, ECompVisualState>;
}

export interface ECompVisualState {
  fill?: string;
  opacity?: number;
  glow?: boolean;
  strokeDasharray?: string;
}

export interface ECompElectrical {
  type: 'resistor' | 'voltage_source' | 'diode' | 'connector' | 'passive_board' | 'wire';
  properties: Record<string, ECompProperty>;
  can_burn: boolean;
  burn_conditions: ECompBurnCondition[];
}

export interface ECompProperty {
  value: number;
  unit: string;
  min?: number;
  max?: number;
}

export interface ECompBurnCondition {
  parameter: string;
  threshold: number;
  unit: string;
}

export interface ECompPin {
  id: string;
  label: string;
  position: { x: number; y: number };
  direction?: 'top' | 'bottom' | 'left' | 'right';
  electrical_type: 'anode' | 'cathode' | 'passive' | 'power' | 'ground';
}

export type SimulationModelType =
  | 'ideal_resistor'
  | 'ideal_voltage_source'
  | 'ideal_diode'
  | 'ideal_wire'
  | 'protoboard';

export interface ECompSimulation {
  model: SimulationModelType;
  parameters: Record<string, number>;
  state_rules: ECompStateRule[];
}

export interface ECompStateRule {
  condition: Record<string, Record<string, number>>;
  visual_state: string;
  event?: string;
}
