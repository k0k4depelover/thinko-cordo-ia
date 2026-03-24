/**
 * .ecomp file parser — loads and validates component definitions.
 * In Phase 1, components are loaded from static imports.
 * In Phase 3+, they'll be fetched from the API.
 */

import type { ECompFile } from '../types/component';

// Import built-in .ecomp files
import batteryData from '../../../components/battery-9v.ecomp';
import resistorData from '../../../components/resistor-generic.ecomp';
import ledData from '../../../components/led-standard.ecomp';
import jumperData from '../../../components/jumper-cable.ecomp';
import protoboardData from '../../../components/protoboard-half.ecomp';

/**
 * Validates basic .ecomp structure. Returns errors if invalid.
 */
export function validateEComp(data: unknown): string[] {
  const errors: string[] = [];
  const obj = data as Record<string, unknown>;

  if (!obj.ecomp_version) errors.push('Missing ecomp_version');
  if (!obj.id) errors.push('Missing id');
  if (!obj.name) errors.push('Missing name');
  if (!obj.visual) errors.push('Missing visual');
  if (!obj.electrical) errors.push('Missing electrical');
  if (!obj.pins || !Array.isArray(obj.pins)) errors.push('Missing or invalid pins');
  if (!obj.simulation) errors.push('Missing simulation');

  return errors;
}

/**
 * Parses a raw JSON object into a typed ECompFile.
 */
export function parseEComp(data: unknown): ECompFile | null {
  const errors = validateEComp(data);
  if (errors.length > 0) {
    console.error('Invalid .ecomp file:', errors);
    return null;
  }
  return data as ECompFile;
}

/**
 * Loads all built-in components into a Map.
 */
export function loadBuiltinComponents(): Map<string, ECompFile> {
  const library = new Map<string, ECompFile>();
  const builtins = [batteryData, resistorData, ledData, jumperData, protoboardData];

  for (const raw of builtins) {
    const ecomp = parseEComp(raw);
    if (ecomp) {
      library.set(ecomp.id, ecomp);
    }
  }

  return library;
}

/**
 * Returns a flat array of all built-in components.
 */
export function getBuiltinComponentList(): ECompFile[] {
  return Array.from(loadBuiltinComponents().values());
}

/**
 * Search components by name, tags, or description.
 */
export function searchComponents(
  components: ECompFile[],
  query: string
): ECompFile[] {
  if (!query.trim()) return components;

  const lower = query.toLowerCase();
  return components.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      c.description.toLowerCase().includes(lower) ||
      c.tags.some((t) => t.toLowerCase().includes(lower)) ||
      c.category.toLowerCase().includes(lower)
  );
}
