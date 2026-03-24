/**
 * MNA Simulation Engine
 *
 * Implements Modified Nodal Analysis to solve DC circuits.
 * Uses Newton-Raphson iteration for nonlinear components (diodes/LEDs).
 *
 * Flow:
 * 1. Build netlist from circuit graph
 * 2. Count voltage sources to determine matrix size
 * 3. Stamp all components into MNA matrix
 * 4. Solve the linear system Ax = b
 * 5. For nonlinear components, iterate until convergence
 * 6. Post-process: check burn conditions, determine visual states
 */

import type { PlacedComponent, Wire } from '../types/circuit';
import type { ECompFile } from '../types/component';
import type { SimulationResult, SimulationError, SimulationWarning, ComponentSimState } from '../types/simulation';
import { buildNetlist, type Netlist } from './circuit-graph';
import {
  buildNodeIndexMap,
  stampResistor,
  stampVoltageSource,
  stampDiode,
  getModelStamper,
} from './component-models';

const MAX_ITERATIONS = 50;
const CONVERGENCE_THRESHOLD = 1e-6;

/**
 * Solves a linear system Ax = b using Gaussian elimination with partial pivoting.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  // Augmented matrix
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-15) return null; // Singular matrix

    // Swap rows
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    if (Math.abs(aug[row][row]) < 1e-15) return null;
    let sum = aug[row][n];
    for (let col = row + 1; col < n; col++) {
      sum -= aug[row][col] * x[col];
    }
    x[row] = sum / aug[row][row];
  }

  return x;
}

/**
 * Main simulation function.
 * Takes placed components and wires, returns simulation results.
 */
