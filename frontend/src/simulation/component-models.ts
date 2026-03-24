/**
 * Component Models — Each electrical type knows how to "stamp" itself
 * into the MNA (Modified Nodal Analysis) matrix.
 *
 * MNA matrix structure:
 * [ G  B ] [ v ]   [ i ]
 * [ C  D ] [ j ] = [ e ]
 *
 * Where:
 * - G: conductance matrix (node voltages)
 * - B, C: voltage source coupling
 * - D: zero (for ideal voltage sources)
 * - v: node voltages (unknowns)
 * - j: voltage source currents (unknowns)
 * - i: current source vector
 * - e: voltage source values
 */

import type { NetlistBranch } from './circuit-graph';

export interface StampResult {
  conductanceStamps: { row: number; col: number; value: number }[];
  voltageSourceStamps: {
    vsIndex: number;
    nodePositive: number;
    nodeNegative: number;
    voltage: number;
  }[];
}

/**
 * Maps node IDs to matrix indices, excluding ground (ground is not in matrix).
 */
export function buildNodeIndexMap(
  nodeIds: string[],
  groundNodeId: string
): Map<string, number> {
  const map = new Map<string, number>();
  let idx = 0;
  for (const id of nodeIds) {
    if (id === groundNodeId) continue;
    map.set(id, idx++);
  }
  return map;
}

/**
 * Stamps a resistor into the conductance matrix.
 * For resistance R between nodes i and j:
 *   G[i][i] += 1/R
 *   G[j][j] += 1/R
 *   G[i][j] -= 1/R
 *   G[j][i] -= 1/R
 */
export function stampResistor(
  branch: NetlistBranch,
  nodeIndexMap: Map<string, number>
): StampResult {
  const r = branch.parameters.resistance ?? 1000;
  const g = 1 / r;
  const iA = nodeIndexMap.get(branch.nodeA);
  const iB = nodeIndexMap.get(branch.nodeB);
  const stamps: StampResult['conductanceStamps'] = [];

  if (iA !== undefined) stamps.push({ row: iA, col: iA, value: g });
  if (iB !== undefined) stamps.push({ row: iB, col: iB, value: g });
  if (iA !== undefined && iB !== undefined) {
    stamps.push({ row: iA, col: iB, value: -g });
    stamps.push({ row: iB, col: iA, value: -g });
  }

  return { conductanceStamps: stamps, voltageSourceStamps: [] };
}

/**
 * Stamps a voltage source into the MNA matrix.
 * Adds an extra row/column for the current through the source.
 */
export function stampVoltageSource(
  branch: NetlistBranch,
  nodeIndexMap: Map<string, number>,
  vsIndex: number
): StampResult {
  const v = branch.parameters.voltage ?? 9;
  const iA = nodeIndexMap.get(branch.nodeA); // positive terminal
  const iB = nodeIndexMap.get(branch.nodeB); // negative terminal

  return {
    conductanceStamps: [],
    voltageSourceStamps: [{
      vsIndex,
      nodePositive: iA ?? -1,
      nodeNegative: iB ?? -1,
      voltage: v,
    }],
  };
}

/**
 * Stamps a diode (LED) using a linearized model.
 * In the "on" state: modeled as a voltage source (Vf) in series with Rs.
 * In the "off" state: modeled as a very large resistance (open circuit).
 *
 * For Newton-Raphson iteration, we use a companion model:
 * The diode is replaced by a conductance Geq and current source Ieq.
 */
export function stampDiode(
  branch: NetlistBranch,
  nodeIndexMap: Map<string, number>,
  vsIndex: number,
  previousVoltage?: number
): StampResult & { needsIteration: boolean; isOn: boolean } {
  const vf = branch.parameters.vf ?? 2.0;
  const rs = branch.parameters.rs ?? 0.5;
  const vAcross = previousVoltage ?? 0;

  // Simple piecewise linear model
  const isOn = vAcross >= vf;

  if (isOn) {
    // Model as voltage source Vf in series with resistance Rs
    // This is equivalent to a Thevenin equivalent
    // We use a voltage source for Vf and stamp Rs separately
    const iA = nodeIndexMap.get(branch.nodeA);
    const iB = nodeIndexMap.get(branch.nodeB);

    const gRs = 1 / rs;
    const conductanceStamps: StampResult['conductanceStamps'] = [];

    if (iA !== undefined) conductanceStamps.push({ row: iA, col: iA, value: gRs });
    if (iB !== undefined) conductanceStamps.push({ row: iB, col: iB, value: gRs });
    if (iA !== undefined && iB !== undefined) {
      conductanceStamps.push({ row: iA, col: iB, value: -gRs });
      conductanceStamps.push({ row: iB, col: iA, value: -gRs });
    }

    return {
      conductanceStamps,
      voltageSourceStamps: [{
        vsIndex,
        nodePositive: iA ?? -1,
        nodeNegative: iB ?? -1,
        voltage: vf,
      }],
      needsIteration: true,
      isOn,
    };
  } else {
    // Off state: very large resistance (effectively open circuit)
    const rOff = 1e9;
    const gOff = 1 / rOff;
    const iA = nodeIndexMap.get(branch.nodeA);
    const iB = nodeIndexMap.get(branch.nodeB);
    const stamps: StampResult['conductanceStamps'] = [];

    if (iA !== undefined) stamps.push({ row: iA, col: iA, value: gOff });
    if (iB !== undefined) stamps.push({ row: iB, col: iB, value: gOff });
    if (iA !== undefined && iB !== undefined) {
      stamps.push({ row: iA, col: iB, value: -gOff });
      stamps.push({ row: iB, col: iA, value: -gOff });
    }

    return {
      conductanceStamps: stamps,
      voltageSourceStamps: [],
      needsIteration: true,
      isOn,
    };
  }
}

/**
 * Returns the stamp function for a given simulation model.
 */
export function getModelStamper(model: string) {
  switch (model) {
    case 'ideal_resistor':
      return 'resistor' as const;
    case 'ideal_voltage_source':
      return 'voltage_source' as const;
    case 'ideal_diode':
      return 'diode' as const;
    default:
      return 'resistor' as const;
  }
}
