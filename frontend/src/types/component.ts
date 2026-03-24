// Types derived from the .ecomp file format specification

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
