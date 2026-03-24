import { useMemo, useEffect } from 'react';
import CircuitCanvas from './canvas/CircuitCanvas';
import Sidebar from './components/Sidebar';
import SimulationBar from './components/SimulationBar';
import PropertyPanel from './components/PropertyPanel';
import WarningsPanel from './components/WarningsPanel';
import { useUIStore } from './store/ui-store';
import { loadBuiltinComponents, getBuiltinComponentList } from './utils/ecomp-parser';

export default function App() {
  const { cancelWire } = useUIStore();

  const componentLibrary = useMemo(() => loadBuiltinComponents(), []);
  const componentList = useMemo(() => getBuiltinComponentList(), []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelWire();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelWire]);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#1a1a1a',
      color: '#eee',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Left sidebar: component browser */}
      <Sidebar components={componentList} />

      {/* Main canvas area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <CircuitCanvas componentLibrary={componentLibrary} />
        <SimulationBar componentLibrary={componentLibrary} />
        <PropertyPanel componentLibrary={componentLibrary} />
        <WarningsPanel />
      </div>
    </div>
  );
}
