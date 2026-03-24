/**
 * Geometry utilities for canvas operations.
 */

export const GRID_SIZE = 10;

/** Snap a coordinate to the nearest grid point. */
export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/**
 * Get the absolute position of a pin given component position and rotation.
 *
 * Important: (compX, compY) is the CENTER of the component (Konva Group position),
 * because ComponentNode renders the image with offsetX/offsetY = width/2, height/2.
 * pinRelX/pinRelY are relative to the component's top-left corner (as defined in .ecomp).
 */
export function getPinAbsolutePosition(
  compX: number,
  compY: number,
  compWidth: number,
  compHeight: number,
  pinRelX: number,
  pinRelY: number,
  rotation: number
): { x: number; y: number } {
  // Pin position relative to component center
  const rx = pinRelX - compWidth / 2;
  const ry = pinRelY - compHeight / 2;

  // Apply rotation around center
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotX = rx * cos - ry * sin;
  const rotY = rx * sin + ry * cos;

  // compX/compY IS the center (Konva Group position)
  return {
    x: compX + rotX,
    y: compY + rotY,
  };
}

/** Distance between two points. */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/** Check if a point is within a radius of another point. */
export function isNearPoint(
  px: number,
  py: number,
  targetX: number,
  targetY: number,
  radius: number = 15
): boolean {
  return distance(px, py, targetX, targetY) <= radius;
}
