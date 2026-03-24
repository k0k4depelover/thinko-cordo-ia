import { useSimulationStore } from '../store/simulation-store';

export default function WarningsPanel() {
  const { result } = useSimulationStore();

  if (!result || (result.warnings.length === 0 && result.errors.length === 0)) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      top: 56,
      right: 16,
      maxWidth: 320,
      maxHeight: 300,
      overflowY: 'auto',
      background: '#1e1e1e',
      border: '1px solid #333',
      borderRadius: 8,
      padding: 10,
      zIndex: 10,
    }}>
      {result.errors.map((err, i) => (
        <div key={`e-${i}`} style={{
          padding: '6px 10px',
          marginBottom: 4,
          borderRadius: 4,
          background: '#3a1a1a',
          color: '#ff6666',
          fontSize: 12,
          borderLeft: '3px solid #cc4444',
        }}>
          {err.message}
        </div>
      ))}
      {result.warnings.map((warn, i) => (
        <div key={`w-${i}`} style={{
          padding: '6px 10px',
          marginBottom: 4,
          borderRadius: 4,
          background: '#3a3a1a',
          color: '#ffaa44',
          fontSize: 12,
          borderLeft: `3px solid ${warn.type === 'burned' ? '#cc4444' : '#ccaa44'}`,
        }}>
          {warn.message}
        </div>
      ))}
    </div>
  );
}