export function runSimulation(
  placedComponents: PlacedComponent[],
  wires: Wire[],
  componentLibrary: Map<string, ECompFile>
): SimulationResult {
  const errors: SimulationError[] = [];
  const warnings: SimulationWarning[] = [];

  if (placedComponents.length === 0) {
    return {
      success: false,
      nodeVoltages: {},
      branchCurrents: {},
      componentStates: {},
      errors: [{ type: 'open_circuit', message: 'No components in the circuit' }],
      warnings: [],
    };
  }

  // Build netlist
  const netlist = buildNetlist(placedComponents, wires, componentLibrary);

  if (netlist.errors.length > 0) {
    return {
      success: false,
      nodeVoltages: {},
      branchCurrents: {},
      componentStates: {},
      errors: netlist.errors.map(msg => ({
        type: 'open_circuit' as const,
        message: msg,
      })),
      warnings: [],
    };
  }

  // Check for voltage sources
  const hasVoltageSource = netlist.branches.some(b => b.type === 'voltage_source');
  if (!hasVoltageSource) {
    return {
      success: false,
      nodeVoltages: {},
      branchCurrents: {},
      componentStates: {},
      errors: [{ type: 'no_source', message: 'Circuit has no voltage source (battery)' }],
      warnings: [],
    };
  }

  // Validate circuit connectivity
  const connectivityErrors = validateCircuitConnectivity(netlist);
  if (connectivityErrors.length > 0) {
    return {
      success: false,
      nodeVoltages: {},
      branchCurrents: {},
      componentStates: {},
      errors: connectivityErrors,
      warnings: [],
    };
  }

  // Build node index map (excluding ground)
  const nodeIds = netlist.nodes.map(n => n.id);
  const nodeIndexMap = buildNodeIndexMap(nodeIds, netlist.groundNodeId);
  const numNodes = nodeIndexMap.size;

  // Count voltage sources
  let numVoltageSources = 0;
  for (const branch of netlist.branches) {
    const modelType = getModelStamper(branch.simulationModel);
    if (modelType === 'voltage_source') numVoltageSources++;
    if (modelType === 'diode') numVoltageSources++; // Diode ON state uses a VS
  }

  const matrixSize = numNodes + numVoltageSources;

  if (matrixSize === 0) {
    return {
      success: false,
      nodeVoltages: {},
      branchCurrents: {},
      componentStates: {},
      errors: [{ type: 'open_circuit', message: 'Circuit produces empty matrix — check connections' }],
      warnings: [],
    };
  }

  // Newton-Raphson iteration for nonlinear components
  let previousVoltages = new Map<string, number>();
  let solution: number[] | null = null;
  let vsIndexMap = new Map<string, number>(); // instanceId -> vsIndex in matrix

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Initialize matrix and RHS vector
    const A: number[][] = Array.from({ length: matrixSize }, () =>
      new Array(matrixSize).fill(0)
    );
    const b: number[] = new Array(matrixSize).fill(0);

    let vsIdx = 0;
    vsIndexMap = new Map<string, number>();

    // Stamp all components
    for (const branch of netlist.branches) {
      const modelType = getModelStamper(branch.simulationModel);

      if (modelType === 'resistor') {
        const result = stampResistor(branch, nodeIndexMap);
        applyStamps(A, b, result, numNodes);
      } else if (modelType === 'voltage_source') {
        const result = stampVoltageSource(branch, nodeIndexMap, vsIdx);
        applyStamps(A, b, result, numNodes);
        vsIndexMap.set(branch.instanceId, vsIdx);
        vsIdx++;
      } else if (modelType === 'diode') {
        const prevV = previousVoltages.get(branch.instanceId) ?? 0;
        const result = stampDiode(branch, nodeIndexMap, vsIdx, prevV);

        if (result.isOn) {
          applyStamps(A, b, result, numNodes);
          vsIndexMap.set(branch.instanceId, vsIdx);
          vsIdx++;
        } else {
          // Off state: only conductance stamps, no VS
          applyStamps(A, b, {
            conductanceStamps: result.conductanceStamps,
            voltageSourceStamps: [],
          }, numNodes);
        }
      }
    }

    // Solve
    const actualSize = numNodes + vsIdx;
    const Atrim = A.slice(0, actualSize).map(row => row.slice(0, actualSize));
    const bTrim = b.slice(0, actualSize);

    solution = solveLinearSystem(Atrim, bTrim);

    if (!solution) {
      errors.push({
        type: 'singular_matrix',
        message: 'Could not solve circuit — check for short circuits or disconnected components',
      });
      return {
        success: false,
        nodeVoltages: {},
        branchCurrents: {},
        componentStates: {},
        errors,
        warnings: [],
      };
    }

    // Check convergence for nonlinear components
    let converged = true;
    const newVoltages = new Map<string, number>();

    for (const branch of netlist.branches) {
      const modelType = getModelStamper(branch.simulationModel);
      if (modelType === 'diode') {
        const iA = nodeIndexMap.get(branch.nodeA);
        const iB = nodeIndexMap.get(branch.nodeB);
        const vA = iA !== undefined ? solution[iA] : 0;
        const vB = iB !== undefined ? solution[iB] : 0;
        const vAcross = vA - vB;
        newVoltages.set(branch.instanceId, vAcross);

        const prevV = previousVoltages.get(branch.instanceId) ?? 0;
        if (Math.abs(vAcross - prevV) > CONVERGENCE_THRESHOLD) {
          converged = false;
        }
      }
    }

    previousVoltages = newVoltages;

    if (converged) break;
  }

  if (!solution) {
    return {
      success: false,
      nodeVoltages: {},
      branchCurrents: {},
      componentStates: {},
      errors: [{ type: 'singular_matrix', message: 'Simulation did not converge' }],
      warnings: [],
    };
  }

  // Extract results
  const nodeVoltages: Record<string, number> = {};
  for (const [nodeId, idx] of nodeIndexMap) {
    nodeVoltages[nodeId] = solution[idx];
  }
  nodeVoltages[netlist.groundNodeId] = 0;

  // Calculate branch currents and component states
  const branchCurrents: Record<string, number> = {};
  const componentStates: Record<string, ComponentSimState> = {};

  for (const branch of netlist.branches) {
    const iA = nodeIndexMap.get(branch.nodeA);
    const iB = nodeIndexMap.get(branch.nodeB);
    const vA = iA !== undefined ? solution[iA] : 0;
    const vB = iB !== undefined ? solution[iB] : 0;
    const voltage = vA - vB;

    let current = 0;
    const modelType = getModelStamper(branch.simulationModel);

    if (modelType === 'resistor') {
      const r = branch.parameters.resistance ?? 1000;
      current = voltage / r;
    } else if (modelType === 'voltage_source') {
      // Current through voltage sources is stored in the extended part of the
      // MNA solution vector at index numNodes + vsIndex
      const vsIdx = vsIndexMap.get(branch.instanceId);
      if (vsIdx !== undefined) {
        current = solution[numNodes + vsIdx];
      }
    } else if (modelType === 'diode') {
      const vsIdx = vsIndexMap.get(branch.instanceId);
      if (vsIdx !== undefined) {
        // Diode ON: current from MNA solution (same as voltage source current)
        current = solution[numNodes + vsIdx];
      } else {
        // Diode OFF: leakage current through high resistance
        current = voltage / 1e9;
      }
    }

    branchCurrents[branch.instanceId] = current;

    const power = Math.abs(voltage * current);
    const ecomp = componentLibrary.get(branch.componentId);

    // Determine visual state from state rules
    let visualState = 'off';
    if (ecomp) {
      for (const rule of ecomp.simulation.state_rules) {
        const matches = evaluateStateRule(rule.condition, current, voltage);
        if (matches) {
          visualState = rule.visual_state;
          if (rule.event === 'component_burned') {
            warnings.push({
              type: 'burned',
              message: `${ecomp.name} burned out! Current (${(current * 1000).toFixed(1)}mA) exceeded maximum rating.`,
              componentId: branch.instanceId,
            });
          }
        }
      }

      // Check burn conditions
      if (ecomp.electrical.can_burn) {
        for (const bc of ecomp.electrical.burn_conditions) {
          const paramValue = bc.parameter === 'forward_current' ? current :
                            bc.parameter === 'reverse_voltage' ? -voltage : 0;
          if (paramValue > bc.threshold) {
            visualState = 'burned';
            if (!warnings.some(w => w.componentId === branch.instanceId && w.type === 'burned')) {
              warnings.push({
                type: 'burned',
                message: `${ecomp.name} burned out! ${bc.parameter} (${paramValue.toFixed(4)}) exceeded ${bc.threshold}${bc.unit}`,
                componentId: branch.instanceId,
              });
            }
          }
        }
      }
    }

    componentStates[branch.instanceId] = {
      visualState,
      voltage,
      current,
      power,
    };
  }

  // Check for LED without resistor
  for (const branch of netlist.branches) {
    const ecomp = componentLibrary.get(branch.componentId);
    if (!ecomp || ecomp.electrical.type !== 'diode') continue;
    const hasResistorInPath = netlist.branches.some(b =>
      b.type === 'resistor' &&
      (b.nodeA === branch.nodeA || b.nodeA === branch.nodeB ||
       b.nodeB === branch.nodeA || b.nodeB === branch.nodeB)
    );
    if (!hasResistorInPath) {
      warnings.push({
        type: 'no_resistor',
        message: `${ecomp.name} connected without a current-limiting resistor — risk of damage!`,
        componentId: branch.instanceId,
      });
    }
  }

  return {
    success: true,
    nodeVoltages,
    branchCurrents,
    componentStates,
    errors,
    warnings,
  };
}

