import { useCircuitStore } from '../store/circuit-store';
import { useSimulationStore } from '../store/simulation-store';
import { useUIStore } from '../store/ui-store';
import type { ECompFile } from '../types/component';

interface PropertyPanelProps {
  componentLibrary: Map<string, ECompFile>;
}

export default function PropertyPanel({ componentLibrary }: PropertyPanelProps) {
  const { selectedComponentId } = useUIStore();
  const { components, removeComponent, rotateComponent } = useCircuitStore();
  const { result } = useSimulationStore();

  if (!selectedComponentId) return null;

  const placed = components.find(c => c.instanceId === selectedComponentId);
  if (!placed) return null;

  const ecomp = componentLibrary.get(placed.componentId);
  if (!ecomp) return null;

  const simState = result?.componentStates[selectedComponentId];

  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      left: 16,
      width: 260,
      background: '#1e1e1e',
      border: '1px solid #333',
      borderRadius: 8,
      padding: 14,
      zIndex: 10,
    }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#eee' }}>
        {ecomp.name}
      </h3>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
        {ecomp.description}
      </div>

      {/* Electrical properties */}
      <div style={{ fontSize: 12, color: '#ccc', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: '#aaa', fontSize: 10, textTransform: 'uppercase' }}>
          Properties
        </div>
        {Object.entries(ecomp.electrical.properties).map(([key, prop]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#888' }}>{key.replace(/_/g, ' ')}</span>
            <span>{prop.value} {prop.unit}</span>
          </div>
        ))}
      </div>

      {/* Simulation results */}
      {simState && (
        <div style={{ fontSize: 12, color: '#ccc', marginBottom: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#aaa', fontSize: 10, textTransform: 'uppercase' }}>
            Simulation
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#888' }}>Voltage</span>
            <span>{simState.voltage.toFixed(3)} V</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#888' }}>Current</span>
            <span>{(simState.current * 1000).toFixed(2)} mA</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#888' }}>Power</span>
            <span>{(simState.power * 1000).toFixed(2)} mW</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#888' }}>State</span>
            <span style={{
              color: simState.visualState === 'on' ? '#44cc44' :
                     simState.visualState === 'burned' ? '#cc4444' : '#888'
            }}>
              {simState.visualState.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button
          onClick={() => rotateComponent(selectedComponentId)}
          style={actionBtnStyle}
        >
          Rotate
        </button>
        <button
          onClick={() => removeComponent(selectedComponentId)}
          style={{ ...actionBtnStyle, background: '#5d2d2d', borderColor: '#7d3d3d' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 10px',
  borderRadius: 4,
  border: '1px solid #555',
  background: '#333',
  color: '#eee',
  fontSize: 11,
  cursor: 'pointer',
};
