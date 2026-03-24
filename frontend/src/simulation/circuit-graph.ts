/**
 * Circuit Graph — Converts placed components and wires into a netlist
 * suitable for Modified Nodal Analysis (MNA).
 *
 * Key concepts:
 * - Node: An electrical connection point (where pins meet via wires)
 * - Branch: A component connecting two nodes
 * - Ground: Node 0 is always ground (reference voltage = 0V)
 */

import type { PlacedComponent, Wire } from '../types/circuit';
import type { ECompFile } from '../types/component';

export interface NetlistNode {
  id: string;        // e.g., "n0", "n1", "n2"
  index: number;     // Matrix index (ground = 0, excluded from matrix)
  connectedPins: { instanceId: string; pinId: string }[];
}

export interface NetlistBranch {
  instanceId: string;
  componentId: string;
  type: string;      // electrical.type from .ecomp
  nodeA: string;     // node id for first pin
  nodeB: string;     // node id for second pin
  parameters: Record<string, number>;
  simulationModel: string;
}

export interface Netlist {
  nodes: NetlistNode[];
  branches: NetlistBranch[];
  groundNodeId: string;
  errors: string[];
}

/**
 * Builds a netlist from placed components and wires.
 *
 * Algorithm:
 * 1. Each unconnected pin starts as its own node
 * 2. Wires merge pins into the same node (union-find)
 * 3. Wire-type components (jumper cables) also merge their pins
 * 4. Assign node indices (ground = 0)
 * 5. Create branches for each non-wire component
 */
export function buildNetlist(
  placedComponents: PlacedComponent[],
  wires: Wire[],
  componentLibrary: Map<string, ECompFile>
): Netlist {
  const errors: string[] = [];

  // Union-Find for merging connected pins into nodes
  const parent = new Map<string, string>();

  function pinKey(instanceId: string, pinId: string): string {
    return `${instanceId}:${pinId}`;
  }

  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    // Path compression
    let curr = x;
    while (curr !== root) {
      const next = parent.get(curr)!;
      parent.set(curr, root);
      curr = next;
    }
    return root;
  }

  function union(a: string, b: string): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent.set(ra, rb);
    }
  }

  // Initialize all pins
  for (const placed of placedComponents) {
    const ecomp = componentLibrary.get(placed.componentId);
    if (!ecomp) {
      errors.push(`Component definition not found: ${placed.componentId}`);
      continue;
    }
    for (const pin of ecomp.pins) {
      const key = pinKey(placed.instanceId, pin.id);
      parent.set(key, key);
    }
  }

  // Merge pins connected by wires
  for (const wire of wires) {
    const fromKey = pinKey(wire.fromComponentId, wire.fromPinId);
    const toKey = pinKey(wire.toComponentId, wire.toPinId);
    union(fromKey, toKey);
  }

  // Merge pins for wire-type components (jumper cables)
  for (const placed of placedComponents) {
    const ecomp = componentLibrary.get(placed.componentId);
    if (!ecomp) continue;
    if (ecomp.electrical.type === 'wire' && ecomp.pins.length >= 2) {
      const firstPin = pinKey(placed.instanceId, ecomp.pins[0].id);
      for (let i = 1; i < ecomp.pins.length; i++) {
        union(firstPin, pinKey(placed.instanceId, ecomp.pins[i].id));
      }
    }
  }

  // Merge pins for protoboard internal connections
  for (const placed of placedComponents) {
    const ecomp = componentLibrary.get(placed.componentId);
    if (!ecomp) continue;
    if (ecomp.electrical.type === 'passive_board') {
      // Protoboard rows: pins with same row group are connected
      // Pin IDs encode row: e.g., "r1_a", "r1_b", "r1_c" are same row
      const rows = new Map<string, string[]>();
      for (const pin of ecomp.pins) {
        const row = pin.id.split('_')[0]; // e.g., "r1" from "r1_a"
        if (!rows.has(row)) rows.set(row, []);
        rows.get(row)!.push(pinKey(placed.instanceId, pin.id));
      }
      for (const [, pins] of rows) {
        for (let i = 1; i < pins.length; i++) {
          union(pins[0], pins[i]);
        }
      }
    }
  }

  // Build nodes from union-find groups
  const nodeMap = new Map<string, NetlistNode>();
  let nodeCounter = 0;

  for (const placed of placedComponents) {
    const ecomp = componentLibrary.get(placed.componentId);
    if (!ecomp) continue;
    for (const pin of ecomp.pins) {
      const key = pinKey(placed.instanceId, pin.id);
      const root = find(key);
      if (!nodeMap.has(root)) {
        nodeMap.set(root, {
          id: `n${nodeCounter}`,
          index: nodeCounter,
          connectedPins: [],
        });
        nodeCounter++;
      }
      nodeMap.get(root)!.connectedPins.push({
        instanceId: placed.instanceId,
        pinId: pin.id,
      });
    }
  }

  const nodes = Array.from(nodeMap.values());

  // Ground node: negative terminal of first voltage source, or first node
  let groundNodeId = nodes.length > 0 ? nodes[0].id : 'n0';
  for (const placed of placedComponents) {
    const ecomp = componentLibrary.get(placed.componentId);
    if (!ecomp || ecomp.electrical.type !== 'voltage_source') continue;
    const negPin = ecomp.pins.find(p => p.electrical_type === 'ground' || p.electrical_type === 'cathode');
    if (negPin) {
      const key = pinKey(placed.instanceId, negPin.id);
      const root = find(key);
      const node = nodeMap.get(root);
      if (node) {
        groundNodeId = node.id;
      }
    }
    break;
  }

  // Build branches for non-wire, non-board components
  const branches: NetlistBranch[] = [];
  for (const placed of placedComponents) {
    const ecomp = componentLibrary.get(placed.componentId);
    if (!ecomp) continue;
    if (ecomp.electrical.type === 'wire' || ecomp.electrical.type === 'passive_board' || ecomp.electrical.type === 'connector') {
      continue; // These are handled by node merging
    }
    if (ecomp.pins.length < 2) {
      errors.push(`Component ${ecomp.name} has fewer than 2 pins`);
      continue;
    }

    const pinAKey = pinKey(placed.instanceId, ecomp.pins[0].id);
    const pinBKey = pinKey(placed.instanceId, ecomp.pins[1].id);
    const nodeA = nodeMap.get(find(pinAKey));
    const nodeB = nodeMap.get(find(pinBKey));

    if (!nodeA || !nodeB) {
      errors.push(`Could not resolve nodes for ${ecomp.name}`);
      continue;
    }

    branches.push({
      instanceId: placed.instanceId,
      componentId: placed.componentId,
      type: ecomp.electrical.type,
      nodeA: nodeA.id,
      nodeB: nodeB.id,
      parameters: ecomp.simulation.parameters,
      simulationModel: ecomp.simulation.model,
    });
  }

  if (nodes.length === 0) {
    errors.push('No components placed in the circuit');
  }

  return { nodes, branches, groundNodeId, errors };
}
