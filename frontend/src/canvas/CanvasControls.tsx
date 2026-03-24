import React from 'react';

interface CanvasControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export default function CanvasControls({ scale, onZoomIn, onZoomOut, onReset }: CanvasControlsProps) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      right: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      zIndex: 10,
    }}>
      <button onClick={onZoomIn} style={btnStyle} title="Zoom In">+</button>
      <button onClick={onReset} style={btnStyle} title="Reset Zoom">
        {Math.round(scale * 100)}%
      </button>
      <button onClick={onZoomOut} style={btnStyle} title="Zoom Out">−</button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 6,
  border: '1px solid #555',
  background: '#2a2a2a',
  color: '#eee',
  fontSize: 16,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
