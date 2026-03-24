import { useSimulationStore } from '../store/simulation-store';
import { useCircuitStore } from '../store/circuit-store';
import { runSimulation } from '../simulation/analysis';
import type { ECompFile } from '../types/component';

interface SimulationBarProps {
  componentLibrary: Map<string, ECompFile>;
}

export default function SimulationBar({ componentLibrary }: SimulationBarProps) {
  const { result, autoSimulate, toggleAutoSimulate, setResult } = useSimulationStore();
  const { components, wires, clearCircuit } = useCircuitStore();

  const handleRun = () => {
    const simResult = runSimulation(components, wires, componentLibrary);
    setResult(simResult);
  };

  const handleClear = () => {
    clearCircuit();
    setResult(null);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: 12,
      display: 'flex',
      gap: 6,
      zIndex: 10,
    }}>
      <button onClick={handleRun} style={btnStyle('#2d7d46', '#25a050')}>
        Simulate
      </button>
      <button
        onClick={toggleAutoSimulate}
        style={btnStyle(autoSimulate ? '#2d5f7d' : '#555', autoSimulate ? '#2d7fad' : '#666')}
      >
        Auto: {autoSimulate ? 'ON' : 'OFF'}
      </button>
      <button onClick={handleClear} style={btnStyle('#7d2d2d', '#a03030')}>
        Clear
      </button>

      {/* Status indicator */}
      {result && (
        <div style={{
          padding: '6px 14px',
          borderRadius: 6,
          fontSize: 12,
          background: result.success ? '#1a3a1a' : '#3a1a1a',
          color: result.success ? '#44cc44' : '#cc4444',
          border: `1px solid ${result.success ? '#2d5d2d' : '#5d2d2d'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: result.success ? '#44cc44' : '#cc4444',
          }} />
          {result.success
            ? `OK — ${result.warnings.length} warning(s)`
            : `Error: ${result.errors[0]?.message ?? 'Unknown'}`}
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string, hoverBg: string): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #555',
    background: bg,
    color: '#eee',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  };
}