function applyStamps(
  A: number[][],
  b: number[],
  stamps: { conductanceStamps: { row: number; col: number; value: number }[]; voltageSourceStamps: { vsIndex: number; nodePositive: number; nodeNegative: number; voltage: number }[] },
  numNodes: number
): void {
  for (const s of stamps.conductanceStamps) {
    A[s.row][s.col] += s.value;
  }
  for (const vs of stamps.voltageSourceStamps) {
    const vsRow = numNodes + vs.vsIndex;
    if (vs.nodePositive >= 0) {
      A[vs.nodePositive][vsRow] += 1;
      A[vsRow][vs.nodePositive] += 1;
    }
    if (vs.nodeNegative >= 0) {
      A[vs.nodeNegative][vsRow] -= 1;
      A[vsRow][vs.nodeNegative] -= 1;
    }
    b[vsRow] = vs.voltage;
  }
}

function evaluateStateRule(
  condition: Record<string, Record<string, number>>,
  current: number,
  voltage: number
): boolean {
  for (const [param, checks] of Object.entries(condition)) {
    const value = param === 'current_through' ? Math.abs(current) :
                  param === 'voltage_across' ? voltage : 0;
    for (const [op, threshold] of Object.entries(checks)) {
      switch (op) {
        case 'gt': if (!(value > threshold)) return false; break;
        case 'gte': if (!(value >= threshold)) return false; break;
        case 'lt': if (!(value < threshold)) return false; break;
        case 'lte': if (!(value <= threshold)) return false; break;
        case 'eq': if (!(Math.abs(value - threshold) < 1e-9)) return false; break;
      }
    }
  }
  return true;
}

function validateCircuitConnectivity(netlist: Netlist): SimulationError[] {
  const errors: SimulationError[] = [];

  // Check that at least one branch connects to ground
  const groundConnected = netlist.branches.some(
    b => b.nodeA === netlist.groundNodeId || b.nodeB === netlist.groundNodeId
  );
  if (!groundConnected && netlist.branches.length > 0) {
    errors.push({
      type: 'no_ground',
      message: 'No component is connected to ground reference',
    });
  }

  // Check for isolated nodes (nodes connected to only one branch)
  const nodeConnections = new Map<string, number>();
  for (const branch of netlist.branches) {
    nodeConnections.set(branch.nodeA, (nodeConnections.get(branch.nodeA) ?? 0) + 1);
    nodeConnections.set(branch.nodeB, (nodeConnections.get(branch.nodeB) ?? 0) + 1);
  }

  for (const [nodeId, count] of nodeConnections) {
    if (count < 2 && nodeId !== netlist.groundNodeId) {
      errors.push({
        type: 'open_circuit',
        message: `Open circuit detected — node ${nodeId} has only one connection`,
      });
    }
  }

  return errors;
}
