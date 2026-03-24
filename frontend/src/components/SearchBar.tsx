import { useUIStore } from '../store/ui-store';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useUIStore();

  return (
    <div style={{ padding: '8px 12px' }}>
      <input
        type="text"
        placeholder="Search components..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 6,
          border: '1px solid #444',
          background: '#2a2a2a',
          color: '#eee',
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
