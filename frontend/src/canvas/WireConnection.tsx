import { Line } from 'react-konva';
import type { Wire } from '../types/circuit';
import type { ECompFile } from '../types/component';
import type { PlacedComponent } from '../types/circuit';
import { getPinAbsolutePosition } from '../utils/geometry';

interface WireConnectionProps {
  wire: Wire;
  placedComponents: PlacedComponent[];
  componentLibrary: Map<string, ECompFile>;
  isActive: boolean; // true if current flows through this wire
  onRemove: (wireId: string) => void;
}

export default function WireConnection({
  wire,
  placedComponents,
  componentLibrary,
  isActive,
  onRemove,
}: WireConnectionProps) {
  const fromComp = placedComponents.find(c => c.instanceId === wire.fromComponentId);
  const toComp = placedComponents.find(c => c.instanceId === wire.toComponentId);

  if (!fromComp || !toComp) return null;

  const fromEcomp = componentLibrary.get(fromComp.componentId);
  const toEcomp = componentLibrary.get(toComp.componentId);

  if (!fromEcomp || !toEcomp) return null;

  const fromPin = fromEcomp.pins.find(p => p.id === wire.fromPinId);
  const toPin = toEcomp.pins.find(p => p.id === wire.toPinId);

  if (!fromPin || !toPin) return null;

  const fromPos = getPinAbsolutePosition(
    fromComp.x, fromComp.y,
    fromEcomp.visual.width, fromEcomp.visual.height,
    fromPin.position.x, fromPin.position.y,
    fromComp.rotation
  );

  const toPos = getPinAbsolutePosition(
    toComp.x, toComp.y,
    toEcomp.visual.width, toEcomp.visual.height,
    toPin.position.x, toPin.position.y,
    toComp.rotation
  );

  return (
    <Line
      points={[fromPos.x, fromPos.y, toPos.x, toPos.y]}
      stroke={isActive ? '#44cc44' : '#666666'}
      strokeWidth={isActive ? 3 : 2}
      lineCap="round"
      lineJoin="round"
      hitStrokeWidth={10}
      onDblClick={() => onRemove(wire.id)}
      onDblTap={() => onRemove(wire.id)}
    />
  );
}
