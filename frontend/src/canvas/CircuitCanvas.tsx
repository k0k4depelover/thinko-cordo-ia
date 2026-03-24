import { useState, useCallback, useMemo, useEffect, type JSX } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import ComponentNode from './ComponentNode';
import WireConnection from './WireConnection';
import CanvasControls from './CanvasControls';
import { useCircuitStore } from '../store/circuit-store';
import { useSimulationStore } from '../store/simulation-store';
import { useUIStore } from '../store/ui-store';
import { runSimulation } from '../simulation/analysis';
import { snapToGrid, GRID_SIZE } from '../utils/geometry';
import type { ECompFile } from '../types/component';

interface CircuitCanvasProps {
  componentLibrary: Map<string, ECompFile>;
}

export default function CircuitCanvas({ componentLibrary }: CircuitCanvasProps) {
  const { components, wires, moveComponent, addWire, removeWire, bringToFront } = useCircuitStore();
  const { result, setResult, autoSimulate } = useSimulationStore();
  const {
    selectedComponentId, selectComponent,
    wireDraft, startWire, cancelWire,
  } = useUIStore();

  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // Auto-simulate when circuit changes
  useEffect(() => {
    if (!autoSimulate) return;
    if (components.length === 0) {
      setResult(null);
      return;
    }
    const simResult = runSimulation(components, wires, componentLibrary);
    setResult(simResult);
  }, [components, wires, componentLibrary, autoSimulate, setResult]);

  const handleDragEnd = useCallback(
    (instanceId: string, x: number, y: number) => {
      moveComponent(instanceId, snapToGrid(x), snapToGrid(y));
    },
    [moveComponent]
  );

  const handlePinClick = useCallback(
    (instanceId: string, pinId: string, _absX: number, _absY: number) => {
      if (wireDraft) {
        // Complete wire connection
        if (wireDraft.fromComponentId !== instanceId) {
          addWire(wireDraft.fromComponentId, wireDraft.fromPinId, instanceId, pinId);
        }
        cancelWire();
      } else {
        // Start wire draft
        startWire(instanceId, pinId);
      }
    },
    [wireDraft, addWire, cancelWire, startWire]
  );

  const handleStageClick = useCallback(
    (e: any) => {
      // Click on empty area
      if (e.target === e.target.getStage()) {
        selectComponent(null);
        if (wireDraft) cancelWire();
      }
    },
    [selectComponent, wireDraft, cancelWire]
  );

  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.08;
    const newScale = e.evt.deltaY < 0 ? scale * scaleBy : scale / scaleBy;
    setScale(Math.min(Math.max(0.2, newScale), 3));
  }, [scale]);

  // Draw grid lines
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const gridSpacing = GRID_SIZE * 2;
    const canvasWidth = 3000;
    const canvasHeight = 2000;

    for (let x = 0; x <= canvasWidth; x += gridSpacing) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, canvasHeight]}
          stroke="#333"
          strokeWidth={0.5}
          listening={false}
        />
      );
    }
    for (let y = 0; y <= canvasHeight; y += gridSpacing) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[0, y, canvasWidth, y]}
          stroke="#333"
          strokeWidth={0.5}
          listening={false}
        />
      );
    }
    return lines;
  }, []);

  return (
    <div style={{ position: 'relative', flex: 1, background: '#1a1a1a', overflow: 'hidden' }}>
      <Stage
        width={window.innerWidth - 300}
        height={window.innerHeight}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setStagePos(e.target.position());
          }
        }}
      >
        {/* Grid layer */}
        <Layer listening={false}>
          {gridLines}
        </Layer>

        {/* Wires layer */}
        <Layer>
          {wires.map((wire) => (
            <WireConnection
              key={wire.id}
              wire={wire}
              placedComponents={components}
              componentLibrary={componentLibrary}
              isActive={
                result?.success === true &&
                result.branchCurrents !== undefined &&
                Object.values(result.branchCurrents).some(c => Math.abs(c) > 0.0001)
              }
              onRemove={removeWire}
            />
          ))}
        </Layer>

        {/* Components layer — sorted by zIndex so last-touched renders on top */}
        <Layer>
          {[...components].sort((a, b) => a.zIndex - b.zIndex).map((placed) => {
            const ecomp = componentLibrary.get(placed.componentId);
            if (!ecomp) return null;

            return (
              <ComponentNode
                key={placed.instanceId}
                instanceId={placed.instanceId}
                ecomp={ecomp}
                x={placed.x}
                y={placed.y}
                rotation={placed.rotation}
                isSelected={selectedComponentId === placed.instanceId}
                simState={result?.componentStates[placed.instanceId]}
                onSelect={selectComponent}
                onDragEnd={handleDragEnd}
                onPinClick={handlePinClick}
                onBringToFront={bringToFront}
              />
            );
          })}
        </Layer>
      </Stage>

      <CanvasControls
        scale={scale}
        onZoomIn={() => setScale(s => Math.min(s * 1.2, 3))}
        onZoomOut={() => setScale(s => Math.max(s / 1.2, 0.2))}
        onReset={() => { setScale(1); setStagePos({ x: 0, y: 0 }); }}
      />

      {/* Wire mode indicator */}
      {wireDraft && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#4488ff',
          color: '#fff',
          padding: '6px 16px',
          borderRadius: 20,
          fontSize: 13,
          zIndex: 10,
        }}>
          Click a pin to complete connection — ESC to cancel
        </div>
      )}
    </div>
  );
}
