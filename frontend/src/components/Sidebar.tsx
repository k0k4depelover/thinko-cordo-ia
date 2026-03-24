import { useMemo } from 'react';
import SearchBar from './SearchBar';
import ComponentCard from './ComponentCard';
import { useUIStore } from '../store/ui-store';
import { useCircuitStore } from '../store/circuit-store';
import { searchComponents } from '../utils/ecomp-parser';
import type { ECompFile } from '../types/component';

interface SidebarProps {
  components: ECompFile[];
}

export default function Sidebar({ components }: SidebarProps) {
  const { searchQuery, showSidebar } = useUIStore();
  const { addComponent } = useCircuitStore();

  const filtered = useMemo(
    () => searchComponents(components, searchQuery),
    [components, searchQuery]
  );

  const handleAdd = (componentId: string) => {
    // Place component at a default position on the canvas
    const x = 200 + Math.random() * 200;
    const y = 200 + Math.random() * 200;
    addComponent(componentId, Math.round(x / 10) * 10, Math.round(y / 10) * 10);
  };

  if (!showSidebar) return null;

  // Group by category
  const grouped = useMemo(() => {
    const groups = new Map<string, ECompFile[]>();
    for (const comp of filtered) {
      const cat = comp.category.split('/')[0];
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(comp);
    }
    return groups;
  }, [filtered]);

  return (
    <div style={{
      width: 260,
      background: '#1e1e1e',
      borderRight: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid #333',
      }}>
        <h2 style={{ margin: 0, fontSize: 15, color: '#eee', fontWeight: 600 }}>
          Components
        </h2>
        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
          {filtered.length} available
        </div>
      </div>

      <SearchBar />

      {/* Component list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
        {Array.from(grouped.entries()).map(([category, comps]) => (
          <div key={category} style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#666',
              padding: '8px 12px 4px',
              fontWeight: 600,
            }}>
              {category}
            </div>
            {comps.map((comp) => (
              <ComponentCard
                key={comp.id}
                ecomp={comp}
                onAdd={handleAdd}
              />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: '#666',
            fontSize: 13,
          }}>
            No components match "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
