import { Group, Image as KonvaImage, Circle, Text } from 'react-konva';
import { useEffect, useRef, useState } from 'react';
import type { ECompFile, ECompPin } from '../types/component';
import type { ComponentSimState } from '../types/simulation';
import { getPinAbsolutePosition } from '../utils/geometry';

interface ComponentNodeProps {
  instanceId: string;
  ecomp: ECompFile;
  x: number;
  y: number;
  rotation: number;
  isSelected: boolean;
  simState?: ComponentSimState;
  onSelect: (instanceId: string) => void;
  onDragEnd: (instanceId: string, x: number, y: number) => void;
  onPinClick: (instanceId: string, pinId: string, absX: number, absY: number) => void;
  onBringToFront: (instanceId: string) => void;
}

function useSvgImage(svgString: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      setImage(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, [svgString]);

  return image;
}

export default function ComponentNode({
  instanceId,
  ecomp,
  x,
  y,
  rotation,
  isSelected,
  simState,
  onSelect,
  onDragEnd,
  onPinClick,
  onBringToFront,
}: ComponentNodeProps) {
  const groupRef = useRef<any>(null);
  const image = useSvgImage(ecomp.visual.data ?? '');

  const { width, height } = ecomp.visual;

  // Determine visual state
  const visualState = simState?.visualState ?? 'off';
  const stateConfig = ecomp.visual.states[visualState];
  const opacity = stateConfig?.opacity ?? 1;
  const glowing = stateConfig?.glow ?? false;

  const handleDragEnd = (e: any) => {
    const pos = e.target.position();
    onDragEnd(instanceId, pos.x, pos.y);
  };

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      rotation={rotation}
      draggable
      onClick={() => { onBringToFront(instanceId); onSelect(instanceId); }}
      onTap={() => { onBringToFront(instanceId); onSelect(instanceId); }}
      onDragStart={() => onBringToFront(instanceId)}
      onDragEnd={handleDragEnd}
      opacity={opacity}
    >
      {/* Component image */}
      {image && (
        <KonvaImage
          image={image}
          width={width}
          height={height}
          offsetX={width / 2}
          offsetY={height / 2}
        />
      )}

      {/* Glow effect for active LEDs */}
      {glowing && (
        <Circle
          x={0}
          y={0}
          radius={Math.max(width, height) * 0.6}
          fill={stateConfig?.fill ?? '#ff0000'}
          opacity={0.25}
          listening={false}
        />
      )}

      {/* Burned overlay */}
      {visualState === 'burned' && (
        <Text
          text="✕"
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          fontSize={Math.min(width, height) * 0.8}
          fill="#ff0000"
          align="center"
          verticalAlign="middle"
          listening={false}
          fontStyle="bold"
        />
      )}

      {/* Selection highlight */}
      {isSelected && (
        <Circle
          x={0}
          y={0}
          radius={Math.max(width, height) * 0.7}
          stroke="#4488ff"
          strokeWidth={2}
          dash={[5, 3]}
          listening={false}
        />
      )}

      {/* Pin indicators */}
      {ecomp.pins.map((pin: ECompPin) => {
        const pinX = pin.position.x - width / 2;
        const pinY = pin.position.y - height / 2;

        return (
          <Circle
            key={pin.id}
            x={pinX}
            y={pinY}
            radius={5}
            fill={
              pin.electrical_type === 'power' ? '#cc3333' :
              pin.electrical_type === 'ground' ? '#3333cc' :
              pin.electrical_type === 'anode' ? '#cc3333' :
              pin.electrical_type === 'cathode' ? '#3333cc' :
              '#888888'
            }
            stroke="#fff"
            strokeWidth={1}
            opacity={0.7}
            onClick={(e) => {
              e.cancelBubble = true;
              const abs = getPinAbsolutePosition(
                x, y, width, height,
                pin.position.x, pin.position.y, rotation
              );
              onPinClick(instanceId, pin.id, abs.x, abs.y);
            }}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'crosshair';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
          />
        );
      })}

      {/* Component label */}
      <Text
        text={ecomp.name}
        x={-width / 2}
        y={height / 2 + 4}
        width={width}
        fontSize={9}
        fill="#888"
        align="center"
        listening={false}
      />
    </Group>
  );
}
