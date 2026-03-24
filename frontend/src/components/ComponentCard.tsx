import { useEffect, useState } from 'react';
import type { ECompFile } from '../types/component';

interface ComponentCardProps {
  ecomp: ECompFile;
  onAdd: (componentId: string) => void;
}

export default function ComponentCard({ ecomp, onAdd }: ComponentCardProps) {
  const [svgUrl, setSvgUrl] = useState<string>('');

  useEffect(() => {
    if (ecomp.visual.type === 'svg_inline' && ecomp.visual.data) {
      const blob = new Blob([ecomp.visual.data], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      setSvgUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [ecomp.visual]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'background 0.15s',
        border: '1px solid transparent',
      }}
      onClick={() => onAdd(ecomp.id)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = '#333';
        (e.currentTarget as HTMLElement).style.borderColor = '#555';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
      }}
    >
      {/* Component thumbnail */}
      <div style={{
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#252525',
        borderRadius: 6,
        flexShrink: 0,
      }}>
        {svgUrl && (
          <img
            src={svgUrl}
            alt={ecomp.name}
            style={{ maxWidth: 36, maxHeight: 36, objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Component info */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#eee' }}>
          {ecomp.name}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
          {ecomp.category}
        </div>
      </div>
    </div>
  );
}
