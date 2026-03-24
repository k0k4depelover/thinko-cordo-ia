/**
 * Analysis — High-level simulation interface.
 * Wraps the MNA engine and provides user-friendly results.
 */

import type { PlacedComponent, Wire } from '../types/circuit';
import type { ECompFile } from '../types/component';
import type { SimulationResult } from '../types/simulation';
import { runSimulation } from './engine';

export { runSimulation };

/**
 * Quick validation: checks if a circuit can be simulated without running full analysis.
 */
export function validateCircuit(
  components: PlacedComponent[],
  wires: Wire[],
  library: Map<string, ECompFile>
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (components.length === 0) {
    issues.push('Place at least one component to simulate');
    return { valid: false, issues };
  }

  // Check for battery
  const hasBattery = components.some(c => {
    const ecomp = library.get(c.componentId);
    return ecomp?.electrical.type === 'voltage_source';
  });
  if (!hasBattery) {
    issues.push('Circuit needs a voltage source (battery)');
  }

  // Check all components have at least one wire connection
  for (const comp of components) {
    const ecomp = library.get(comp.componentId);
    if (!ecomp) continue;
    // Wire and board types don't need explicit wire connections
    if (ecomp.electrical.type === 'wire' || ecomp.electrical.type === 'passive_board') continue;

    const hasConnection = wires.some(
      w => w.fromComponentId === comp.instanceId || w.toComponentId === comp.instanceId
    );
    if (!hasConnection) {
      issues.push(`${ecomp.name} is not connected to anything`);
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Formats simulation results into human-readable descriptions.
 */
export function describeResults(result: SimulationResult): string[] {
  const descriptions: string[] = [];

  if (!result.success) {
    for (const err of result.errors) {
      descriptions.push(`Error: ${err.message}`);
    }
    return descriptions;
  }

  for (const [id, state] of Object.entries(result.componentStates)) {
    const v = state.voltage.toFixed(2);
    const i = (state.current * 1000).toFixed(2);
    const p = (state.power * 1000).toFixed(2);

    let desc = `${id}: ${v}V, ${i}mA, ${p}mW`;
    if (state.visualState === 'on') desc += ' [ON]';
    if (state.visualState === 'burned') desc += ' [BURNED]';
    descriptions.push(desc);
  }

  for (const warning of result.warnings) {
    descriptions.push(`Warning: ${warning.message}`);
  }

  return descriptions;
}
