// Circuit graph types — represents placed components and connections on the canvas

export interface PlacedComponent {
  instanceId: string;
  componentId: string; // References ECompFile.id
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
  zIndex: number; // Layering order — higher values render on top
}

export interface Wire {
  id: string;
  fromComponentId: string; // instanceId
  fromPinId: string;
  toComponentId: string; // instanceId
  toPinId: string;
  points: { x: number; y: number }[]; // intermediate points for routing
}

export interface CircuitState {
  components: PlacedComponent[];
  wires: Wire[];
}
