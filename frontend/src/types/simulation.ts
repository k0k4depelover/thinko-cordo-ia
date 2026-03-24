// Simulation result types

export interface SimulationResult {
  success: boolean;
  nodeVoltages: Record<string, number>;
  branchCurrents: Record<string, number>;
  componentStates: Record<string, ComponentSimState>;
  errors: SimulationError[];
  warnings: SimulationWarning[];
}

export interface ComponentSimState {
  visualState: string; // "off" | "on" | "burned" etc.
  voltage: number;
  current: number;
  power: number;
}

export interface SimulationError {
  type: 'open_circuit' | 'short_circuit' | 'no_ground' | 'no_source' | 'singular_matrix';
  message: string;
  componentIds?: string[];
}

export interface SimulationWarning {
  type: 'overcurrent' | 'overvoltage' | 'no_resistor' | 'reverse_polarity' | 'burned';
  message: string;
  componentId: string;
}
